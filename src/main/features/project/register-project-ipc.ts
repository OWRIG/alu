import path from "node:path";
import { existsSync } from "node:fs";

import { dialog, ipcMain } from "electron";

import {
  buildProjectHandoff,
  renderProjectHandoffHtml,
  renderProjectHandoffMarkdown,
} from "../../../domain/report/handoff";
import { asDomainError, DomainError } from "../../../domain/project/error";
import type { ProjectDocumentV1 } from "../../../domain/project/schema";
import { writeOutputFileAtomic } from "../../../node/output-file";
import { readProjectFile, replaceProjectFileAtomic } from "../../../node/project-file";
import type { AppLocale } from "../../../shared/i18n/locale";
import {
  ExportProjectRequestSchema,
  ExportProjectResponseSchema,
  type ExportFormat,
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

const EXPORT_EXTENSIONS: Record<ExportFormat, string> = { md: "md", json: "json", pdf: "pdf" };

export function registerProjectIpc(options: {
  userDataPath: string;
  launchFilePath?: string;
  trustedRendererUrl: string;
  getLocale: () => AppLocale;
  renderPdf?: (input: { html: string; title: string; footerText: string }) => Promise<Uint8Array>;
  reportLogoDataUrl?: () => Promise<string>;
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

  async function saveProject(
    project: ProjectDocumentV1,
    forceDialog: boolean,
    expectedFileHash?: string,
  ) {
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
    if (!forceDialog && expectedFileHash === undefined) {
      throw new DomainError({
        code: "file.identity-missing",
        message: "保存已有工程时必须提供读取时的文件哈希",
        suggestion: "重新打开工程后再保存",
      });
    }
    const saved = await replaceProjectFileAtomic(targetPath, project, {
      expectedFileHash: forceDialog ? undefined : expectedFileHash,
    });
    currentFilePath = targetPath;
    await recordRecentBestEffort(targetPath);
    return SavedProjectSchema.parse({ ...saved, fileName: path.basename(targetPath) });
  }

  async function exportProject(project: ProjectDocumentV1, format: ExportFormat) {
    const copy = getNativeCopy(options.getLocale());
    const extension = EXPORT_EXTENSIONS[format];
    let targetPath: string | null = null;
    if (process.env.ALU_E2E === "1" && process.env.ALU_E2E_EXPORT_PATH) {
      targetPath = process.env.ALU_E2E_EXPORT_PATH;
    } else {
      const result = await dialog.showSaveDialog({
        title: copy.exportProject,
        defaultPath: safeDefaultFileName(project.meta.name, copy.untitledProject).replace(
          /\.alu$/,
          `.${extension}`,
        ),
        filters: [{ name: copy.handoffFile, extensions: [extension] }],
        properties: ["showOverwriteConfirmation", "createDirectory"],
      });
      if (result.canceled || !result.filePath) return null;
      targetPath = result.filePath.toLowerCase().endsWith(`.${extension}`)
        ? result.filePath
        : `${result.filePath}.${extension}`;
    }
    if (currentFilePath && path.resolve(targetPath) === path.resolve(currentFilePath)) {
      throw new DomainError({
        code: "report.output-conflicts-project",
        message: "交付文件不能覆盖源 .alu 工程",
        suggestion: "换一个文件名",
      });
    }

    // Same builder the headless CLI uses, so GUI and CLI exports stay identical.
    const report = buildProjectHandoff(project, "order-draft");
    let contents: string | Uint8Array;
    if (format === "json") {
      contents = `${JSON.stringify(report, null, 2)}\n`;
    } else if (format === "md") {
      contents = renderProjectHandoffMarkdown(report);
    } else {
      if (!options.renderPdf || !options.reportLogoDataUrl) {
        throw new DomainError({
          code: "report.pdf-unavailable",
          message: "当前运行时不支持 PDF 导出",
          suggestion: "改用 Markdown 或 JSON 导出",
        });
      }
      contents = await options.renderPdf({
        html: renderProjectHandoffHtml(report, { logoDataUrl: await options.reportLogoDataUrl() }),
        title: `${report.project.name} · ALU 工程交付单`,
        footerText: `ALU · ${report.project.name}`,
      });
    }
    await writeOutputFileAtomic(targetPath, contents);
    return { fileName: path.basename(targetPath), format, bomHash: report.bomHash };
  }

  ipcMain.handle(PROJECT_IPC.export, async (event, input: unknown) => {
    try {
      assertTrustedIpcSender(event, options.trustedRendererUrl);
      const request = ExportProjectRequestSchema.parse(input);
      return ExportProjectResponseSchema.parse({
        ok: true,
        data: await exportProject(request.project, request.format),
      });
    } catch (error) {
      return ExportProjectResponseSchema.parse(errorResponse(error));
    }
  });

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
        data: await saveProject(request.project, false, request.expectedFileHash ?? undefined),
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
