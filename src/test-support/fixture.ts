import { readFileSync } from "node:fs";
import path from "node:path";

import { parseProjectDocument } from "../domain/project/parse";
import type { ProjectDocumentV1 } from "../domain/project/schema";

export function loadOverbedFixture(): ProjectDocumentV1 {
  const fixturePath = path.join(process.cwd(), "test/fixtures/mobile-overbed-table-v1/input.json");
  const input = JSON.parse(readFileSync(fixturePath, "utf8")) as { project: unknown };
  return parseProjectDocument(input.project);
}

export function loadOverbedExpected(): Record<string, unknown> {
  const fixturePath = path.join(
    process.cwd(),
    "test/fixtures/mobile-overbed-table-v1/expected.json",
  );
  return JSON.parse(readFileSync(fixturePath, "utf8")) as Record<string, unknown>;
}
