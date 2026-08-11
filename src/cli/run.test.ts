import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { applyCommandEnvelope, createCommandEnvelope } from "../domain/commands/apply";
import { computeDesignHash } from "../domain/project/hash";
import type { ProjectDocumentV1 } from "../domain/project/schema";
import { runCli, type CliDependencies, type CliResponse } from "./run";

const temporaryDirectories: string[] = [];
const dependencies: CliDependencies = {
  readStdin: async () => "",
  now: () => new Date("2026-08-11T00:00:00.000Z"),
};

async function makeTemporaryDirectory() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "alu-cli-"));
  temporaryDirectories.push(directory);
  return directory;
}

function successData(response: CliResponse): Record<string, unknown> {
  if (!response.ok) throw new Error(`expected success: ${response.error.code}`);
  return response.data as Record<string, unknown>;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("headless CLI", () => {
  it("creates, reads, dry-runs, applies, and reads back a project", async () => {
    const directory = await makeTemporaryDirectory();
    const projectPath = path.join(directory, "frame.alu");
    const commandPath = path.join(directory, "command.json");

    const created = await runCli(["create", projectPath, "--template", "demo"], dependencies);
    expect(created).toMatchObject({ exitCode: 0, response: { ok: true, command: "create" } });

    const read = await runCli(["read", projectPath], dependencies);
    const readData = successData(read.response);
    const project = readData.project as ProjectDocumentV1;
    const envelope = createCommandEnvelope(
      project,
      [{ type: "parameters.set", values: { obstacleOuterWidth: 2200 } }],
      "command.cli-smoke",
    );
    const expected = applyCommandEnvelope(project, envelope);
    await writeFile(commandPath, JSON.stringify(envelope), "utf8");
    const beforeSource = await readFile(projectPath, "utf8");

    const preview = await runCli(["dry-run", projectPath, "--input", commandPath], dependencies);
    expect(preview).toMatchObject({
      exitCode: 0,
      response: {
        ok: true,
        data: { diff: { parameters: { changed: expect.arrayContaining(["obstacleOuterWidth"]) } } },
      },
    });
    await expect(readFile(projectPath, "utf8")).resolves.toBe(beforeSource);

    const applied = await runCli(["apply", projectPath, "--input", commandPath], dependencies);
    expect(applied).toMatchObject({
      exitCode: 0,
      response: { ok: true, data: { after: { revision: 1 } } },
    });
    expect(successData(applied.response).after).toMatchObject({
      designHash: computeDesignHash(expected),
    });

    const readBack = await runCli(["read", projectPath], dependencies);
    expect(successData(readBack.response).evaluatedParameters).toMatchObject({
      obstacleOuterWidth: 2200,
      innerClearWidth: 2250,
      frameOuterWidth: 2330,
    });
  });

  it("rejects a stale retry and leaves the applied file byte-identical", async () => {
    const directory = await makeTemporaryDirectory();
    const projectPath = path.join(directory, "retry.alu");
    const commandPath = path.join(directory, "command.json");
    await runCli(["create", projectPath, "--template", "demo"], dependencies);
    const read = successData((await runCli(["read", projectPath], dependencies)).response);
    const envelope = createCommandEnvelope(
      read.project as ProjectDocumentV1,
      [{ type: "parameters.set", values: { obstacleOuterWidth: 2200 } }],
      "command.retry",
    );
    await writeFile(commandPath, JSON.stringify(envelope), "utf8");
    await runCli(["apply", projectPath, "--input", commandPath], dependencies);
    const appliedSource = await readFile(projectPath, "utf8");

    const retry = await runCli(["apply", projectPath, "--input", commandPath], dependencies);
    expect(retry).toMatchObject({
      exitCode: 4,
      response: { ok: false, error: { code: "revision.conflict" } },
    });
    await expect(readFile(projectPath, "utf8")).resolves.toBe(appliedSource);
  });

  it("keeps an invalid command batch atomic", async () => {
    const directory = await makeTemporaryDirectory();
    const projectPath = path.join(directory, "atomic.alu");
    const commandPath = path.join(directory, "command.json");
    await runCli(["create", projectPath, "--template", "demo"], dependencies);
    const read = successData((await runCli(["read", projectPath], dependencies)).response);
    const envelope = createCommandEnvelope(
      read.project as ProjectDocumentV1,
      [
        { type: "parameters.set", values: { obstacleOuterWidth: 2200 } },
        { type: "entity.remove", entityId: "profile.missing" },
      ],
      "command.atomic",
    );
    await writeFile(commandPath, JSON.stringify(envelope), "utf8");
    const original = await readFile(projectPath, "utf8");

    const result = await runCli(["apply", projectPath, "--input", commandPath], dependencies);
    expect(result).toMatchObject({
      exitCode: 3,
      response: { ok: false, error: { code: "ref.entity-missing", commandIndex: 1 } },
    });
    await expect(readFile(projectPath, "utf8")).resolves.toBe(original);
  });

  it("publishes generated schemas and ready-to-copy profile snapshots", async () => {
    const result = await runCli(["schema", "command"], dependencies);
    const data = successData(result.response);
    expect(data.command).toMatchObject({ type: "object" });
    expect(data.builtInProfileSnapshots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          definition: expect.objectContaining({ id: "generic.profile.4040-envelope" }),
          definitionHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      ]),
    );
  });

  it("publishes both generated schemas by default", async () => {
    const result = await runCli(["schema"], dependencies);
    expect(successData(result.response)).toMatchObject({
      command: { type: "object" },
      project: { type: "object" },
    });
  });

  it("accepts the conventional argument separator used by package runners", async () => {
    await expect(runCli(["--", "help"], dependencies)).resolves.toMatchObject({
      exitCode: 0,
      response: { ok: true, command: "help" },
    });
  });

  it("returns one structured error for malformed command JSON", async () => {
    const directory = await makeTemporaryDirectory();
    const projectPath = path.join(directory, "invalid.alu");
    const commandPath = path.join(directory, "invalid.json");
    await runCli(["create", projectPath], dependencies);
    await writeFile(commandPath, "{", "utf8");

    await expect(
      runCli(["dry-run", projectPath, "--input", commandPath], dependencies),
    ).resolves.toMatchObject({
      exitCode: 2,
      response: { ok: false, error: { code: "command.invalid-json" } },
    });
  });
});
