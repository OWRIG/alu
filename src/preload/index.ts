import { contextBridge, ipcRenderer } from "electron";

import { PROJECT_IPC, SETTINGS_IPC } from "../shared/ipc/channels";
import type {
  AluDesktopApi,
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
    async save(project) {
      return ipcRenderer.invoke(PROJECT_IPC.save, { project }) as Promise<SaveProjectResponse>;
    },
    async saveAs(project) {
      return ipcRenderer.invoke(PROJECT_IPC.saveAs, { project }) as Promise<SaveProjectResponse>;
    },
  },
  settings: {
    async setLocale(locale) {
      await ipcRenderer.invoke(SETTINGS_IPC.setLocale, { locale });
    },
  },
};

contextBridge.exposeInMainWorld("alu", api);
