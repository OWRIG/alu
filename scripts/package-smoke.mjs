import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, readlink, rm, stat } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, expect } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const executable = path.join(root, "release", "mac-arm64", "ALU.app", "Contents", "MacOS", "ALU");
const temporary = await mkdtemp(path.join(os.tmpdir(), "alu-package-smoke-"));
const userDataPath = path.join(temporary, "user-data");
const savePath = path.join(temporary, "package-smoke.alu");
const cliProjectPath = path.join(temporary, "headless.alu");
const reportJsonPath = path.join(temporary, "headless-report.json");
const reportMarkdownPath = path.join(temporary, "headless-report.md");
const reportPdfPath = path.join(temporary, "headless-report.pdf");
let running;

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : undefined;
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  if (!port) throw new Error("Could not allocate a local CDP port");
  return port;
}

async function runHeadless(command, options = {}) {
  const child = spawn(options.executable ?? executable, command, {
    cwd: root,
    env: { ...process.env, ...options.env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const stdout = [];
  const stderr = [];
  child.stdout.on("data", (chunk) => stdout.push(String(chunk)));
  child.stderr.on("data", (chunk) => stderr.push(String(chunk)));
  const exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolve(code));
  });
  if (exitCode !== 0) {
    throw new Error(
      `Packaged headless command failed (${exitCode}): ${command.join(" ")}\n${stdout.join("")}\n${stderr.join("")}`,
    );
  }
  const lines = stdout.join("").trim().split("\n");
  if (lines.length !== 1) throw new Error(`Expected one JSON line, got ${lines.length}`);
  return JSON.parse(lines[0]);
}

