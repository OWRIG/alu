import { describe, expect, it } from "vitest";

import { deriveProfileBom } from "../bom/derive";
import { evaluateParameters } from "../params/evaluate";
import {
  createBlankProject,
  createParametricClearanceFrameDemo,
  GENERIC_PROFILE_DEFINITIONS,
  snapshotDefinition,
} from "../project/defaults";
import { DomainError } from "../project/error";
import { computeDesignHash } from "../project/hash";
import { evaluateRules } from "../rules/evaluate";
import { loadOverbedFixture } from "../../test-support/fixture";
import { evaluateStructuralSizing } from "../structural/evaluate";
import { applyCommandEnvelope, createCommandEnvelope } from "./apply";
import type { DomainCommand } from "./schema";

describe("domain commands", () => {
  it("C-add-profile and C-profile-axis-orientation create one explicit model entity", () => {
    const project = createBlankProject({
      projectId: "project.add-profile",
      now: "2026-08-09T00:00:00.000Z",
    });
    const definition = GENERIC_PROFILE_DEFINITIONS[2];
    const added = applyCommandEnvelope(
      project,
      createCommandEnvelope(
        project,
        [
          {
            type: "profile.add",
            definitionSnapshot: snapshotDefinition(definition),
            profile: {
              id: "profile.test-member",
              kind: "profile",
              definitionRef: { partId: definition.id, revision: definition.revision },
              origin: { x: 10.126, y: 20, z: 30 },
              axis: "y",
              lengthMm: 600.126,
              rotationAroundAxisDeg: 90,
              purpose: "test-member",
              endCutA: { kind: "square" },
              endCutB: { kind: "square" },
            },
          },
        ],
        "command.add-profile",
      ),
    );

    expect(added.entities["profile.test-member"]).toMatchObject({
      axis: "y",
      lengthMm: 600.13,
      origin: { x: 10.13, y: 20, z: 30 },
      rotationAroundAxisDeg: 90,
    });
    expect(deriveProfileBom(added).lines[0]).toMatchObject({ lengthMm: 600.13, quantity: 1 });

    const removed = applyCommandEnvelope(
      added,
      createCommandEnvelope(
        added,
        [{ type: "entity.remove", entityId: "profile.test-member" }],
        "command.remove-profile",
      ),
    );
    expect(removed.entities).toEqual({});
    expect(removed.embeddedParts).toEqual({});
  });

  it("C-invalid-profile-length rejects zero without changing the project", () => {
    const project = loadOverbedFixture();
    expect(() =>
      applyCommandEnvelope(project, {
        commandVersion: 1,
        commandId: "command.invalid-length",
        expectedProjectRevision: project.revision,
        expectedDesignHash: computeDesignHash(project),
        commands: [
          {
            type: "profile.update",
            entityId: "profile.top-front",
            patch: { lengthMm: 0 },
          },
        ],
      } as never),
    ).toThrowError(
      expect.objectContaining<Partial<DomainError>>({ code: "command.schema-invalid" }),
    );
    expect(project.entities["profile.top-front"].lengthMm).toBe(2230);
  });

  it("C-param-binding-sync updates derived fields as one revision", () => {
    const project = loadOverbedFixture();
    const next = applyCommandEnvelope(
      project,
      createCommandEnvelope(
        project,
        [{ type: "parameters.set", values: { bedOuterWidth: 2200 } }],
        "command.binding-sync",
      ),
    );
    expect(next.revision).toBe(project.revision + 1);
    expect(next.entities["profile.top-front"].lengthMm).toBe(2330);
    expect(next.entities["profile.top-rear"].lengthMm).toBe(2330);
    expect(deriveProfileBom(next).lines).toEqual([
      expect.objectContaining({ lengthMm: 2330, quantity: 2 }),
    ]);
  });

  it("C-param-manual-override-stale preserves a manual override", () => {
    const project = loadOverbedFixture();
    const overridden = applyCommandEnvelope(
      project,
      createCommandEnvelope(
        project,
        [
          {
            type: "profile.update",
            entityId: "profile.top-front",
            patch: { lengthMm: 2222 },
          },
        ],
        "command.override",
      ),
    );
    const next = applyCommandEnvelope(
      overridden,
      createCommandEnvelope(
        overridden,
        [{ type: "parameters.set", values: { bedOuterWidth: 2200 } }],
        "command.parameter-after-override",
      ),
    );
    expect(next.entities["profile.top-front"].lengthMm).toBe(2222);
    expect(next.entities["profile.top-rear"].lengthMm).toBe(2330);
    expect(
      evaluateRules(next).some((finding) => finding.ruleId === "dimension.parameter-binding-stale"),
    ).toBe(true);
  });

  it("resynchronizes a stale binding", () => {
    const project = loadOverbedFixture();
    const overridden = applyCommandEnvelope(
      project,
      createCommandEnvelope(
        project,
        [
          {
            type: "profile.update",
            entityId: "profile.top-front",
            patch: { lengthMm: 2000 },
          },
        ],
        "command.override-for-resync",
      ),
    );
    const resynced = applyCommandEnvelope(
      overridden,
      createCommandEnvelope(
        overridden,
        [{ type: "binding.resync", entityId: "profile.top-front", field: "lengthMm" }],
        "command.resync",
      ),
    );
    expect(resynced.entities["profile.top-front"].lengthMm).toBe(2230);
  });

  it("C-agent-command-batch-atomic leaves the input untouched on failure", () => {
    const project = loadOverbedFixture();
    expect(() =>
      applyCommandEnvelope(
        project,
        createCommandEnvelope(
          project,
          [
            {
              type: "profile.update",
              entityId: "profile.top-front",
              patch: { lengthMm: 2000 },
            },
            { type: "entity.remove", entityId: "profile.missing" },
          ],
          "command.atomic",
        ),
      ),
    ).toThrowError(expect.objectContaining<Partial<DomainError>>({ code: "ref.entity-missing" }));
    expect(project.entities["profile.top-front"].lengthMm).toBe(2230);
    expect(project.revision).toBe(0);
  });

  it("rejects stale revisions instead of silently retrying", () => {
    const project = loadOverbedFixture();
    const envelope = createCommandEnvelope(
      project,
      [{ type: "parameters.set", values: { bedOuterWidth: 2200 } }],
      "command.retry",
    );
    const next = applyCommandEnvelope(project, envelope);
    expect(() => applyCommandEnvelope(next, envelope)).toThrowError(
      expect.objectContaining<Partial<DomainError>>({ code: "revision.conflict" }),
    );
  });

  it("rejects same-revision content drift by design hash", () => {
    const project = loadOverbedFixture();
    const envelope = createCommandEnvelope(
      project,
      [{ type: "parameters.set", values: { bedOuterWidth: 2200 } }],
      "command.design-conflict",
    );
    const drifted = {
      ...project,
      context: { ...project.context, notes: "changed without incrementing revision" },
    };

    expect(() => applyCommandEnvelope(drifted, envelope)).toThrowError(
      expect.objectContaining<Partial<DomainError>>({ code: "design.conflict" }),
    );
  });

  it("C-sizing-load-edit updates a structured load input atomically", () => {
    const project = createParametricClearanceFrameDemo();
    const next = applyCommandEnvelope(
      project,
      createCommandEnvelope(
        project,
        [
          {
            type: "structural-sizing.loads.set",
            patch: { centerPointPayloadKg: 20 },
          },
        ],
        "command.structural-load",
      ),
    );

    expect(next.revision).toBe(project.revision + 1);
    expect(next.extensions?.structuralSizing).toMatchObject({
      loads: { centerPointPayloadKg: 20, distributedPayloadKg: 15 },
    });
  });

  it("C-parameter-definition-authoring creates inputs and linear derived parameters", () => {
    const project = createBlankProject();
    const withInput = applyCommandEnvelope(
      project,
      createCommandEnvelope(project, [
        {
          type: "parameter.input.upsert",
          id: "clearWidth",
          definition: { valueMm: 1200, label: "Clear width", boundaryKind: "inner-clear" },
        },
      ]),
    );
    const withDerived = applyCommandEnvelope(
      withInput,
      createCommandEnvelope(withInput, [
        {
          type: "parameter.derived.upsert",
          id: "outerWidth",
          definition: {
            label: "Outer width",
            terms: [{ param: "clearWidth", coef: 1 }],
            constantMm: 80,
          },
        },
      ]),
    );

    expect(evaluateParameters(withDerived.parameters)).toMatchObject({
      clearWidth: 1200,
      outerWidth: 1280,
    });
  });

  it("C-parameter-remove-reference-safe refuses implicit cascading deletion", () => {
    const project = createParametricClearanceFrameDemo();
    expect(() =>
      applyCommandEnvelope(
        project,
        createCommandEnvelope(project, [{ type: "parameter.remove", id: "obstacleOuterWidth" }]),
      ),
    ).toThrowError(
      expect.objectContaining<Partial<DomainError>>({ code: "dimension.parameter-in-use" }),
    );
  });

  it("C-caster-height-in-vertical-chain keeps the top fixed and moves the floor interface", () => {
    const project = createParametricClearanceFrameDemo();
    const next = applyCommandEnvelope(
      project,
      createCommandEnvelope(project, [
        { type: "parameters.set", values: { casterInstalledHeight: 100 } },
      ]),
    );
    const values = evaluateParameters(next.parameters);

    expect(values.uprightLength).toBe(613);
    expect(values.uprightStartZ).toBe(130);
    expect(values.baseRailCenterZ).toBe(115);
    expect(values.topBeamCenterZ).toBe(788);
    expect(next.entities["profile.upright-left-front"]).toMatchObject({
      origin: { z: 130 },
      lengthMm: 613,
    });
    expect(next.entities["profile.base-left"].origin.z).toBe(115);
    expect(next.entities["profile.top-front"].origin.z).toBe(788);
  });

  it("C-sizing-apply-to-model-and-bom writes the selected SKU into the design truth", () => {
    const project = createParametricClearanceFrameDemo();
    const next = applyCommandEnvelope(
      project,
      createCommandEnvelope(project, [{ type: "structural-sizing.selection.apply" }]),
    );
    const front = next.entities["profile.top-front"];
    const snapshot =
      next.embeddedParts[`${front.definitionRef.partId}@${front.definitionRef.revision}`];
    const beamLine = deriveProfileBom(next).lines.find((line) =>
      line.sourceEntityIds.includes("profile.top-front"),
    );

    expect(snapshot.definition.procurement).toMatchObject({
      vendor: "JLCFA",
      sku: "TXCK-H6-J3090",
    });
    expect(snapshot.definition.section).toMatchObject({ envelopeUMm: 30, envelopeVMm: 90 });
    expect(next.entities["profile.top-rear"].definitionRef).toEqual(front.definitionRef);
    expect(beamLine?.definitionName).toBe("JLCFA TXCK-H6-J3090");
  });

  it("C-definition-picker-blank-project switches a member to another profile definition", () => {
    const project = seedProfile("project.definition-picker");
    const target = GENERIC_PROFILE_DEFINITIONS[3];
    const next = applyCommandEnvelope(
      project,
      createCommandEnvelope(project, [
        {
          type: "profile.set-definition",
          entityId: "profile.seed",
          definitionSnapshot: snapshotDefinition(target),
        },
      ]),
    );

    expect(next.entities["profile.seed"].definitionRef).toEqual({
      partId: target.id,
      revision: target.revision,
    });
    expect(next.embeddedParts[`${target.id}@${target.revision}`].definition.section).toMatchObject({
      envelopeUMm: 40,
      envelopeVMm: 80,
    });
    expect(deriveProfileBom(next).lines[0].definitionName).toBe(target.name);
    expect(next.revision).toBe(project.revision + 1);
  });

  it("C-definition-snapshot-integrity drops the definition no member references any more", () => {
    const project = seedProfile("project.definition-prune");
    const previous = GENERIC_PROFILE_DEFINITIONS[2];
    const target = GENERIC_PROFILE_DEFINITIONS[0];
    const next = applyCommandEnvelope(
      project,
      createCommandEnvelope(project, [
        {
          type: "profile.set-definition",
          entityId: "profile.seed",
          definitionSnapshot: snapshotDefinition(target),
        },
      ]),
    );

    expect(Object.keys(next.embeddedParts)).toEqual([`${target.id}@${target.revision}`]);
    expect(next.embeddedParts[`${previous.id}@${previous.revision}`]).toBeUndefined();
  });

  it("C-definition-snapshot-integrity rejects a snapshot whose hash does not match", () => {
    const project = seedProfile("project.definition-hash");
    const target = GENERIC_PROFILE_DEFINITIONS[1];

    expect(() =>
      applyCommandEnvelope(
        project,
        createCommandEnvelope(project, [
          {
            type: "profile.set-definition",
            entityId: "profile.seed",
            definitionSnapshot: {
              definition: target,
              definitionHash: "0".repeat(64),
            },
          },
        ]),
      ),
    ).toThrowError(
      expect.objectContaining({ code: "catalog.definition-hash-mismatch" }) as unknown as Error,
    );
  });

  it("C-study-create-blank-project builds a usable study from four decisions", () => {
    const project = seedSizableProject("project.study-create");
    const next = applyCommandEnvelope(
      project,
      createCommandEnvelope(project, [
        {
          type: "structural-sizing.study.create",
          beamEntityIds: ["profile.beam-a", "profile.beam-b"],
          effectiveSpanParam: "span",
          maximumSectionHeightParam: "maxHeight",
          requiredCompatibilityGroup: null,
        },
      ]),
    );

    const result = evaluateStructuralSizing(next);
    expect(result).not.toBeNull();
    expect(result?.study.beamCount).toBe(2);
    expect(result?.study.loads).toMatchObject({
      panelMassKg: 0,
      distributedPayloadKg: 0,
      centerPointPayloadKg: 0,
      distributedLoadSharePerBeam: 0.5,
    });
    expect(result?.study.constructionEvidence).toEqual([]);
    expect(result?.candidates.length).toBeGreaterThan(0);
    expect(result?.selected).not.toBeNull();
  });

  it("C-study-create-rejects-duplicate leaves an existing study untouched", () => {
    const project = createParametricClearanceFrameDemo();

    expect(() =>
      applyCommandEnvelope(
        project,
        createCommandEnvelope(project, [
          {
            type: "structural-sizing.study.create",
            beamEntityIds: ["profile.top-front"],
            effectiveSpanParam: "topBeamEffectiveSpan",
            maximumSectionHeightParam: "topBeamMaximumHeight",
            requiredCompatibilityGroup: null,
          },
        ]),
      ),
    ).toThrowError(
      expect.objectContaining({ code: "structure.sizing-study-exists" }) as unknown as Error,
    );
  });

  it("C-study-create-validates-refs rejects unknown members and parameters", () => {
    const project = seedSizableProject("project.study-refs");

    expect(() =>
      applyCommandEnvelope(
        project,
        createCommandEnvelope(project, [
          {
            type: "structural-sizing.study.create",
            beamEntityIds: ["profile.missing"],
            effectiveSpanParam: "span",
            maximumSectionHeightParam: "maxHeight",
            requiredCompatibilityGroup: null,
          },
        ]),
      ),
    ).toThrowError(expect.objectContaining({ code: "ref.entity-missing" }) as unknown as Error);

    expect(() =>
      applyCommandEnvelope(
        project,
        createCommandEnvelope(project, [
          {
            type: "structural-sizing.study.create",
            beamEntityIds: ["profile.beam-a"],
            effectiveSpanParam: "nope",
            maximumSectionHeightParam: "maxHeight",
            requiredCompatibilityGroup: null,
          },
        ]),
      ),
    ).toThrowError(expect.objectContaining({ code: "ref.parameter-missing" }) as unknown as Error);
  });

  it("C-context-editable-from-ui turns caster rules on and off through context.set", () => {
    const project = seedProfile("project.context-toggle");
    expect(project.context.mobility).toBe("unknown");
    expect(ruleIds(project)).not.toContain("structure.mobile-side-sway");

    const mobile = applyCommandEnvelope(
      project,
      createCommandEnvelope(project, [{ type: "context.set", patch: { mobility: "casters" } }]),
    );
    expect(ruleIds(mobile)).toContain("structure.mobile-side-sway");

    const parked = applyCommandEnvelope(
      mobile,
      createCommandEnvelope(mobile, [{ type: "context.set", patch: { mobility: "static" } }]),
    );
    expect(ruleIds(parked)).not.toContain("structure.mobile-side-sway");
  });

  it("C-context-set-rejects-empty-patch keeps the project unchanged", () => {
    const project = seedProfile("project.context-empty");

    expect(() =>
      applyCommandEnvelope(
        project,
        createCommandEnvelope(project, [
          { type: "context.set", patch: {} } as unknown as DomainCommand,
        ]),
      ),
    ).toThrowError(expect.objectContaining({ code: "command.schema-invalid" }) as unknown as Error);
  });

  it("C-human-load-rule-reachable makes the human-load review reachable from the UI", () => {
    const project = seedProfile("project.human-load");
    expect(ruleIds(project)).not.toContain("safety.human-load-review");

    const next = applyCommandEnvelope(
      project,
      createCommandEnvelope(project, [{ type: "context.set", patch: { humanLoad: true } }]),
    );
    expect(ruleIds(next)).toContain("safety.human-load-review");
  });

  it("C-cable-rule-removed no longer fires on free-text load descriptions", () => {
    const project = seedProfile("project.cable");
    const next = applyCommandEnvelope(
      project,
      createCommandEnvelope(project, [
        { type: "context.set", patch: { mobility: "casters", loads: ["投影仪"] } },
      ]),
    );

    expect(ruleIds(next)).not.toContain("motion.cable-routing-safe");
  });
});

