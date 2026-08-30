import { readFile } from "node:fs/promises";
import path from "node:path";
import { finished } from "node:stream/promises";
import { fileURLToPath } from "node:url";

import {
  app,
  BrowserWindow,
  dialog,
  Menu,
  session,
  type MenuItemConstructorOptions,
} from "electron";
import { electronApp, is } from "@electron-toolkit/utils";

import { runCli } from "../cli/run";
import { asDomainError } from "../domain/project/error";
import { installCodexIntegration } from "../node/codex-integration";
import { DEFAULT_APP_LOCALE, type AppLocale } from "../shared/i18n/locale";
import { createMainWindowOptions } from "./core/window-options";
import {
  handleRendererScheme,
  PACKAGED_RENDERER_URL,
  registerRendererScheme,
} from "./core/renderer-protocol";
import {
  codexIntegrationPaths,
  createCodexIntegrationController,
  type CodexIntegrationController,
} from "./features/codex/codex-integration-controller";
import { registerProjectIpc } from "./features/project/register-project-ipc";
import { renderReportPdf } from "./features/report/render-pdf";
import { registerSettingsIpc } from "./features/settings/register-settings-ipc";
import { getNativeCopy } from "./i18n/native-copy";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

app.setName("ALU");

if (process.env.ALU_E2E === "1" && process.env.ALU_E2E_USER_DATA) {
  app.setPath("userData", process.env.ALU_E2E_USER_DATA);
}

function bundledSkillsPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, "skills")
    : path.join(app.getAppPath(), "skills");
}

async function reportLogoDataUrl(): Promise<string> {
  const source = await readFile(
    path.join(bundledSkillsPath(), "design-with-alu", "assets", "alu-mark.svg"),
  );
  return `data:image/svg+xml;base64,${source.toString("base64")}`;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function writeJsonLine(value: unknown): Promise<void> {
  process.stdout.end(`${JSON.stringify(value)}\n`);
  await finished(process.stdout);
}

function denySessionPermissions(): void {
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
}

async function runHeadlessCli(argv: string[]): Promise<void> {
  app.on("window-all-closed", () => {
    // PDF export owns a hidden window; the CLI exits only after stdout is flushed.
  });
  await app.whenReady();
  denySessionPermissions();
  const result = await runCli(argv, {
    readStdin,
    renderPdf: renderReportPdf,
    reportLogoDataUrl: await reportLogoDataUrl(),
  });
  await writeJsonLine(result.response);
  app.exit(result.exitCode);
}

function integrationOptions() {
  const testHome = process.env.ALU_E2E === "1" ? process.env.ALU_E2E_CODEX_HOME : undefined;
  const testUserData =
    process.env.ALU_E2E === "1" ? process.env.ALU_E2E_CODEX_USER_DATA : undefined;
  return codexIntegrationPaths({
    appExecutablePath: process.execPath,
    appVersion: app.getVersion(),
    bundledSkillsPath: bundledSkillsPath(),
    homePath: testHome ?? app.getPath("home"),
    userDataPath: testUserData ?? app.getPath("userData"),
  });
}

async function runCodexInstaller(): Promise<void> {
  await app.whenReady();
  try {
    const result = await installCodexIntegration(integrationOptions());
    await writeJsonLine({ ok: true, command: "install-codex", data: result });
    app.exit(0);
  } catch (error) {
    const domainError = asDomainError(error);
    await writeJsonLine({
      ok: false,
      command: "install-codex",
      error: {
        code: domainError.code,
        message: domainError.message,
        ...(domainError.suggestion ? { suggestion: domainError.suggestion } : {}),
      },
    });
    app.exit(1);
  }
}

function commandLineProjectPath(): string | undefined {
  const candidate = process.argv.find(
    (argument, index) => index > 0 && argument.toLowerCase().endsWith(".alu"),
  );
  return candidate ? path.resolve(candidate) : undefined;
}

function rendererUrl(): string {
  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    return new URL(process.env.ELECTRON_RENDERER_URL).href;
  }
  return PACKAGED_RENDERER_URL;
}

