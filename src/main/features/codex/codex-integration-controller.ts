import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import {
  BrowserWindow,
  dialog,
  type MessageBoxOptions,
  type MessageBoxReturnValue,
} from "electron";
import { z } from "zod";

import type { AppLocale } from "../../../shared/i18n/locale";
import {
  codexIntegrationIsManaged,
  installCodexIntegration,
  type CodexIntegrationOptions,
} from "../../../node/codex-integration";
import { writeOutputFileAtomic } from "../../../node/output-file";
import { getNativeCopy } from "../../i18n/native-copy";

const PreferenceSchema = z.strictObject({
  schemaVersion: z.literal(1),
  enabled: z.boolean(),
});

type Preference = z.infer<typeof PreferenceSchema>;

function showMessageBox(
  window: BrowserWindow | undefined,
  options: MessageBoxOptions,
): Promise<MessageBoxReturnValue> {
  return window ? dialog.showMessageBox(window, options) : dialog.showMessageBox(options);
}

export type CodexIntegrationController = {
  offerOnce: (window: BrowserWindow) => Promise<void>;
  installInteractive: (window?: BrowserWindow) => Promise<void>;
};

async function readPreference(filePath: string): Promise<Preference | null> {
  try {
    const parsed = PreferenceSchema.safeParse(JSON.parse(await readFile(filePath, "utf8")));
    return parsed.success ? parsed.data : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    return null;
  }
}

async function writePreference(filePath: string, enabled: boolean): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeOutputFileAtomic(
    filePath,
    `${JSON.stringify({ schemaVersion: 1, enabled }, null, 2)}\n`,
  );
}

export function createCodexIntegrationController(options: {
  getLocale: () => AppLocale;
  installer: CodexIntegrationOptions;
  preferencePath: string;
  shouldOffer: boolean;
}): CodexIntegrationController {
  let offerHandled = false;

  async function install(window?: BrowserWindow): Promise<void> {
    const copy = getNativeCopy(options.getLocale());
    try {
      await installCodexIntegration(options.installer);
      await writePreference(options.preferencePath, true);
      await showMessageBox(window, {
        type: "info",
        title: copy.codexInstalledTitle,
        message: copy.codexInstalledMessage,
        detail: copy.codexInstalledDetail,
        buttons: ["OK"],
      });
    } catch (error) {
      await showMessageBox(window, {
        type: "error",
        title: copy.codexInstallFailedTitle,
        message: error instanceof Error ? error.message : copy.codexInstallFailedTitle,
        buttons: ["OK"],
      });
    }
  }

  return {
    installInteractive: install,
    async offerOnce(window) {
      if (!options.shouldOffer || offerHandled) return;
      offerHandled = true;
      const preference = await readPreference(options.preferencePath);
      if (preference?.enabled) {
        try {
          await installCodexIntegration(options.installer);
        } catch (error) {
          const copy = getNativeCopy(options.getLocale());
          await dialog.showMessageBox(window, {
            type: "error",
            title: copy.codexInstallFailedTitle,
            message: error instanceof Error ? error.message : copy.codexInstallFailedTitle,
            buttons: ["OK"],
          });
        }
        return;
      }
      if (preference) return;
      if (
        await codexIntegrationIsManaged({
          managedRoot: options.installer.managedRoot,
          userSkillsRoot: options.installer.userSkillsRoot,
        })
      ) {
        await writePreference(options.preferencePath, true);
        return;
      }

      const copy = getNativeCopy(options.getLocale());
      const choice = await dialog.showMessageBox(window, {
        type: "question",
        title: copy.codexPromptTitle,
        message: copy.codexPromptMessage,
        detail: copy.codexPromptDetail,
        buttons: [copy.codexInstall, copy.codexNotNow],
        defaultId: 0,
        cancelId: 1,
      });
      if (choice.response === 0) await install(window);
      else await writePreference(options.preferencePath, false);
    },
  };
}

export function codexIntegrationPaths(input: {
  appExecutablePath: string;
  appVersion: string;
  bundledSkillsPath: string;
  homePath: string;
  userDataPath: string;
}): Pick<
  CodexIntegrationOptions,
  "appExecutablePath" | "appVersion" | "bundledSkillsPath" | "managedRoot" | "userSkillsRoot"
> {
  return {
    appExecutablePath: input.appExecutablePath,
    appVersion: input.appVersion,
    bundledSkillsPath: input.bundledSkillsPath,
    managedRoot: path.join(input.userDataPath, "codex-integration"),
    userSkillsRoot: path.join(input.homePath, ".agents", "skills"),
  };
}
