import { mkdtemp, open, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { deriveProfileBom } from "../domain/bom/derive";
import { createParametricClearanceFrameDemo } from "../domain/project/defaults";
import { DomainError } from "../domain/project/error";
import {
  createProjectFileAtomic,
  mutateProjectFileAtomic,
  readProjectFile,
  replaceProjectFileAtomic,
  withProjectFileLock,
  writeProjectFileAtomic,
} from "./project-file";

const temporaryDirectories: string[] = [];

async function makeTemporaryDirectory() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "alu-project-file-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("project file", () => {
  it("writes an atomic portable package and reopens it without design loss", async () => {
    const directory = await makeTemporaryDirectory();
    const filePath = path.join(directory, "table.alu");
    const project = createParametricClearanceFrameDemo({
      projectId: "project.file-roundtrip",
      now: "2026-08-09T00:00:00.000Z",
    });

    const saved = await writeProjectFileAtomic(filePath, project, "2026-08-09T01:00:00.000Z");
    const reopened = await readProjectFile(filePath);

    expect(reopened.project.projectId).toBe(project.projectId);
    expect(reopened.project.entities).toEqual(project.entities);
    expect(reopened.project.parameters).toEqual(project.parameters);
    expect(reopened.project.embeddedParts).toEqual(project.embeddedParts);
    expect(reopened.project.bomSnapshot?.lines).toEqual(deriveProfileBom(project).lines);
    expect(reopened.fileHash).toBe(saved.fileHash);
    expect(reopened.bomDrift).toBe(false);
  });

  it("does not replace a valid file when validation fails before save", async () => {
    const directory = await makeTemporaryDirectory();
    const filePath = path.join(directory, "protected.alu");
    const original = "last successful content";
    await writeFile(filePath, original, "utf8");
    const invalid = { ...createParametricClearanceFrameDemo(), formatVersion: 2 };

    await expect(writeProjectFileAtomic(filePath, invalid as never)).rejects.toThrow();
    await expect(readFile(filePath, "utf8")).resolves.toBe(original);
  });

  it("reports BOM drift while preserving the imported design", async () => {
    const directory = await makeTemporaryDirectory();
    const filePath = path.join(directory, "drift.alu");
    const project = createParametricClearanceFrameDemo();
    const saved = await writeProjectFileAtomic(filePath, project);
    const source = JSON.parse(await readFile(filePath, "utf8")) as typeof saved.project;
    if (!source.bomSnapshot) throw new Error("test setup failed");
    source.bomSnapshot.bomHash = "0".repeat(64);
    await writeFile(filePath, JSON.stringify(source), "utf8");

    const reopened = await readProjectFile(filePath);
    expect(reopened.bomDrift).toBe(true);
    expect(reopened.project.entities).toEqual(project.entities);

    const contextOnlyChange = {
      ...saved.project,
      context: { ...saved.project.context, notes: "changed without refreshing the snapshot" },
    };
    await writeFile(filePath, JSON.stringify(contextOnlyChange), "utf8");
    await expect(readProjectFile(filePath)).resolves.toMatchObject({ bomDrift: true });
  });

  it("refuses to overwrite an existing project during create", async () => {
    const directory = await makeTemporaryDirectory();
    const filePath = path.join(directory, "existing.alu");
    const project = createParametricClearanceFrameDemo();
    await createProjectFileAtomic(filePath, project);
    const source = await readFile(filePath, "utf8");

    await expect(createProjectFileAtomic(filePath, project)).rejects.toMatchObject({
      code: "file.exists",
    } satisfies Partial<DomainError>);
    await expect(readFile(filePath, "utf8")).resolves.toBe(source);
  });

  it("rejects a desktop save after an external file change", async () => {
    const directory = await makeTemporaryDirectory();
    const filePath = path.join(directory, "conflict.alu");
    const project = createParametricClearanceFrameDemo();
    const saved = await createProjectFileAtomic(filePath, project);
    await writeFile(filePath, "{", "utf8");

    await expect(
      replaceProjectFileAtomic(filePath, project, { expectedFileHash: saved.fileHash }),
    ).rejects.toMatchObject({ code: "file.conflict" } satisfies Partial<DomainError>);
  });

  it("rejects a concurrent writer while a live process owns the lock", async () => {
    const directory = await makeTemporaryDirectory();
    const filePath = path.join(directory, "concurrent.alu");
    const project = createParametricClearanceFrameDemo();
    await createProjectFileAtomic(filePath, project);

    let releaseHolder: (() => void) | undefined;
    let reportLocked: (() => void) | undefined;
    const locked = new Promise<void>((resolve) => {
      reportLocked = resolve;
    });
    const hold = new Promise<void>((resolve) => {
      releaseHolder = resolve;
    });
    const holder = withProjectFileLock(filePath, async () => {
      reportLocked?.();
      await hold;
    });
    await locked;

    await expect(
      mutateProjectFileAtomic(filePath, ({ project: current }) => ({
        project: { ...current, revision: current.revision + 1 },
        result: current.revision,
      })),
    ).rejects.toMatchObject({ code: "project.locked" } satisfies Partial<DomainError>);
    releaseHolder?.();
    await holder;
  });

  it("reports a dead-process lock without racing to delete it", async () => {
    const directory = await makeTemporaryDirectory();
    const filePath = path.join(directory, "stale.alu");
    const lock = await open(`${filePath}.lock`, "wx", 0o600);
    await lock.writeFile(
      `${JSON.stringify({
        pid: 999_999_999,
        createdAt: new Date().toISOString(),
        token: "stale-owner",
      })}\n`,
    );
    await lock.close();

    await expect(
      createProjectFileAtomic(filePath, createParametricClearanceFrameDemo()),
    ).rejects.toMatchObject({ code: "project.stale-lock" } satisfies Partial<DomainError>);
    await expect(readFile(`${filePath}.lock`, "utf8")).resolves.toContain("stale-owner");
  });

  it("reports a missing parent directory when creating a project", async () => {
    const directory = await makeTemporaryDirectory();
    const filePath = path.join(directory, "missing", "frame.alu");

    await expect(
      createProjectFileAtomic(filePath, createParametricClearanceFrameDemo()),
    ).rejects.toMatchObject({ code: "file.directory-missing" } satisfies Partial<DomainError>);
  });
});
