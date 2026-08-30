import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "dist", "cli", "alu.mjs");

function run(args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args], {
      cwd: root,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (exitCode) => {
      const lines = stdout.trim().split("\n").filter(Boolean);
      if (lines.length !== 1) {
        reject(new Error(`expected one JSON line, received ${lines.length}: ${stdout}`));
        return;
      }
      let response;
      try {
        response = JSON.parse(lines[0]);
      } catch {
        reject(new Error(`invalid JSON response: ${stdout}`));
        return;
      }
      resolve({ exitCode, response, stderr });
    });
    child.stdin.end(input);
  });
}

function assertSuccess(result, command) {
  if (result.exitCode !== 0 || result.response.ok !== true || result.response.command !== command) {
    throw new Error(`${command} failed: ${JSON.stringify(result)}`);
  }
  return result.response.data;
}

const directory = await mkdtemp(path.join(os.tmpdir(), "alu-cli-smoke-"));
const projectPath = path.join(directory, "skill-smoke.alu");
const handoffPath = path.join(directory, "skill-smoke.md");
try {
  assertSuccess(await run(["create", projectPath, "--template", "demo"]), "create");
  const read = assertSuccess(await run(["read", projectPath]), "read");
  const envelope = {
    commandVersion: 1,
    commandId: "command.skill-smoke",
    expectedProjectRevision: read.identity.revision,
    expectedDesignHash: read.identity.designHash,
    commands: [{ type: "parameters.set", values: { obstacleOuterWidth: 2200 } }],
  };
  const input = JSON.stringify(envelope);
  const preview = assertSuccess(
    await run(["dry-run", projectPath, "--input", "-"], input),
    "dry-run",
  );
  if (!preview.diff.parameters.changed.includes("obstacleOuterWidth")) {
    throw new Error("dry-run did not report the parameter change");
  }
  const applied = assertSuccess(await run(["apply", projectPath, "--input", "-"], input), "apply");
  if (applied.after.revision !== read.identity.revision + 1) {
    throw new Error("apply did not advance exactly one revision");
  }
  const reopened = assertSuccess(await run(["read", projectPath]), "read");
  if (reopened.evaluatedParameters.frameOuterWidth !== 2300) {
    throw new Error("readback did not observe the expected derived width");
  }
  const exported = assertSuccess(
    await run(["export", projectPath, "--output", handoffPath, "--target", "order-draft"]),
    "export",
  );
  const handoff = await readFile(handoffPath, "utf8");
  if (exported.reportVersion !== 1 || !handoff.includes(exported.bomHash)) {
    throw new Error("export did not produce the versioned Markdown handoff");
  }
  process.stdout.write("CLI skill smoke: OK\n");
} finally {
  await rm(directory, { recursive: true, force: true });
}
