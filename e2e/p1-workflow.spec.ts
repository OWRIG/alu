import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  _electron as electron,
  expect,
  test,
  type ElectronApplication,
  type Page,
} from "@playwright/test";

import type { AluDesktopApi } from "../src/shared/ipc/project";

type RunningApp = {
  application: ElectronApplication;
  page: Page;
};

async function launchAlu(
  userDataPath: string,
  savePath: string,
  projectPath?: string,
): Promise<RunningApp> {
  const application = await electron.launch({
    args: [".", ...(projectPath ? [projectPath] : [])],
    cwd: process.cwd(),
    env: {
      ...process.env,
      ALU_E2E: "1",
      ALU_E2E_USER_DATA: userDataPath,
      ALU_E2E_SAVE_PATH: savePath,
    },
  });
  const electronErrors: string[] = [];
  application.process().stderr?.on("data", (chunk) => electronErrors.push(String(chunk)));
  const page = await application.firstWindow();
  const rendererErrors: string[] = [];
  page.on("pageerror", (error) => rendererErrors.push(error.message));
  await page.waitForLoadState("domcontentloaded");
  if ((await page.getByTestId("model-viewport").count()) === 0) {
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    const diagnostics = {
      url: page.url(),
      title: await page.title(),
      body: (await page.locator("body").innerText()).slice(0, 500),
      rendererErrors,
    };
    throw new Error(`renderer did not mount: ${JSON.stringify(diagnostics)}`);
  }
  await expect(page.getByTestId("model-viewport")).toBeVisible();
  if (
    (await page.evaluate(() => typeof (window as Window & { alu?: AluDesktopApi }).alu)) ===
    "undefined"
  ) {
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    throw new Error(`preload did not expose API: ${electronErrors.join("\n")}`);
  }
  return { application, page };
}

