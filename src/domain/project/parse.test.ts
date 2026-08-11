import { describe, expect, it } from "vitest";

import { DomainError } from "./error";
import { parseProjectDocument, parseProjectJson, serializeProject } from "./parse";
import { loadOverbedFixture } from "../../test-support/fixture";
import { createParametricClearanceFrameDemo } from "./defaults";

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

  it("C-structural-study-portable validates and round-trips the sizing study", () => {
    const project = createParametricClearanceFrameDemo();
    const reopened = parseProjectJson(serializeProject(project));
    expect(reopened.extensions?.structuralSizing).toEqual(project.extensions?.structuralSizing);
  });

  it("rejects an invalid known structural-sizing extension", () => {
    const project = createParametricClearanceFrameDemo();
    expect(() =>
      parseProjectDocument({
        ...project,
        extensions: {
          ...project.extensions,
          structuralSizing: {
            ...(project.extensions?.structuralSizing as object),
            beamCount: 3,
          },
        },
      }),
    ).toThrowError(
      expect.objectContaining<Partial<DomainError>>({
        code: "structure.sizing-beam-count-mismatch",
      }),
    );
  });

  it("C-structural-study-open-evidence accepts empty field evidence and custom systems", () => {
    const project = createParametricClearanceFrameDemo();
    const structuralSizing = project.extensions?.structuralSizing as Record<string, unknown>;
    const reopened = parseProjectDocument({
      ...project,
      extensions: {
        ...project.extensions,
        structuralSizing: {
          ...structuralSizing,
          requiredCompatibilityGroup: "vendor.custom-slot-10",
          constructionEvidence: [],
          scope: "custom.bridge-frame",
          assumptionIds: ["user.verified-support-model"],
        },
      },
    });

    expect(reopened.extensions?.structuralSizing).toMatchObject({
      requiredCompatibilityGroup: "vendor.custom-slot-10",
      constructionEvidence: [],
      scope: "custom.bridge-frame",
    });
  });
});
