import { describe, expect, it } from "vitest";

import { isTrustedRendererUrl } from "./ipc-security";

describe("isTrustedRendererUrl", () => {
  it("accepts only the configured renderer document", () => {
    const expected =
      "file:///Applications/ALU.app/Contents/Resources/app.asar/dist/renderer/index.html";

    expect(isTrustedRendererUrl(expected, expected)).toBe(true);
    expect(
      isTrustedRendererUrl(
        "file:///Applications/ALU.app/Contents/Resources/app.asar/dist/renderer/other.html",
        expected,
      ),
    ).toBe(false);
    expect(isTrustedRendererUrl("https://example.com/", expected)).toBe(false);
  });

  it("normalizes equivalent development URLs", () => {
    expect(isTrustedRendererUrl("http://localhost:5173", "http://localhost:5173/")).toBe(true);
    expect(isTrustedRendererUrl("not a URL", "http://localhost:5173/")).toBe(false);
  });
});
