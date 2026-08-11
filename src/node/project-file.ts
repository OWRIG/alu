import { open, readFile, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";

import { deriveProfileBom } from "../domain/bom/derive";
import { DomainError } from "../domain/project/error";
import { computeDesignHash, computeFileHash } from "../domain/project/hash";
import { MAX_PROJECT_BYTES, parseProjectJson, serializeProject } from "../domain/project/parse";
import type { ProjectDocumentV1 } from "../domain/project/schema";

const REPLACE_RETRY_DELAYS_MS = [20, 50, 100, 200];

export type ReadProjectResult = {
  project: ProjectDocumentV1;
  fileHash: string;
  bomDrift: boolean;
};

export type WriteProjectResult = {
  project: ProjectDocumentV1;
  fileHash: string;
};

type LockOwner = {
  pid: number;
  createdAt: string;
  token: string;
};

function filesystemError(error: unknown, filePath: string): DomainError {
  if (error instanceof DomainError) return error;
  const code = (error as NodeJS.ErrnoException)?.code;
  if (code === "ENOENT") {
    return new DomainError({ code: "file.not-found", message: `找不到工程文件 ${filePath}` });
  }
  if (code === "EACCES" || code === "EPERM") {
    return new DomainError({
      code: "file.permission-denied",
      message: `没有权限访问工程文件 ${filePath}`,
    });
  }
  return new DomainError({
    code: "file.io-error",
    message: error instanceof Error ? error.message : `无法访问工程文件 ${filePath}`,
  });
}

function processIsAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

async function readLockOwner(lockPath: string): Promise<LockOwner | null> {
  try {
    const owner = JSON.parse(await readFile(lockPath, "utf8")) as LockOwner;
    return Number.isInteger(owner.pid) && typeof owner.token === "string" ? owner : null;
  } catch {
    return null;
  }
}

async function acquireProjectFileLock(filePath: string): Promise<() => Promise<void>> {
  const lockPath = `${filePath}.lock`;
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  const token = globalThis.crypto.randomUUID();
  try {
    handle = await open(lockPath, "wx", 0o600);
    const owner: LockOwner = { pid: process.pid, createdAt: new Date().toISOString(), token };
    await handle.writeFile(`${JSON.stringify(owner)}\n`, "utf8");
    await handle.sync();
    const lockedHandle = handle;
    return async () => {
      await lockedHandle.close().catch(() => undefined);
      const currentOwner = await readLockOwner(lockPath);
      if (currentOwner?.token === token) await unlink(lockPath).catch(() => undefined);
    };
  } catch (error) {
    if (handle) {
      await handle.close().catch(() => undefined);
      await unlink(lockPath).catch(() => undefined);
    }
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      throw new DomainError({
        code: "file.directory-missing",
        message: `目标目录不存在：${path.dirname(filePath)}`,
      });
    }
    if (code !== "EEXIST") throw filesystemError(error, filePath);
    const owner = await readLockOwner(lockPath);
    const stale = owner !== null && !processIsAlive(owner.pid);
    throw new DomainError({
      code: stale ? "project.stale-lock" : "project.locked",
      message: stale
        ? `工程存在异常退出遗留的锁：${lockPath}`
        : `工程正在被另一个进程写入：${filePath}`,
      suggestion: stale ? `确认 PID ${owner.pid} 已退出后，再删除这个明确的锁文件` : "稍后重试",
    });
  }
}

export async function withProjectFileLock<T>(
  filePath: string,
  action: () => Promise<T>,
): Promise<T> {
  const release = await acquireProjectFileLock(filePath);
  try {
    return await action();
  } finally {
    await release();
  }
}

