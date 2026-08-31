import { contextBridge, ipcRenderer } from "electron";

import { PROJECT_IPC, SETTINGS_IPC } from "../shared/ipc/channels";
import type {
  AluDesktopApi,
  ExportProjectResponse,
  OpenProjectResponse,
  RecentProjectsResponse,
  SaveProjectResponse,
} from "../shared/ipc/project";

const api: AluDesktopApi = {
  project: {
    async getLaunch() {
      return ipcRenderer.invoke(PROJECT_IPC.getLaunch) as Promise<OpenProjectResponse>;
    },
    async open() {
      return ipcRenderer.invoke(PROJECT_IPC.open) as Promise<OpenProjectResponse>;
    },
    async openRecent(id) {
      return ipcRenderer.invoke(PROJECT_IPC.openRecent, { id }) as Promise<OpenProjectResponse>;
    },
    async recent() {
      return ipcRenderer.invoke(PROJECT_IPC.recent) as Promise<RecentProjectsResponse>;
    },
    async save(project, expectedFileHash) {
      return ipcRenderer.invoke(PROJECT_IPC.save, {
        project,
        expectedFileHash,
      }) as Promise<SaveProjectResponse>;
    },
    async saveAs(project) {
      return ipcRenderer.invoke(PROJECT_IPC.saveAs, {
        project,
        expectedFileHash: null,
      }) as Promise<SaveProjectResponse>;
    },
    async export(project, format) {
      return ipcRenderer.invoke(PROJECT_IPC.export, {
        project,
        format,
      }) as Promise<ExportProjectResponse>;
    },
  },
  settings: {
    async setLocale(locale) {
      await ipcRenderer.invoke(SETTINGS_IPC.setLocale, { locale });
    },
  },
};

contextBridge.exposeInMainWorld("alu", api);