async function launch(projectPath) {
  const port = await freePort();
  const stderr = [];
  const child = spawn(
    executable,
    [
      ...(projectPath ? [projectPath] : []),
      "--remote-debugging-address=127.0.0.1",
      `--remote-debugging-port=${port}`,
    ],
    {
      cwd: root,
      env: {
        ...process.env,
        ALU_E2E: "1",
        ALU_E2E_USER_DATA: userDataPath,
        ALU_E2E_SAVE_PATH: savePath,
      },
      stdio: ["ignore", "ignore", "pipe"],
    },
  );
  child.stderr.on("data", (chunk) => stderr.push(String(chunk)));

  const endpoint = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Packaged ALU exited before CDP was ready:\n${stderr.join("")}`);
    }
    try {
      const response = await fetch(`${endpoint}/json/version`);
      if (response.ok) break;
    } catch {
      // The signed application may need a short cold-start delay.
    }
    await delay(100);
  }
  if (Date.now() >= deadline) {
    throw new Error(`Timed out waiting for packaged ALU:\n${stderr.join("")}`);
  }

  const browser = await chromium.connectOverCDP(endpoint);
  let page;
  const pageDeadline = Date.now() + 10_000;
  while (!page && Date.now() < pageDeadline) {
    page = browser.contexts().flatMap((context) => context.pages())[0];
    if (!page) await delay(50);
  }
  if (!page) throw new Error("Packaged ALU did not create a renderer page");
  const rendererErrors = [];
  page.on("pageerror", (error) => rendererErrors.push(error.message));
  await page.waitForLoadState("domcontentloaded");
  await expect(page.getByTestId("model-viewport")).toBeVisible({ timeout: 15_000 });
  return { browser, child, page, rendererErrors, stderr };
}

async function stop(application) {
  if (!application) return;
  await application.browser.close().catch(() => undefined);
  if (application.child.exitCode !== null) return;
  if (application.child.exitCode === null) application.child.kill("SIGTERM");
  const exited = await Promise.race([
    new Promise((resolve) => application.child.once("exit", () => resolve(true))),
    delay(3_000).then(() => false),
  ]);
  if (!exited && application.child.exitCode === null) application.child.kill("SIGKILL");
}

try {
  await mkdir(userDataPath, { recursive: true });

  await runHeadless(["--cli", "create", cliProjectPath, "--template", "demo"]);
  await runHeadless(["--cli", "export", cliProjectPath, "--output", reportJsonPath]);
  await runHeadless([
    "--cli",
    "export",
    cliProjectPath,
    "--output",
    reportMarkdownPath,
    "--format",
    "md",
  ]);
  await runHeadless(["--cli", "export", cliProjectPath, "--output", reportPdfPath]);
  const report = JSON.parse(await readFile(reportJsonPath, "utf8"));
  const markdown = await readFile(reportMarkdownPath, "utf8");
  const pdf = await readFile(reportPdfPath);
  if (report.reportVersion !== 1) throw new Error("Packaged report JSON version mismatch");
  if (!markdown.includes(report.bomHash) || !markdown.includes("ALU · 工程交付单")) {
    throw new Error("Packaged Markdown handoff is incomplete");
  }
  if (
    pdf.subarray(0, 4).toString("ascii") !== "%PDF" ||
    (await stat(reportPdfPath)).size < 10_000
  ) {
    throw new Error("Packaged PDF handoff is invalid");
  }

  const codexHome = path.join(temporary, "codex-home");
  const codexUserData = path.join(temporary, "codex-user-data");
  await mkdir(codexHome, { recursive: true });
  await runHeadless(["--install-codex"], {
    env: {
      ALU_E2E: "1",
      ALU_E2E_CODEX_HOME: codexHome,
      ALU_E2E_CODEX_USER_DATA: codexUserData,
    },
  });
  const installedSkillPath = path.join(codexHome, ".agents", "skills", "design-with-alu");
  await readlink(installedSkillPath);
  const launcherPath = path.join(installedSkillPath, "scripts", "alu");
  const launcherResult = await runHeadless(["help"], { executable: launcherPath });
  if (!launcherResult.ok || launcherResult.command !== "help") {
    throw new Error("Installed Codex Skill launcher cannot invoke packaged ALU");
  }

  running = await launch();
  const { page } = running;

  await expect(page.getByText("设定约束", { exact: true })).toBeVisible();
  await expect.poll(() => page.locator("html").getAttribute("lang")).toBe("zh-CN");
  await page.getByTestId("language-menu").click();
  await page.getByTestId("locale-en-US").click();
  await expect(page.getByText("Set constraints", { exact: true })).toBeVisible();

  const widthInput = page.getByTestId("param-input-obstacleOuterWidth");
  await widthInput.fill("2200");
  await widthInput.press("Enter");
  await expect(page.getByTestId("derived-frameOuterWidth")).toContainText("2,330");
  await expect(page.getByTestId("derived-tabletopWidth")).toContainText("2,246");
  await page.getByTestId("tab-bom").click();
  await expect(page.getByTestId("bom-table")).toContainText("2,330 mm");

  await page.getByTestId("save-project").click();
  await expect(page.getByText("Saved package-smoke.alu")).toBeVisible();
  const saved = JSON.parse(await readFile(savePath, "utf8"));
  if (!saved.bomSnapshot) throw new Error("Packaged ALU saved without a BOM snapshot");
  if (running.rendererErrors.length > 0) {
    throw new Error(`Renderer errors: ${running.rendererErrors.join("; ")}`);
  }

  await stop(running);
  running = await launch(savePath);
  await expect(running.page.getByTestId("derived-frameOuterWidth")).toContainText("2,330");
  await expect(running.page.getByText("package-smoke.alu", { exact: true })).toBeVisible();
  if (running.rendererErrors.length > 0) {
    throw new Error(`Renderer errors after reopen: ${running.rendererErrors.join("; ")}`);
  }

  console.log(
    "Packaged app smoke passed: CLI, Codex install, JSON/Markdown/PDF handoff, launch, i18n, parameter, BOM, save, reopen",
  );
} finally {
  await stop(running);
  await rm(temporary, { recursive: true, force: true });
}
