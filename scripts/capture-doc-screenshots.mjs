import { mkdtemp, mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { _electron as electron } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "docs", "images");
const temporary = await mkdtemp(path.join(os.tmpdir(), "alu-docs-"));
const application = await electron.launch({
  args: ["."],
  cwd: root,
  env: {
    ...process.env,
    ALU_E2E: "1",
    ALU_E2E_USER_DATA: path.join(temporary, "user-data"),
    ALU_E2E_SAVE_PATH: path.join(temporary, "example.alu"),
  },
});

try {
  await mkdir(output, { recursive: true });
  const page = await application.firstWindow();
  await page.waitForLoadState("domcontentloaded");
  await page.getByTestId("model-viewport").waitFor({ state: "visible" });
  await page.locator("canvas").waitFor({ state: "visible" });
  await page.waitForTimeout(4_200);
  await page.addStyleTag({ content: ".topbar { padding-left: 16px; }" });
  await page.screenshot({ path: path.join(output, "editor-zh.png") });
  await page.getByTestId("tab-sizing").click();
  await page.getByTestId("sizing-apply-selection").click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(output, "example-sizing.png") });
  await page.getByTestId("save-project").click();
  await page.getByText("已保存 example.alu").waitFor({ state: "visible" });
  console.log(`Wrote 2 documentation screenshots to ${path.relative(root, output)}`);
} finally {
  await application.close().catch(() => undefined);
  await rm(temporary, { recursive: true, force: true });
}
