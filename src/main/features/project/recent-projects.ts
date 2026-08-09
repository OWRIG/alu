import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { sha256Hex } from "../../../domain/project/hash";
import type { RecentProject } from "../../../shared/ipc/project";

type StoredRecentProject = RecentProject & { path: string };

export class RecentProjectsStore {
  readonly #storagePath: string;

  constructor(userDataPath: string) {
    this.#storagePath = path.join(userDataPath, "recent-projects.json");
  }

  async list(): Promise<RecentProject[]> {
    return (await this.#read()).map(({ id, name, openedAt }) => ({ id, name, openedAt }));
  }

  async resolve(id: string): Promise<string | null> {
    return (await this.#read()).find((entry) => entry.id === id)?.path ?? null;
  }

  async record(filePath: string, openedAt = new Date().toISOString()): Promise<void> {
    const resolved = path.resolve(filePath);
    const id = sha256Hex(resolved);
    const name = path.basename(resolved, path.extname(resolved));
    const entries = (await this.#read()).filter((entry) => entry.id !== id);
    entries.unshift({ id, name, openedAt, path: resolved });
    await this.#write(entries.slice(0, 8));
  }

  async #read(): Promise<StoredRecentProject[]> {
    try {
      const value = JSON.parse(await readFile(this.#storagePath, "utf8")) as unknown;
      if (!Array.isArray(value)) return [];
      return value.filter((item): item is StoredRecentProject => {
        if (item === null || typeof item !== "object") return false;
        const candidate = item as Partial<StoredRecentProject>;
        return (
          typeof candidate.id === "string" &&
          typeof candidate.name === "string" &&
          typeof candidate.openedAt === "string" &&
          typeof candidate.path === "string"
        );
      });
    } catch {
      return [];
    }
  }

  async #write(entries: StoredRecentProject[]): Promise<void> {
    const temporaryPath = `${this.#storagePath}.${process.pid}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(entries, null, 2)}\n`, { mode: 0o600 });
    await rename(temporaryPath, this.#storagePath);
  }
}
