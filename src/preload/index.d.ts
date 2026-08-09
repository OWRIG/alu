import type { AluDesktopApi } from "../shared/ipc/project";

declare global {
  interface Window {
    alu: AluDesktopApi;
  }
}

export {};
