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
import { evaluateRules } from "../rules/evaluate";
import { loadOverbedFixture } from "../../test-support/fixture";
import { applyCommandEnvelope, createCommandEnvelope } from "./apply";

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
      loads: { centerPointPayloadKg: 20, distributedPayloadKg: 30 },
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

    expect(values.uprightLength).toBe(570);
    expect(values.baseRailCenterZ).toBe(120);
    expect(values.topBeamCenterZ).toBe(710);
    expect(next.entities["profile.upright-left-front"]).toMatchObject({
      origin: { z: 100 },
      lengthMm: 570,
    });
    expect(next.entities["profile.base-left"].origin.z).toBe(120);
    expect(next.entities["profile.top-front"].origin.z).toBe(710);
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
      vendor: "MISUMI",
      sku: "NFSL8-4080",
    });
    expect(snapshot.definition.section).toMatchObject({ envelopeUMm: 40, envelopeVMm: 80 });
    expect(next.entities["profile.top-rear"].definitionRef).toEqual(front.definitionRef);
    expect(beamLine?.definitionName).toBe("MISUMI NFSL8-4080");
  });
});