function seedProfile(projectId: string) {
  const project = createBlankProject({ projectId, now: "2026-08-30T00:00:00.000Z" });
  const definition = GENERIC_PROFILE_DEFINITIONS[2];
  return applyCommandEnvelope(
    project,
    createCommandEnvelope(project, [
      {
        type: "profile.add",
        definitionSnapshot: snapshotDefinition(definition),
        profile: {
          id: "profile.seed",
          kind: "profile",
          definitionRef: { partId: definition.id, revision: definition.revision },
          origin: { x: 0, y: 0, z: 0 },
          axis: "x",
          lengthMm: 800,
          rotationAroundAxisDeg: 0,
          purpose: "seed",
          endCutA: { kind: "square" },
          endCutB: { kind: "square" },
        },
      },
    ]),
  );
}

function seedSizableProject(projectId: string) {
  let project = createBlankProject({ projectId, now: "2026-08-30T00:00:00.000Z" });
  const definition = GENERIC_PROFILE_DEFINITIONS[3];
  project = applyCommandEnvelope(
    project,
    createCommandEnvelope(project, [
      {
        type: "parameter.input.upsert",
        id: "span",
        definition: { valueMm: 1_800, boundaryKind: "generic" },
      },
      {
        type: "parameter.input.upsert",
        id: "maxHeight",
        definition: { valueMm: 90, boundaryKind: "generic" },
      },
      ...(["profile.beam-a", "profile.beam-b"] as const).map((id) => ({
        type: "profile.add" as const,
        definitionSnapshot: snapshotDefinition(definition),
        profile: {
          id,
          kind: "profile" as const,
          definitionRef: { partId: definition.id, revision: definition.revision },
          origin: { x: 0, y: 0, z: 0 },
          axis: "x" as const,
          lengthMm: 1_800,
          rotationAroundAxisDeg: 0 as const,
          purpose: id,
          endCutA: { kind: "square" as const },
          endCutB: { kind: "square" as const },
        },
      })),
    ]),
  );
  return project;
}

function ruleIds(project: Parameters<typeof evaluateRules>[0]) {
  return evaluateRules(project).map((finding) => finding.ruleId);
}
