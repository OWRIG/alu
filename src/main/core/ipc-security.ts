import type { IpcMainInvokeEvent } from "electron";

export function isTrustedRendererUrl(candidate: string, expected: string): boolean {
  try {
    return new URL(candidate).href === new URL(expected).href;
  } catch {
    return false;
  }
}

export function assertTrustedIpcSender(
  event: Pick<IpcMainInvokeEvent, "senderFrame">,
  expectedRendererUrl: string,
): void {
  const senderUrl = event.senderFrame?.url;
  if (!senderUrl || !isTrustedRendererUrl(senderUrl, expectedRendererUrl)) {
    throw new Error("Rejected IPC request from an untrusted renderer");
  }
}
