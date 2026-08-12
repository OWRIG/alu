import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { writeOutputFileAtomic } from "./output-file";

describe("output file", () => {
  it("atomically replaces an explicitly named report", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "alu-output-"));
    const outputPath = path.join(directory, "handoff.md");
    try {
      await writeOutputFileAtomic(outputPath, "first\n");
      await writeOutputFileAtomic(outputPath, "second\n");
      await expect(readFile(outputPath, "utf8")).resolves.toBe("second\n");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
