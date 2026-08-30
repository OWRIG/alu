import type { AppLocale } from "../../shared/i18n/locale";

export type NativeCopy = {
  unsavedTitle: string;
  unsavedMessage: string;
  unsavedDetail: string;
  continueEditing: string;
  discardChanges: string;
  openProject: string;
  saveProject: string;
  exportProject: string;
  projectFile: string;
  handoffFile: string;
  missingRecentProject: string;
  untitledProject: string;
  installCodexMenu: string;
  codexPromptTitle: string;
  codexPromptMessage: string;
  codexPromptDetail: string;
  codexInstall: string;
  codexNotNow: string;
  codexInstalledTitle: string;
  codexInstalledMessage: string;
  codexInstalledDetail: string;
  codexInstallFailedTitle: string;
};

const copy: Record<AppLocale, NativeCopy> = {
  "zh-CN": {
    unsavedTitle: "有未保存修改",
    unsavedMessage: "当前工程还有未保存修改。",
    unsavedDetail: "关闭窗口会丢弃这些修改。",
    continueEditing: "继续编辑",
    discardChanges: "放弃修改",
    openProject: "打开 ALU 工程",
    saveProject: "保存 ALU 工程",
    exportProject: "导出交付单",
    projectFile: "ALU 工程",
    handoffFile: "ALU 交付单",
    missingRecentProject: "最近工程已移动或删除",
    untitledProject: "未命名工程",
    installCodexMenu: "安装 Codex 接入…",
    codexPromptTitle: "接入 Codex",
    codexPromptMessage: "要让 Codex 直接设计和修改 .alu 吗？",
    codexPromptDetail: "ALU 会安装四项用户级 Skill 和本机启动器，不需要 Node.js 或 pnpm。",
    codexInstall: "安装接入",
    codexNotNow: "暂不安装",
    codexInstalledTitle: "Codex 接入已安装",
    codexInstalledMessage: "现在可以在 Codex 中使用 $design-with-alu。",
    codexInstalledDetail: "Codex 通常会自动发现 Skill；当前任务里没有出现时，重启 Codex 即可。",
    codexInstallFailedTitle: "Codex 接入安装失败",
  },
  "en-US": {
    unsavedTitle: "Unsaved changes",
    unsavedMessage: "This project has unsaved changes.",
    unsavedDetail: "Closing the window will discard them.",
    continueEditing: "Keep editing",
    discardChanges: "Discard changes",
    openProject: "Open ALU project",
    saveProject: "Save ALU project",
    exportProject: "Export handoff",
    projectFile: "ALU project",
    handoffFile: "ALU handoff",
    missingRecentProject: "The recent project was moved or deleted",
    untitledProject: "Untitled project",
    installCodexMenu: "Install Codex Integration…",
    codexPromptTitle: "Connect Codex",
    codexPromptMessage: "Let Codex design and modify .alu projects directly?",
    codexPromptDetail:
      "ALU installs four user-scoped skills and a local launcher. Node.js and pnpm are not required.",
    codexInstall: "Install integration",
    codexNotNow: "Not now",
    codexInstalledTitle: "Codex integration installed",
    codexInstalledMessage: "You can now use $design-with-alu in Codex.",
    codexInstalledDetail:
      "Codex usually detects skills automatically. Restart Codex if it does not appear in the current task.",
    codexInstallFailedTitle: "Codex integration failed",
  },
};

export function getNativeCopy(locale: AppLocale): NativeCopy {
  return copy[locale];
}