test("P1 edits a parameter, updates model/BOM, saves, and reopens", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "alu-e2e-"));
  const userDataPath = path.join(root, "user-data");
  const savePath = path.join(root, "roundtrip.alu");
  let running: RunningApp | undefined;

  try {
    running = await launchAlu(userDataPath, savePath);
    const { page } = running;

    await expect(page.getByText("概念模型 · 不可下单")).toBeVisible();
    await expect(page.getByText("设定约束", { exact: true })).toBeVisible();
    await expect(page.getByText("空间边界", { exact: true })).toBeVisible();
    await expect(page.getByTestId("derived-frameOuterWidth")).toContainText("2,230");
    await expect(page.getByTestId("derived-tabletopWidth")).toContainText("2,146");
    await expect(page.getByText("平嵌桌板 · 单边缝 2 mm")).toBeVisible();
    await expect(page.getByTestId("derived-disclosure")).not.toHaveAttribute("open", "");
    await page.getByTestId("derived-disclosure").locator("summary").click();
    await expect(page.getByText("顶框槽内净宽", { exact: true })).toBeVisible();
    await page.getByTestId("derived-disclosure").locator("summary").click();
    await expect(page.getByText("Dimension System", { exact: true })).toHaveCount(0);

    await page.getByTestId("language-menu").click();
    await page.getByTestId("locale-en-US").click();
    await expect(page.getByText("Set constraints", { exact: true })).toBeVisible();
    await expect(page.getByText("Space envelope", { exact: true })).toBeVisible();
    await expect(page.getByText("Mobile Overbed Table Concept", { exact: true })).toBeVisible();
    await expect(page.getByText("Long-span top beam", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("FLUSH PANEL · 2 MM GAP PER SIDE")).toBeVisible();
    await expect.poll(() => page.locator("html").getAttribute("lang")).toBe("en-US");
    const englishInterface = (await page.locator(".app-shell").innerText()).replaceAll("铝", "");
    expect(englishInterface).not.toMatch(/[\u3400-\u9fff]/u);
    await page.screenshot({ path: "/tmp/alu-en.png", fullPage: true });
    await page.getByTestId("save-project").click();
    await expect(page.getByText("Saved roundtrip.alu")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Set constraints", { exact: true })).toBeVisible();
    await page.getByTestId("tab-rules").click();
    await expect(page.getByTestId("rule-list")).toContainText("needs a deflection review");
    await page.getByTestId("language-menu").click();
    await page.getByTestId("locale-zh-CN").click();
    await expect(page.getByText("设定约束", { exact: true })).toBeVisible();
    await expect.poll(() => page.locator("html").getAttribute("lang")).toBe("zh-CN");
    await page.getByTestId("tab-profiles").click();

    await page.getByTestId("profile-length").fill("0");
    await page.getByTestId("profile-length").press("Enter");
    await expect(page.getByTestId("error-toast")).toContainText("长度必须大于 0 mm");
    await expect(page.getByTestId("profile-length")).toHaveValue("2230");
    await page.getByLabel("关闭错误").click();
    await expect(page.locator('[data-testid^="profile-card-"]')).toHaveCount(10);
    await page.getByTestId("add-profile").click();
    await expect(page.locator('[data-testid^="profile-card-"]')).toHaveCount(11);
    await expect(page.getByTestId("profile-length")).toHaveValue("500");
    await page.getByTestId("undo").click();
    await expect(page.locator('[data-testid^="profile-card-"]')).toHaveCount(10);
    await page.getByTestId("profile-card-profile.top-front").click();
    const isolation = await page.evaluate(() => ({
      processType: typeof globalThis.process,
      projectApiKeys: Object.keys(
        (window as unknown as Window & { alu: AluDesktopApi }).alu.project,
      ).sort(),
      settingsApiKeys: Object.keys(
        (window as unknown as Window & { alu: AluDesktopApi }).alu.settings,
      ).sort(),
    }));
    expect(isolation.processType).toBe("undefined");
    expect(isolation.projectApiKeys).toEqual([
      "getLaunch",
      "open",
      "openRecent",
      "recent",
      "save",
      "saveAs",
    ]);
    expect(isolation.settingsApiKeys).toEqual(["setLocale"]);

    const widthInput = page.getByTestId("param-input-bedOuterWidth");
    await widthInput.fill("2200");
    await widthInput.press("Enter");
    await expect(page.getByTestId("derived-frameOuterWidth")).toContainText("2,330");
    await expect(page.getByTestId("derived-tabletopWidth")).toContainText("2,246");
    await expect(page.getByTestId("profile-length")).toHaveValue("2330");

    await page.getByTestId("tab-bom").click();
    await expect(page.getByTestId("bom-table")).toContainText("2,330 mm");

    await page.getByTestId("undo").click();
    await expect(page.getByTestId("derived-frameOuterWidth")).toContainText("2,230");
    await page.getByTestId("redo").click();
    await expect(page.getByTestId("derived-frameOuterWidth")).toContainText("2,330");

    await page.screenshot({ path: "/tmp/alu-initial.png", fullPage: true });

    await page.getByTestId("save-project").click();
    await expect(page.getByText("已保存 roundtrip.alu")).toBeVisible();
    await expect.poll(async () => (await readFile(savePath, "utf8")).length).toBeGreaterThan(100);
    const saved = JSON.parse(await readFile(savePath, "utf8")) as { bomSnapshot?: unknown };
    expect(saved.bomSnapshot).toBeTruthy();

    await running.application.close();
    running = await launchAlu(userDataPath, savePath, savePath);
    await expect(running.page.getByTestId("derived-frameOuterWidth")).toContainText("2,330");
    await expect(running.page.getByTestId("derived-tabletopWidth")).toContainText("2,246");
    await expect(running.page.getByText("roundtrip.alu", { exact: true })).toBeVisible();
  } finally {
    await running?.application.close().catch(() => undefined);
    await rm(root, { recursive: true, force: true });
  }
});
