import {
  chmod,
  cp,
  lstat,
  mkdir,
  readlink,
  readdir,
  rename,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import { DomainError } from "../domain/project/error";

export const CODEX_SKILL_NAMES = [
  "design-with-alu",
  "select-aluminum-extrusion-profiles",
  "select-aluminum-extrusion-connections",
  "integrate-panels-with-extrusions",
] as const;

export type CodexIntegrationOptions = {
  appExecutablePath: string;
  appVersion: string;
  bundledSkillsPath: string;
  managedRoot: string;
  userSkillsRoot: string;
  now?: () => Date;
};

export type CodexIntegrationResult = {
  appExecutablePath: string;
  deploymentPath: string;
  skillPaths: string[];
};

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

function isWithin(parentPath: string, childPath: string): boolean {
  const relative = path.relative(parentPath, childPath);
  return (
    relative !== "" &&
    !relative.startsWith(`..${path.sep}`) &&
    relative !== ".." &&
    !path.isAbsolute(relative)
  );
}

async function managedSymlinkTarget(
  linkPath: string,
  deploymentsRoot: string,
): Promise<string | null> {
  try {
    const entry = await lstat(linkPath);
    if (!entry.isSymbolicLink()) return null;
    const target = await readlink(linkPath);
    const resolved = path.resolve(path.dirname(linkPath), target);
    return isWithin(deploymentsRoot, resolved) ? resolved : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw error;
  }
}

async function validateSources(bundledSkillsPath: string): Promise<void> {
  for (const skillName of CODEX_SKILL_NAMES) {
    const skillFile = path.join(bundledSkillsPath, skillName, "SKILL.md");
    if (!(await pathExists(skillFile))) {
      throw new DomainError({
        code: "codex.skill-source-missing",
        message: `安装包缺少 Skill：${skillFile}`,
      });
    }
  }
}

async function preflightTargets(userSkillsRoot: string, deploymentsRoot: string): Promise<void> {
  for (const skillName of CODEX_SKILL_NAMES) {
    const targetPath = path.join(userSkillsRoot, skillName);
    const managedTarget = await managedSymlinkTarget(targetPath, deploymentsRoot);
    if (managedTarget === null) {
      throw new DomainError({
        code: "codex.skill-conflict",
        message: `已有同名 Skill，ALU 不会覆盖：${targetPath}`,
        suggestion: "保留现有 Skill，或手动移走后从 ALU 菜单重新安装",
      });
    }
  }
}

async function installLauncher(deploymentPath: string, appExecutablePath: string): Promise<void> {
  const scriptsPath = path.join(deploymentPath, "design-with-alu", "scripts");
  await mkdir(scriptsPath, { recursive: true });
  const launcherPath = path.join(scriptsPath, "alu");
  await writeFile(
    launcherPath,
    `#!/bin/sh\nset -eu\nexec ${shellQuote(appExecutablePath)} --cli "$@"\n`,
    "utf8",
  );
  await chmod(launcherPath, 0o755);
}

async function switchSkillLinks(userSkillsRoot: string, deploymentPath: string): Promise<string[]> {
  const installed: string[] = [];
  for (const skillName of CODEX_SKILL_NAMES) {
    const targetPath = path.join(userSkillsRoot, skillName);
    const temporaryLink = path.join(
      userSkillsRoot,
      `.alu-${skillName}-${globalThis.crypto.randomUUID()}`,
    );
    try {
      await symlink(path.join(deploymentPath, skillName), temporaryLink, "dir");
      await rename(temporaryLink, targetPath);
      installed.push(targetPath);
    } catch (error) {
      await rm(temporaryLink, { force: true }).catch(() => undefined);
      throw error;
    }
  }
  return installed;
}

async function removeOldDeployments(deploymentsRoot: string, currentPath: string): Promise<void> {
  const entries = await readdir(deploymentsRoot, { withFileTypes: true });
  await Promise.all(
    entries
      .filter(
        (entry) => entry.isDirectory() && path.join(deploymentsRoot, entry.name) !== currentPath,
      )
      .map((entry) =>
        rm(path.join(deploymentsRoot, entry.name), { recursive: true, force: true }).catch(
          () => undefined,
        ),
      ),
  );
}

export async function installCodexIntegration(
  options: CodexIntegrationOptions,
): Promise<CodexIntegrationResult> {
  await validateSources(options.bundledSkillsPath);
  const deploymentsRoot = path.join(options.managedRoot, "deployments");
  await Promise.all([
    mkdir(deploymentsRoot, { recursive: true }),
    mkdir(options.userSkillsRoot, { recursive: true }),
  ]);
  await preflightTargets(options.userSkillsRoot, deploymentsRoot);

  const version = options.appVersion.replaceAll(/[^a-zA-Z0-9._-]/g, "-");
  const deploymentPath = path.join(deploymentsRoot, `${version}-${globalThis.crypto.randomUUID()}`);
  let publishingLinks = false;
  try {
    await mkdir(deploymentPath, { recursive: false });
    for (const skillName of CODEX_SKILL_NAMES) {
      await cp(
        path.join(options.bundledSkillsPath, skillName),
        path.join(deploymentPath, skillName),
        {
          recursive: true,
          force: false,
          errorOnExist: true,
        },
      );
    }
    await installLauncher(deploymentPath, options.appExecutablePath);
    await writeFile(
      path.join(deploymentPath, "deployment.json"),
      `${JSON.stringify(
        {
          managedBy: "ALU",
          appVersion: options.appVersion,
          appExecutablePath: options.appExecutablePath,
          installedAt: (options.now?.() ?? new Date()).toISOString(),
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    publishingLinks = true;
    const skillPaths = await switchSkillLinks(options.userSkillsRoot, deploymentPath);
    await removeOldDeployments(deploymentsRoot, deploymentPath);
    return { appExecutablePath: options.appExecutablePath, deploymentPath, skillPaths };
  } catch (error) {
    if (!publishingLinks) {
      await rm(deploymentPath, { recursive: true, force: true }).catch(() => undefined);
    }
    throw error;
  }
}

export async function codexIntegrationIsManaged(
  options: Pick<CodexIntegrationOptions, "managedRoot" | "userSkillsRoot">,
): Promise<boolean> {
  const deploymentsRoot = path.join(options.managedRoot, "deployments");
  for (const skillName of CODEX_SKILL_NAMES) {
    const target = await managedSymlinkTarget(
      path.join(options.userSkillsRoot, skillName),
      deploymentsRoot,
    );
    if (!target || !(await pathExists(path.join(target, "SKILL.md")))) return false;
  }
  return true;
}