async function renameWithRetry(sourcePath: string, targetPath: string): Promise<void> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await rename(sourcePath, targetPath);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      const delayMs = REPLACE_RETRY_DELAYS_MS[attempt];
      if (delayMs === undefined || !["EACCES", "EBUSY", "EPERM"].includes(code ?? "")) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function writeProjectFileUnlocked(
  filePath: string,
  project: ProjectDocumentV1,
  now: string,
): Promise<WriteProjectResult> {
  const designHash = computeDesignHash(project);
  const bom = deriveProfileBom(project);
  const savedProject: ProjectDocumentV1 = {
    ...project,
    meta: { ...project.meta, updatedAt: now },
    bomSnapshot: {
      generatedFromDesignHash: designHash,
      bomHash: bom.bomHash,
      generatedAt: now,
      lines: bom.lines,
    },
  };
  const source = serializeProject(savedProject);
  const directory = path.dirname(filePath);
  const temporaryPath = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${globalThis.crypto.randomUUID()}.tmp`,
  );
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  try {
    handle = await open(temporaryPath, "wx", 0o600);
    await handle.writeFile(source, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    await renameWithRetry(temporaryPath, filePath);
    try {
      const directoryHandle = await open(directory, "r");
      await directoryHandle.sync();
      await directoryHandle.close();
    } catch {
      // Some Windows filesystems cannot fsync a directory; the file itself was already flushed.
    }
  } catch (error) {
    await handle?.close().catch(() => undefined);
    await unlink(temporaryPath).catch(() => undefined);
    throw filesystemError(error, filePath);
  }
  return { project: savedProject, fileHash: computeFileHash(source) };
}

export async function readProjectFile(filePath: string): Promise<ReadProjectResult> {
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      throw new DomainError({ code: "file.not-file", message: `所选路径不是文件：${filePath}` });
    }
    if (fileStat.size > MAX_PROJECT_BYTES) {
      throw new DomainError({ code: "project.file-too-large", message: "工程文件超过 8 MiB 上限" });
    }
    const source = await readFile(filePath, "utf8");
    const project = parseProjectJson(source);
    const derived = deriveProfileBom(project);
    const designHash = computeDesignHash(project);
    return {
      project,
      fileHash: computeFileHash(source),
      bomDrift:
        project.bomSnapshot !== undefined &&
        (project.bomSnapshot.bomHash !== derived.bomHash ||
          project.bomSnapshot.generatedFromDesignHash !== designHash),
    };
  } catch (error) {
    throw filesystemError(error, filePath);
  }
}

export async function writeProjectFileAtomic(
  filePath: string,
  project: ProjectDocumentV1,
  now = new Date().toISOString(),
): Promise<WriteProjectResult> {
  return withProjectFileLock(filePath, () => writeProjectFileUnlocked(filePath, project, now));
}

export async function createProjectFileAtomic(
  filePath: string,
  project: ProjectDocumentV1,
  now = new Date().toISOString(),
): Promise<WriteProjectResult> {
  return withProjectFileLock(filePath, async () => {
    try {
      await stat(filePath);
      throw new DomainError({
        code: "file.exists",
        message: `工程文件已存在：${filePath}`,
        suggestion: "选择新文件名；CLI 不会覆盖已有工程",
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        if (error instanceof DomainError) throw error;
        throw filesystemError(error, filePath);
      }
    }
    return writeProjectFileUnlocked(filePath, project, now);
  });
}

export async function replaceProjectFileAtomic(
  filePath: string,
  project: ProjectDocumentV1,
  options: { expectedFileHash?: string; now?: string } = {},
): Promise<WriteProjectResult> {
  return withProjectFileLock(filePath, async () => {
    if (options.expectedFileHash !== undefined) {
      let currentFileHash: string | null = null;
      try {
        const fileStat = await stat(filePath);
        if (fileStat.isFile() && fileStat.size <= MAX_PROJECT_BYTES) {
          currentFileHash = computeFileHash(await readFile(filePath, "utf8"));
        }
      } catch {
        // Missing, unreadable, and oversized replacements are all external conflicts.
      }
      if (currentFileHash !== options.expectedFileHash) {
        throw new DomainError({
          code: "file.conflict",
          message: "工程文件已被其他进程修改",
          suggestion: "重新打开工程，确认外部修改后再保存",
        });
      }
    }
    return writeProjectFileUnlocked(filePath, project, options.now ?? new Date().toISOString());
  });
}

export async function mutateProjectFileAtomic<T>(
  filePath: string,
  mutate: (
    current: ReadProjectResult,
  ) =>
    | Promise<{ project: ProjectDocumentV1; result: T }>
    | { project: ProjectDocumentV1; result: T },
  now = new Date().toISOString(),
): Promise<WriteProjectResult & { result: T }> {
  return withProjectFileLock(filePath, async () => {
    const current = await readProjectFile(filePath);
    const mutation = await mutate(current);
    const saved = await writeProjectFileUnlocked(filePath, mutation.project, now);
    return { ...saved, result: mutation.result };
  });
}
