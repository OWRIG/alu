import path from "node:path";

import { describe, expect, it } from "vitest";

import { resolveRendererRequestPath } from "./renderer-protocol";

describe("resolveRendererRequestPath", () => {
  const root = "/Applications/ALU.app/Contents/Resources/app.asar/dist/renderer";

  it("maps only the application host into the renderer root", () => {
    expect(resolveRendererRequestPath("alu://app/index.html", root)).toBe(
      path.join(root, "index.html"),
    );
    expect(resolveRendererRequestPath("alu://app/assets/index.js", root)).toBe(
      path.join(root, "assets/index.js"),
    );
    expect(resolveRendererRequestPath("alu://other/index.html", root)).toBeNull();
    expect(resolveRendererRequestPath("https://app/index.html", root)).toBeNull();
  });

  it("rejects decoded traversal outside the renderer root", () => {
    expect(resolveRendererRequestPath("alu://app/%2e%2e%2fmain/index.js", root)).toBeNull();
    expect(resolveRendererRequestPath("alu://app/%00index.html", root)).toBeNull();
  });
});
