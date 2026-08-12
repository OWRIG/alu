import { mkdtemp, mkdir, readFile, readlink, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  CODEX_SKILL_NAMES,
  codexIntegrationIsManaged,
  installCodexIntegration,
} from "./codex-integration";

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "alu-codex-integration-"));
  const bundledSkillsPath = path.join(root, "bundled");
  const managedRoot = path.join(root, "managed");
  const userSkillsRoot = path.join(root, "home", ".agents", "skills");
  for (const skillName of CODEX_SKILL_NAMES) {
    const directory = path.join(bundledSkillsPath, skillName);
    await mkdir(directory, { recursive: true });
    await writeFile(
      path.join(directory, "SKILL.md"),
      `---\nname: ${skillName}\ndescription: test\n---\n`,
      "utf8",
    );
  }
  return { root, bundledSkillsPath, managedRoot, userSkillsRoot };
}

describe("Codex integration installer", () => {
  it("installs managed skill links and a path-specific ALU launcher", async () => {
    const paths = await fixture();
    try {
      const result = await installCodexIntegration({
        appExecutablePath: "/Applications/ALU Test.app/Contents/MacOS/ALU",
        appVersion: "0.3.0",
        bundledSkillsPath: paths.bundledSkillsPath,
        managedRoot: paths.managedRoot,
        userSkillsRoot: paths.userSkillsRoot,
        now: () => new Date("2026-08-12T00:00:00.000Z"),
      });

      expect(result.skillPaths).toHaveLength(CODEX_SKILL_NAMES.length);
      await expect(
        codexIntegrationIsManaged({
          managedRoot: paths.managedRoot,
          userSkillsRoot: paths.userSkillsRoot,
        }),
      ).resolves.toBe(true);
      const linked = await readlink(path.join(paths.userSkillsRoot, "design-with-alu"));
      expect(linked).toContain(result.deploymentPath);
      const launcher = await readFile(
        path.join(result.deploymentPath, "design-with-alu", "scripts", "alu"),
        "utf8",
      );
      expect(launcher).toContain("'/Applications/ALU Test.app/Contents/MacOS/ALU' --cli");
    } finally {
      await rm(paths.root, { recursive: true, force: true });
    }
  });

  it("updates its own links but refuses a user-owned skill directory", async () => {
    const paths = await fixture();
    try {
      await installCodexIntegration({
        appExecutablePath: "/Applications/ALU.app/Contents/MacOS/ALU",
        appVersion: "0.3.0",
        bundledSkillsPath: paths.bundledSkillsPath,
        managedRoot: paths.managedRoot,
        userSkillsRoot: paths.userSkillsRoot,
      });
      await installCodexIntegration({
        appExecutablePath: "/Users/test/Applications/ALU.app/Contents/MacOS/ALU",
        appVersion: "0.3.1",
        bundledSkillsPath: paths.bundledSkillsPath,
        managedRoot: paths.managedRoot,
        userSkillsRoot: paths.userSkillsRoot,
      });

      await rm(path.join(paths.userSkillsRoot, "design-with-alu"));
      await mkdir(path.join(paths.userSkillsRoot, "design-with-alu"));
      await expect(
        installCodexIntegration({
          appExecutablePath: "/Applications/ALU.app/Contents/MacOS/ALU",
          appVersion: "0.3.2",
          bundledSkillsPath: paths.bundledSkillsPath,
          managedRoot: paths.managedRoot,
          userSkillsRoot: paths.userSkillsRoot,
        }),
      ).rejects.toMatchObject({ code: "codex.skill-conflict" });
    } finally {
      await rm(paths.root, { recursive: true, force: true });
    }
  });
});
