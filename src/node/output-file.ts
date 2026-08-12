import { open, rename, unlink } from "node:fs/promises";
import path from "node:path";

import { DomainError } from "../domain/project/error";

function outputError(error: unknown, filePath: string): DomainError {
  if (error instanceof DomainError) return error;
  const code = (error as NodeJS.ErrnoException)?.code;
  if (code === "ENOENT") {
    return new DomainError({
      code: "file.directory-missing",
      message: `目标目录不存在：${path.dirname(filePath)}`,
    });
  }
  if (code === "EACCES" || code === "EPERM") {
    return new DomainError({
      code: "file.permission-denied",
      message: `没有权限写入输出文件 ${filePath}`,
    });
  }
  return new DomainError({
    code: "file.io-error",
    message: error instanceof Error ? error.message : `无法写入输出文件 ${filePath}`,
  });
}

export async function writeOutputFileAtomic(
  filePath: string,
  data: string | Uint8Array,
): Promise<void> {
  const resolvedPath = path.resolve(filePath);
  const directory = path.dirname(resolvedPath);
  const temporaryPath = path.join(
    directory,
    `.${path.basename(resolvedPath)}.${process.pid}.${globalThis.crypto.randomUUID()}.tmp`,
  );
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  try {
    handle = await open(temporaryPath, "wx", 0o600);
    await handle.writeFile(data);
    await handle.sync();
    await handle.close();
    handle = undefined;
    await rename(temporaryPath, resolvedPath);
    try {
      const directoryHandle = await open(directory, "r");
      await directoryHandle.sync();
      await directoryHandle.close();
    } catch {
      // The output file itself was already flushed.
    }
  } catch (error) {
    await handle?.close().catch(() => undefined);
    await unlink(temporaryPath).catch(() => undefined);
    throw outputError(error, resolvedPath);
  }
}
