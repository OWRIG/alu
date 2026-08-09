import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { RecentProjectsStore } from "./recent-projects";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("recent projects", () => {
  it("keeps eight deduplicated entries without exposing paths to the renderer", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "alu-recent-"));
    temporaryDirectories.push(directory);
    const store = new RecentProjectsStore(directory);

    for (let index = 0; index < 10; index += 1) {
      await store.record(
        path.join(directory, `project-${index}.alu`),
        `2026-08-09T00:00:0${index}.000Z`,
      );
    }
    const recent = await store.list();

    expect(recent).toHaveLength(8);
    expect(recent[0]).toMatchObject({ name: "project-9", openedAt: "2026-08-09T00:00:09.000Z" });
    expect(recent[0]).not.toHaveProperty("path");
    await expect(store.resolve(recent[0].id)).resolves.toBe(path.join(directory, "project-9.alu"));

    await store.record(path.join(directory, "project-9.alu"), "2026-08-09T01:00:00.000Z");
    expect(await store.list()).toHaveLength(8);
    expect((await store.list())[0].openedAt).toBe("2026-08-09T01:00:00.000Z");
  });
});
