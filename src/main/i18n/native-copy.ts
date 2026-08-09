import type { AppLocale } from "../../shared/i18n/locale";

export type NativeCopy = {
  unsavedTitle: string;
  unsavedMessage: string;
  unsavedDetail: string;
  continueEditing: string;
  discardChanges: string;
  openProject: string;
  saveProject: string;
  projectFile: string;
  missingRecentProject: string;
  untitledProject: string;
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
    projectFile: "ALU 工程",
    missingRecentProject: "最近工程已移动或删除",
    untitledProject: "未命名工程",
  },
  "en-US": {
    unsavedTitle: "Unsaved changes",
    unsavedMessage: "This project has unsaved changes.",
    unsavedDetail: "Closing the window will discard them.",
    continueEditing: "Keep editing",
    discardChanges: "Discard changes",
    openProject: "Open ALU project",
    saveProject: "Save ALU project",
    projectFile: "ALU project",
    missingRecentProject: "The recent project was moved or deleted",
    untitledProject: "Untitled project",
  },
};

export function getNativeCopy(locale: AppLocale): NativeCopy {
  return copy[locale];
}
