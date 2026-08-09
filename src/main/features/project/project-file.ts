import { open, readFile, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";

import { deriveProfileBom } from "../../../domain/bom/derive";
import { computeDesignHash, computeFileHash } from "../../../domain/project/hash";
import {
  MAX_PROJECT_BYTES,
  parseProjectJson,
  serializeProject,
} from "../../../domain/project/parse";
import type { ProjectDocumentV1 } from "../../../domain/project/schema";

export type ReadProjectResult = {
  project: ProjectDocumentV1;
  fileHash: string;
  bomDrift: boolean;
};

export type WriteProjectResult = {
  project: ProjectDocumentV1;
  fileHash: string;
};

export async function readProjectFile(filePath: string): Promise<ReadProjectResult> {
  const fileStat = await stat(filePath);
  if (!fileStat.isFile()) throw new Error("所选路径不是文件");
  if (fileStat.size > MAX_PROJECT_BYTES) throw new Error("工程文件超过 8 MiB 上限");
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
}

export async function writeProjectFileAtomic(
  filePath: string,
  project: ProjectDocumentV1,
  now = new Date().toISOString(),
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
    await rename(temporaryPath, filePath);
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
    throw error;
  }
  return { project: savedProject, fileHash: computeFileHash(source) };
}
