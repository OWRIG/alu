import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { deriveProfileBom } from "../../../domain/bom/derive";
import { createParametricClearanceFrameDemo } from "../../../domain/project/defaults";
import { readProjectFile, writeProjectFileAtomic } from "./project-file";

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
});
