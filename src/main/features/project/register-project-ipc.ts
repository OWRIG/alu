import path from "node:path";
import { existsSync } from "node:fs";

import { dialog, ipcMain } from "electron";

import { asDomainError } from "../../../domain/project/error";
import type { ProjectDocumentV1 } from "../../../domain/project/schema";
import type { AppLocale } from "../../../shared/i18n/locale";
import {
  OpenRecentRequestSchema,
  OpenedProjectSchema,
  OpenProjectResponseSchema,
  PROJECT_IPC,
  RecentProjectsResponseSchema,
  SaveProjectRequestSchema,
  SaveProjectResponseSchema,
  SavedProjectSchema,
} from "../../../shared/ipc/project";
import { assertTrustedIpcSender } from "../../core/ipc-security";
import { getNativeCopy } from "../../i18n/native-copy";
import { readProjectFile, writeProjectFileAtomic } from "./project-file";
import { RecentProjectsStore } from "./recent-projects";

function errorResponse(error: unknown) {
  const domainError = asDomainError(error);
  return {
    ok: false as const,
    error: {
      code: domainError.code,
      message: domainError.message,
      path: domainError.path,
      suggestion: domainError.suggestion,
    },
  };
}

function safeDefaultFileName(projectName: string, fallbackName: string): string {
  const invalidFileNameCharacters = '<>:"/\\|?*';
  const sanitized = [...projectName]
    .map((character) =>
      character.charCodeAt(0) < 32 || invalidFileNameCharacters.includes(character)
        ? "-"
        : character,
    )
    .join("")
    .trim();
  return `${sanitized || fallbackName}.alu`;
}

export function registerProjectIpc(options: {
  userDataPath: string;
  launchFilePath?: string;
  trustedRendererUrl: string;
  getLocale: () => AppLocale;
}): void {
  const recent = new RecentProjectsStore(options.userDataPath);
  let currentFilePath: string | null = null;
  let pendingLaunchPath = options.launchFilePath;

  async function recordRecentBestEffort(filePath: string): Promise<void> {
    await recent.record(filePath).catch(() => undefined);
  }

  async function openPath(filePath: string) {
    const result = await readProjectFile(filePath);
    currentFilePath = filePath;
    await recordRecentBestEffort(filePath);
    return OpenedProjectSchema.parse({
      ...result,
      fileName: path.basename(filePath),
    });
  }

  async function saveProject(project: ProjectDocumentV1, forceDialog: boolean) {
    let targetPath = forceDialog ? null : currentFilePath;
    if (process.env.ALU_E2E === "1" && process.env.ALU_E2E_SAVE_PATH) {
      targetPath = process.env.ALU_E2E_SAVE_PATH;
    }
    if (!targetPath) {
      const copy = getNativeCopy(options.getLocale());
      const result = await dialog.showSaveDialog({
        title: copy.saveProject,
        defaultPath: safeDefaultFileName(project.meta.name, copy.untitledProject),
        filters: [{ name: copy.projectFile, extensions: ["alu"] }],
        properties: ["showOverwriteConfirmation", "createDirectory"],
      });
      if (result.canceled || !result.filePath) return null;
      targetPath = result.filePath.toLowerCase().endsWith(".alu")
        ? result.filePath
        : `${result.filePath}.alu`;
    }
    const saved = await writeProjectFileAtomic(targetPath, project);
    currentFilePath = targetPath;
    await recordRecentBestEffort(targetPath);
    return SavedProjectSchema.parse({ ...saved, fileName: path.basename(targetPath) });
  }

  ipcMain.handle(PROJECT_IPC.getLaunch, async (event) => {
    try {
      assertTrustedIpcSender(event, options.trustedRendererUrl);
      if (!pendingLaunchPath) return OpenProjectResponseSchema.parse({ ok: true, data: null });
      const launchPath = pendingLaunchPath;
      pendingLaunchPath = undefined;
      return OpenProjectResponseSchema.parse({ ok: true, data: await openPath(launchPath) });
    } catch (error) {
      return OpenProjectResponseSchema.parse(errorResponse(error));
    }
  });

  ipcMain.handle(PROJECT_IPC.open, async (event) => {
    try {
      assertTrustedIpcSender(event, options.trustedRendererUrl);
      const copy = getNativeCopy(options.getLocale());
      const result = await dialog.showOpenDialog({
        title: copy.openProject,
        filters: [{ name: copy.projectFile, extensions: ["alu", "json"] }],
        properties: ["openFile"],
      });
      if (result.canceled || result.filePaths.length === 0) {
        return OpenProjectResponseSchema.parse({ ok: true, data: null });
      }
      return OpenProjectResponseSchema.parse({
        ok: true,
        data: await openPath(result.filePaths[0]),
      });
    } catch (error) {
      return OpenProjectResponseSchema.parse(errorResponse(error));
    }
  });

  ipcMain.handle(PROJECT_IPC.openRecent, async (event, input: unknown) => {
    try {
      assertTrustedIpcSender(event, options.trustedRendererUrl);
      const request = OpenRecentRequestSchema.parse(input);
      const filePath = await recent.resolve(request.id);
      if (!filePath || !existsSync(filePath)) {
        throw new Error(getNativeCopy(options.getLocale()).missingRecentProject);
      }
      return OpenProjectResponseSchema.parse({ ok: true, data: await openPath(filePath) });
    } catch (error) {
      return OpenProjectResponseSchema.parse(errorResponse(error));
    }
  });

  ipcMain.handle(PROJECT_IPC.recent, async (event) => {
    try {
      assertTrustedIpcSender(event, options.trustedRendererUrl);
      return RecentProjectsResponseSchema.parse({ ok: true, data: await recent.list() });
    } catch (error) {
      return RecentProjectsResponseSchema.parse(errorResponse(error));
    }
  });

  ipcMain.handle(PROJECT_IPC.save, async (event, input: unknown) => {
    try {
      assertTrustedIpcSender(event, options.trustedRendererUrl);
      const request = SaveProjectRequestSchema.parse(input);
      return SaveProjectResponseSchema.parse({
        ok: true,
        data: await saveProject(request.project, false),
      });
    } catch (error) {
      return SaveProjectResponseSchema.parse(errorResponse(error));
    }
  });

  ipcMain.handle(PROJECT_IPC.saveAs, async (event, input: unknown) => {
    try {
      assertTrustedIpcSender(event, options.trustedRendererUrl);
      const request = SaveProjectRequestSchema.parse(input);
      return SaveProjectResponseSchema.parse({
        ok: true,
        data: await saveProject(request.project, true),
      });
    } catch (error) {
      return SaveProjectResponseSchema.parse(errorResponse(error));
    }
  });
}
