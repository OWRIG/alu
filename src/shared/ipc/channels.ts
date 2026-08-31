export const PROJECT_IPC = {
  getLaunch: "alu:project:get-launch",
  open: "alu:project:open",
  openRecent: "alu:project:open-recent",
  recent: "alu:project:recent",
  save: "alu:project:save",
  saveAs: "alu:project:save-as",
  export: "alu:project:export",
} as const;

export const SETTINGS_IPC = {
  setLocale: "alu:settings:set-locale",
} as const;
