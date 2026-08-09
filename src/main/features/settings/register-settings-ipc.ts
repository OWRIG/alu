import { ipcMain } from "electron";

import { assertTrustedIpcSender } from "../../core/ipc-security";
import { SETTINGS_IPC } from "../../../shared/ipc/channels";
import { SetLocaleRequestSchema } from "../../../shared/ipc/settings";
import type { AppLocale } from "../../../shared/i18n/locale";

export function registerSettingsIpc(options: {
  trustedRendererUrl: string;
  onLocaleChange: (locale: AppLocale) => void;
}): void {
  ipcMain.handle(SETTINGS_IPC.setLocale, async (event, input: unknown) => {
    assertTrustedIpcSender(event, options.trustedRendererUrl);
    const request = SetLocaleRequestSchema.parse(input);
    options.onLocaleChange(request.locale);
  });
}
