import path from "node:path";
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

import { createMainWindowOptions } from "./core/window-options";
import {
  handleRendererScheme,
  PACKAGED_RENDERER_URL,
  registerRendererScheme,
} from "./core/renderer-protocol";
import { registerProjectIpc } from "./features/project/register-project-ipc";
import { registerSettingsIpc } from "./features/settings/register-settings-ipc";
import { getNativeCopy } from "./i18n/native-copy";
import type { AppLocale } from "../shared/i18n/locale";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

app.setName("ALU");
registerRendererScheme();

if (process.env.ALU_E2E === "1" && process.env.ALU_E2E_USER_DATA) {
  app.setPath("userData", process.env.ALU_E2E_USER_DATA);
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

function installApplicationMenu(): void {
  if (process.platform !== "darwin") {
    Menu.setApplicationMenu(null);
    return;
  }
  const template: MenuItemConstructorOptions[] = [
    { role: "appMenu" },
    { role: "editMenu" },
    { role: "windowMenu" },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.haojun.alu");
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
  installApplicationMenu();
  const trustedRendererUrl = rendererUrl();
  if (trustedRendererUrl === PACKAGED_RENDERER_URL) {
    handleRendererScheme(path.join(currentDirectory, "../renderer"));
  }
  let interfaceLocale: AppLocale = "zh-CN";
  const getLocale = () => interfaceLocale;
  registerSettingsIpc({
    trustedRendererUrl,
    onLocaleChange: (locale) => {
      interfaceLocale = locale;
    },
  });
  registerProjectIpc({
    userDataPath: app.getPath("userData"),
    launchFilePath: commandLineProjectPath(),
    trustedRendererUrl,
    getLocale,
  });
  createWindow({ rendererUrl: trustedRendererUrl, getLocale });
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow({ rendererUrl: trustedRendererUrl, getLocale });
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