function createWindow(options: { rendererUrl: string; getLocale: () => AppLocale }): BrowserWindow {
  const preloadPath = path.join(currentDirectory, "../preload/index.cjs");
  const window = new BrowserWindow(createMainWindowOptions(preloadPath));

  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, url) => {
    if (url !== window.webContents.getURL()) event.preventDefault();
  });
  window.webContents.on("will-attach-webview", (event) => event.preventDefault());
  window.webContents.on("will-prevent-unload", (event) => {
    if (process.env.ALU_E2E === "1") {
      event.preventDefault();
      return;
    }
    const copy = getNativeCopy(options.getLocale());
    const choice = dialog.showMessageBoxSync(window, {
      type: "warning",
      title: copy.unsavedTitle,
      message: copy.unsavedMessage,
      detail: copy.unsavedDetail,
      buttons: [copy.continueEditing, copy.discardChanges],
      defaultId: 0,
      cancelId: 0,
    });
    if (choice === 1) event.preventDefault();
  });
  window.once("ready-to-show", () => {
    if (process.env.ALU_E2E === "1") window.showInactive();
    else window.show();
  });

  void window.loadURL(options.rendererUrl);
  return window;
}

function installApplicationMenu(options: {
  getLocale: () => AppLocale;
  codex: CodexIntegrationController;
}): void {
  if (process.platform !== "darwin") {
    Menu.setApplicationMenu(null);
    return;
  }
  const copy = getNativeCopy(options.getLocale());
  const template: MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        {
          label: copy.installCodexMenu,
          click: () =>
            void options.codex.installInteractive(BrowserWindow.getFocusedWindow() ?? undefined),
        },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    { role: "editMenu" },
    { role: "windowMenu" },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function startDesktop(): void {
  registerRendererScheme();
  app.whenReady().then(() => {
    electronApp.setAppUserModelId("com.haojun.alu");
    denySessionPermissions();
    const trustedRendererUrl = rendererUrl();
    if (trustedRendererUrl === PACKAGED_RENDERER_URL) {
      handleRendererScheme(path.join(currentDirectory, "../renderer"));
    }
    let interfaceLocale: AppLocale = DEFAULT_APP_LOCALE;
    const getLocale = () => interfaceLocale;
    const codex = createCodexIntegrationController({
      getLocale,
      installer: integrationOptions(),
      preferencePath: path.join(app.getPath("userData"), "codex-integration.json"),
      shouldOffer: app.isPackaged && process.env.ALU_E2E !== "1",
    });
    installApplicationMenu({ getLocale, codex });
    registerSettingsIpc({
      trustedRendererUrl,
      onLocaleChange: (locale) => {
        interfaceLocale = locale;
        installApplicationMenu({ getLocale, codex });
      },
    });
    registerProjectIpc({
      userDataPath: app.getPath("userData"),
      launchFilePath: commandLineProjectPath(),
      trustedRendererUrl,
      getLocale,
      renderPdf: renderReportPdf,
      reportLogoDataUrl,
    });

    const createApplicationWindow = () => {
      const window = createWindow({ rendererUrl: trustedRendererUrl, getLocale });
      window.once("ready-to-show", () => void codex.offerOnce(window));
    };
    createApplicationWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createApplicationWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}

const cliMarkerIndex = process.argv.indexOf("--cli");
if (cliMarkerIndex >= 0) {
  void runHeadlessCli(process.argv.slice(cliMarkerIndex + 1)).catch((error) => {
    const domainError = asDomainError(error);
    void writeJsonLine({
      ok: false,
      command: "launch",
      error: { code: domainError.code, message: domainError.message },
    }).finally(() => app.exit(1));
  });
} else if (process.argv.includes("--install-codex")) {
  void runCodexInstaller();
} else {
  startDesktop();
}
