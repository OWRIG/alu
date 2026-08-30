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
  exportPath?: string,
): Promise<RunningApp> {
  const application = await electron.launch({
    args: [".", ...(projectPath ? [projectPath] : [])],
    cwd: process.cwd(),
    env: {
      ...process.env,
      ALU_E2E: "1",
      ALU_E2E_USER_DATA: userDataPath,
      ALU_E2E_SAVE_PATH: savePath,
      ...(exportPath ? { ALU_E2E_EXPORT_PATH: exportPath } : {}),
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
  const exportPath = path.join(root, "handoff.md");
  let running: RunningApp | undefined;

  try {
    running = await launchAlu(userDataPath, savePath, undefined, exportPath);
    const { page } = running;

    // 2026-08-30 interface-language: four repeated disclaimers became one readiness bar.
    await expect(page.getByTestId("readiness")).toBeVisible();
    // The built-in example ships with joints, so machining is already settled.
    await expect(page.getByTestId("readiness-count")).toHaveText("1/5");
    await expect(page.getByText("概念模型 · 不可下单")).toHaveCount(0);
    await expect(page.getByText("概念模型", { exact: true })).toHaveCount(0);
    await expect(page.getByText("尺寸", { exact: true })).toBeVisible();
    await expect(page.getByText("障碍物", { exact: true })).toBeVisible();
    await expect(page.locator(".project-heading strong")).toHaveText("参数化跨障碍框架");
    await expect(page.getByTestId("derived-frameOuterWidth")).toContainText("2,200");
    await expect(page.getByTestId("derived-tabletopWidth")).toContainText("2,130");
    await expect(page.getByText("平嵌桌板 · 单边缝 5 mm")).toBeVisible();
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
    await expect(page.getByText("尺寸", { exact: true })).toBeVisible();
    await page.getByTestId("overflow-menu").click();
    await page.getByTestId("locale-en-US").click();
    await expect(page.getByText("Dimensions", { exact: true })).toBeVisible();
    await expect.poll(() => page.locator("html").getAttribute("lang")).toBe("en-US");
    const englishInterface = (await page.locator(".app-shell").innerText()).replaceAll("铝", "");
    expect(englishInterface).not.toMatch(/[\u3400-\u9fff]/u);
    // 2026-08-30 gui-capability-gaps: picking a profile is now a first-class action.
    await page.getByTestId("profile-card-profile.base-left").click();
    await page.getByTestId("profile-definition").selectOption("generic.profile.2020-envelope");
    await page.getByTestId("tab-bom").click();
    await expect(page.getByTestId("bom-table")).toContainText("Concept 2020 Envelope");
    await page.getByTestId("undo").click();

    // 2026-08-31 joints-and-machining: connections drive the holes.
    await page.getByTestId("tab-joints").click();
    await expect(page.getByTestId("joints-panel")).toContainText("Hidden connector");
    await page.getByTestId("joint-add").click();
    // A corner bracket clamps on from outside, so it must not add any holes.
    await page.getByTestId("joint-type").selectOption("corner-bracket");
    await expect(page.getByTestId("joint-drill-preview")).toContainText("No drilling");
    await page.getByTestId("joint-type").selectOption("butt-screw");
    await expect(page.getByTestId("joint-drill-preview")).toContainText("Adds 4 holes");
    await page.getByTestId("joint-create").click();
    await expect(page.getByTestId("joint-delete")).toBeVisible();

    await page.getByTestId("tab-bom").click();
    await expect(page.getByTestId("hardware-list")).toContainText("Bolt");
    await expect(page.getByTestId("hardware-list")).toContainText("Part number to confirm");
    // M8 taps are Ø6.8 by ISO; the number must come from the standard, not a guess.
    await expect(page.getByTestId("machining-list")).toContainText("Ø6.8");
    await page.getByTestId("tab-joints").click();
    await page.getByTestId("joint-delete").click();

    // Overlay switches only exist once the project actually has joints.
    await expect(page.getByTestId("toggle-machining")).toBeVisible();
    await page.getByTestId("toggle-machining").click();
    await expect(page.getByTestId("toggle-machining")).toHaveAttribute("aria-pressed", "false");
    await page.getByTestId("section-axis").selectOption("z");
    await expect(page.getByTestId("section-position")).toBeVisible();
    await page.getByTestId("section-axis").selectOption("off");
    await page.getByTestId("tab-profiles").click();

    // 2026-08-30 context-and-rule-scope: use conditions drive which checks run.
    await page.getByTestId("tab-rules").click();
    await expect(page.getByTestId("rule-list")).toContainText("side-sway");
    await page.getByTestId("context-mobility").selectOption("static");
    await expect(page.getByTestId("rule-list")).not.toContainText("side-sway");
    await page.getByTestId("context-mobility").selectOption("casters");
    await expect(page.getByTestId("rule-list")).toContainText("side-sway");
    await page.getByTestId("tab-profiles").click();

    await page.getByTestId("save-project").click();
    await expect(page.getByText("Saved roundtrip.alu")).toBeVisible();
    await expect(page.locator(".busy-line")).toHaveCount(0);

    // 2026-08-30 gui-capability-gaps: the desktop app can now produce a handoff.
    await page.getByTestId("export-project").click();
    await page.getByTestId("export-md").click();
    await expect(page.getByText(`Exported ${path.basename(exportPath)}`)).toBeVisible();
    await expect.poll(async () => (await readFile(exportPath, "utf8")).length).toBeGreaterThan(100);
    expect(await readFile(exportPath, "utf8")).toContain("TXCK-H6-J3090");

    await page.reload();
    await expect(page.getByText("Dimensions", { exact: true })).toBeVisible();
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
    await expect(page.getByTestId("sizing-selected-sku")).toHaveText("TXCK-H6-J3090");
    await expect(page.getByTestId("sizing-selected-deflection")).toContainText("1.13");
    await expect(page.getByTestId("sizing-candidate-TXCK-H6-J3030")).toContainText("Fail");
    await expect(page.getByTestId("sizing-candidate-TXCK-H6-J3060")).toContainText("Fail");
    await expect(page.getByTestId("sizing-candidate-LCF8-3090")).toContainText("Incompatible");
    await expect(page.getByTestId("sizing-candidate-TXCK-H6-J3090")).toContainText("Pass");
    await page.getByTestId("sizing-apply-selection").click();
    await expect(page.getByTestId("sizing-apply-selection")).toContainText("Model uses this SKU");
    await expect(page.getByTestId("sizing-apply-selection")).toBeDisabled();
    // Every member now carries a vendor SKU, so profiles joins machining.
    await expect(page.getByTestId("readiness-count")).toHaveText("2/5");
    await page.getByTestId("readiness").getByRole("button").click();
    await expect(page.getByTestId("readiness-detail")).toContainText("Not modelled yet");
    await page.getByTestId("sizing-center-payload").fill("30");
    await page.getByTestId("sizing-center-payload").press("Enter");
    await expect(page.getByTestId("sizing-selected-sku")).toHaveText("TXCK-H6-3090");
    await page.getByTestId("sizing-center-payload").fill("10");
    await page.getByTestId("sizing-center-payload").press("Enter");
    await expect(page.getByTestId("sizing-selected-sku")).toHaveText("TXCK-H6-J3090");
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
    await expect(page.getByTestId("profile-length")).toHaveValue("2200");
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
      "export",
      "getLaunch",
      "open",
      "openRecent",
      "recent",
      "save",
      "saveAs",
    ]);
    expect(isolation.settingsApiKeys).toEqual(["setLocale"]);

    // 2026-08-30 interface-language: internal values left the status bar.
    const statusBarText = await page.locator(".status-bar").innerText();
    expect(statusBarText).not.toMatch(/[0-9a-f]{8}/);
    expect(statusBarText.toLowerCase()).not.toContain("revision");

    const widthInput = page.getByTestId("param-input-obstacleOuterWidth");
    await widthInput.fill("2200");
    await widthInput.press("Enter");
    await expect(page.getByTestId("derived-frameOuterWidth")).toContainText("2,300");
    await expect(page.getByTestId("derived-tabletopWidth")).toContainText("2,230");
    await expect(page.getByTestId("profile-length")).toHaveValue("2300");

    await page.getByTestId("tab-bom").click();
    await expect(page.getByTestId("bom-table")).toContainText("2,300 mm");
    await expect(page.getByTestId("bom-table")).toContainText("JLCFA TXCK-H6-J3090");

    await page.getByTestId("undo").click();
    await expect(page.getByTestId("derived-frameOuterWidth")).toContainText("2,200");
    await page.getByTestId("redo").click();
    await expect(page.getByTestId("derived-frameOuterWidth")).toContainText("2,300");

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
        (snapshot) => snapshot.definition.procurement?.sku === "TXCK-H6-J3090",
      ),
    ).toBe(true);

    await running.application.close();
    running = await launchAlu(userDataPath, savePath, savePath);
    await expect(running.page.getByTestId("derived-frameOuterWidth")).toContainText("2,300");
    await expect(running.page.getByTestId("derived-tabletopWidth")).toContainText("2,230");
    await expect(running.page.getByText("roundtrip.alu", { exact: true })).toBeVisible();
  } finally {
    await running?.application.close().catch(() => undefined);
    await rm(root, { recursive: true, force: true });
  }
});
