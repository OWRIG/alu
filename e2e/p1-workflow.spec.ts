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
    await expect(page.locator(".project-heading strong")).toHaveText("参数化跨障碍框架");
    await expect(page.getByTestId("derived-frameOuterWidth")).toContainText("2,230");
    await expect(page.getByTestId("derived-tabletopWidth")).toContainText("2,146");
    await expect(page.getByText("平嵌桌板 · 单边缝 2 mm")).toBeVisible();
    await expect(page.getByTestId("derived-disclosure")).not.toHaveAttribute("open", "");
    await page.getByTestId("derived-disclosure").locator("summary").click();
    await expect(page.getByText("顶框槽内净宽", { exact: true })).toBeVisible();
    await page.getByTestId("derived-disclosure").locator("summary").click();
    await expect(page.getByText("Dimension System", { exact: true })).toHaveCount(0);
    await expect.poll(() => page.locator("html").getAttribute("lang")).toBe("zh-CN");
    await page.getByTestId("save-project").click();
    await expect(page.getByText("已保存 roundtrip.alu")).toBeVisible();
    await expect(page.locator(".busy-line")).toHaveCount(0);
    await page.reload();
    await expect(page.getByText("设定约束", { exact: true })).toBeVisible();
    await page.getByTestId("language-menu").click();
    await page.getByTestId("locale-en-US").click();
    await expect(page.getByText("Set constraints", { exact: true })).toBeVisible();
    await expect.poll(() => page.locator("html").getAttribute("lang")).toBe("en-US");
    const englishInterface = (await page.locator(".app-shell").innerText()).replaceAll("铝", "");
    expect(englishInterface).not.toMatch(/[\u3400-\u9fff]/u);
    await page.getByTestId("save-project").click();
    await expect(page.getByText("Saved roundtrip.alu")).toBeVisible();
    await expect(page.locator(".busy-line")).toHaveCount(0);
    await page.reload();
    await expect(page.getByText("Set constraints", { exact: true })).toBeVisible();
    await page.getByTestId("parameter-add").click();
    await page.getByTestId("parameter-definition-id").fill("fieldClearance");
    await page.getByTestId("parameter-definition-value").fill("12");
    await page.getByTestId("parameter-definition-save").click();
    await expect(page.getByTestId("param-input-fieldClearance")).toHaveValue("12");
    const casterHeight = page.getByTestId("param-input-casterInstalledHeight");
    await casterHeight.fill("100");
    await casterHeight.press("Enter");
    await expect(casterHeight).toHaveValue("100");
    await page.getByTestId("tab-sizing").click();
    await expect(page.getByTestId("sizing-selected-sku")).toHaveText("NFSL8-4080");
    await expect(page.getByTestId("sizing-selected-deflection")).toContainText("1.8");
    await expect(page.getByTestId("sizing-candidate-NEFS6-3030")).toContainText("Fail");
    await expect(page.getByTestId("sizing-candidate-NEFS8-4040")).toContainText("Fail");
    await expect(page.getByTestId("sizing-candidate-LCF8-3090")).toContainText("Incompatible");
    await expect(page.getByTestId("sizing-candidate-NFSL8-4080")).toContainText("Pass");
    await page.getByTestId("sizing-apply-selection").click();
    await expect(page.getByTestId("sizing-apply-selection")).toContainText("Model uses this SKU");
    await expect(page.getByTestId("sizing-apply-selection")).toBeDisabled();
    await page.getByTestId("sizing-center-payload").fill("25");
    await page.getByTestId("sizing-center-payload").press("Enter");
    await expect(page.getByTestId("sizing-selected-sku")).toHaveText("NEFS8-4080");
    await page.getByTestId("sizing-center-payload").fill("15");
    await page.getByTestId("sizing-center-payload").press("Enter");
    await expect(page.getByTestId("sizing-selected-sku")).toHaveText("NFSL8-4080");
    await page.getByTestId("tab-rules").click();
    await expect(page.getByTestId("rule-list")).toContainText(
      "lowest-mass candidate that meets every sizing constraint",
    );
    await expect(page.getByTestId("rule-list")).not.toContainText(
      "Caster installed height is unknown",
    );
    await page.getByTestId("tab-profiles").click();

    await page.getByTestId("profile-length").fill("0");
    await page.getByTestId("profile-length").press("Enter");
    await expect(page.getByTestId("error-toast")).toContainText("Length must be greater than 0 mm");
    await expect(page.getByTestId("profile-length")).toHaveValue("2230");
    await page.getByLabel("Dismiss error").click();
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

    const widthInput = page.getByTestId("param-input-obstacleOuterWidth");
    await widthInput.fill("2200");
    await widthInput.press("Enter");
    await expect(page.getByTestId("derived-frameOuterWidth")).toContainText("2,330");
    await expect(page.getByTestId("derived-tabletopWidth")).toContainText("2,246");
    await expect(page.getByTestId("profile-length")).toHaveValue("2330");

    await page.getByTestId("tab-bom").click();
    await expect(page.getByTestId("bom-table")).toContainText("2,330 mm");
    await expect(page.getByTestId("bom-table")).toContainText("MISUMI NFSL8-4080");

    await page.getByTestId("undo").click();
    await expect(page.getByTestId("derived-frameOuterWidth")).toContainText("2,230");
    await page.getByTestId("redo").click();
    await expect(page.getByTestId("derived-frameOuterWidth")).toContainText("2,330");

    await page.getByTestId("save-project").click();
    await expect(page.getByText("Saved roundtrip.alu")).toBeVisible();
    await expect(page.locator(".busy-line")).toHaveCount(0);
    await expect.poll(async () => (await readFile(savePath, "utf8")).length).toBeGreaterThan(100);
    const saved = JSON.parse(await readFile(savePath, "utf8")) as {
      bomSnapshot?: unknown;
      embeddedParts: Record<string, { definition: { procurement?: { sku?: string } } }>;
    };
    expect(saved.bomSnapshot).toBeTruthy();
    expect(
      Object.values(saved.embeddedParts).some(
        (snapshot) => snapshot.definition.procurement?.sku === "NFSL8-4080",
      ),
    ).toBe(true);

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
