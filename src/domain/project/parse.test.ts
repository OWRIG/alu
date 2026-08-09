import { describe, expect, it } from "vitest";

import { DomainError } from "./error";
import { parseProjectDocument, parseProjectJson, serializeProject } from "./parse";
import { loadOverbedFixture } from "../../test-support/fixture";

describe("project file schema", () => {
  it("C-save-reopen-roundtrip preserves the canonical project", () => {
    const project = loadOverbedFixture();
    const serialized = serializeProject(project);
    expect(parseProjectJson(serialized)).toEqual(project);
    expect(serialized.endsWith("\n")).toBe(true);
  });

  it("C-import-schema-validation rejects unknown top-level fields", () => {
    const project = loadOverbedFixture();
    expect(() => parseProjectDocument({ ...project, surprise: true })).toThrowError(
      expect.objectContaining<Partial<DomainError>>({ code: "schema.invalid" }),
    );
  });

  it("rejects object-prototype keys as entity IDs", () => {
    const project = loadOverbedFixture();
    expect(() => parseProjectDocument({ ...project, projectId: "__proto__" })).toThrowError(
      expect.objectContaining<Partial<DomainError>>({ code: "schema.invalid" }),
    );
  });

  it("C-import-unknown-version rejects newer documents", () => {
    const project = loadOverbedFixture();
    expect(() => parseProjectDocument({ ...project, formatVersion: 2 })).toThrowError(
      expect.objectContaining<Partial<DomainError>>({ code: "schema.invalid" }),
    );
  });

  it("rejects a changed embedded definition", () => {
    const project = loadOverbedFixture();
    const key = Object.keys(project.embeddedParts)[0];
    const snapshot = project.embeddedParts[key];
    expect(() =>
      parseProjectDocument({
        ...project,
        embeddedParts: {
          ...project.embeddedParts,
          [key]: {
            ...snapshot,
            definition: { ...snapshot.definition, name: "tampered" },
          },
        },
      }),
    ).toThrowError(
      expect.objectContaining<Partial<DomainError>>({ code: "catalog.definition-hash-mismatch" }),
    );
  });
});
