import { describe, expect, it } from "vitest";

import { createMainWindowOptions } from "./window-options";

describe("createMainWindowOptions", () => {
  it("keeps the renderer isolated from Node and webviews", () => {
    const options = createMainWindowOptions("/tmp/alu-preload.mjs", "linux");
    expect(options.webPreferences).toMatchObject({
      preload: "/tmp/alu-preload.mjs",
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false,
    });
    expect(options.show).toBe(false);
  });

  it("uses an inset title bar on macOS only", () => {
    const macOptions = createMainWindowOptions("/tmp/preload.mjs", "darwin");
    expect(macOptions.titleBarStyle).toBe("hiddenInset");
    expect(macOptions.trafficLightPosition).toEqual({ x: 16, y: 19 });
    expect(createMainWindowOptions("/tmp/preload.mjs", "win32").titleBarStyle).toBeUndefined();
  });
});
