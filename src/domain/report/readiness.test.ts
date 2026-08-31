import { describe, expect, it } from "vitest";

import { applyCommandEnvelope, createCommandEnvelope } from "../commands/apply";
import {
  createBlankProject,
  createParametricClearanceFrameDemo,
  GENERIC_PROFILE_DEFINITIONS,
  snapshotDefinition,
} from "../project/defaults";
import { evaluateOrderReadiness, ORDER_READINESS_STEPS } from "./readiness";

function readinessById(project: Parameters<typeof evaluateOrderReadiness>[0]) {
  return Object.fromEntries(evaluateOrderReadiness(project).map((step) => [step.id, step.ready]));
}

/** Two members whose four ends are all consumed by joints. */
function twoMembersFullyJointed(projectId: string) {
  const blank = createBlankProject({ projectId, now: "2026-08-31T00:00:00.000Z" });
  const definition = GENERIC_PROFILE_DEFINITIONS[2];
  const member = (id: string, axis: "x" | "z") => ({
    type: "profile.add" as const,
    definitionSnapshot: snapshotDefinition(definition),
    profile: {
      id,
      kind: "profile" as const,
      definitionRef: { partId: definition.id, revision: definition.revision },
      origin: { x: 0, y: 0, z: 0 },
      axis,
      lengthMm: 600,
      rotationAroundAxisDeg: 0 as const,
      purpose: id,
      endCutA: { kind: "square" as const },
      endCutB: { kind: "square" as const },
    },
  });
  const withMembers = applyCommandEnvelope(
    blank,
    createCommandEnvelope(blank, [member("profile.one", "x"), member("profile.two", "z")]),
  );
  return applyCommandEnvelope(
    withMembers,
    createCommandEnvelope(
      withMembers,
      (
        [
          ["joint.one-a", "profile.one", "a", "profile.two"],
          ["joint.one-b", "profile.one", "b", "profile.two"],
          ["joint.two-a", "profile.two", "a", "profile.one"],
          ["joint.two-b", "profile.two", "b", "profile.one"],
        ] as const
      ).map(([id, entityId, end, secondaryEntityId]) => ({
        type: "joint.add" as const,
        joint: {
          id,
          kind: "joint" as const,
          jointType: "corner-bracket" as const,
          primary: { entityId, end },
          secondaryEntityId,
          boltSizeMm: 8 as const,
          boltCount: 2 as const,
        },
      })),
    ),
  );
}

describe("order readiness", () => {
  it("C-readiness-counts-five-steps always reports the same five steps", () => {
    const steps = evaluateOrderReadiness(createBlankProject({ projectId: "project.readiness" }));
    expect(steps.map((step) => step.id)).toEqual([...ORDER_READINESS_STEPS]);
    expect(steps).toHaveLength(5);
  });

  it("C-readiness-derived-not-hardcoded leaves an empty project with nothing ready", () => {
    const project = createBlankProject({ projectId: "project.readiness-empty" });
    expect(readinessById(project).profiles).toBe(false);
  });

  it("C-readiness-derived-not-hardcoded treats a concept envelope as not orderable", () => {
    const blank = createBlankProject({ projectId: "project.readiness-concept" });
    const definition = GENERIC_PROFILE_DEFINITIONS[2];
    const project = applyCommandEnvelope(
      blank,
      createCommandEnvelope(blank, [
        {
          type: "profile.add",
          definitionSnapshot: snapshotDefinition(definition),
          profile: {
            id: "profile.only",
            kind: "profile",
            definitionRef: { partId: definition.id, revision: definition.revision },
            origin: { x: 0, y: 0, z: 0 },
            axis: "x",
            lengthMm: 500,
            rotationAroundAxisDeg: 0,
            purpose: "only",
            endCutA: { kind: "square" },
            endCutB: { kind: "square" },
          },
        },
      ]),
    );

    // A concept envelope has no vendor SKU, so it cannot be ordered.
    expect(readinessById(project).profiles).toBe(false);
  });

  it("C-readiness-derived-not-hardcoded marks profiles ready once every member carries a SKU", () => {
    const demo = createParametricClearanceFrameDemo({ projectId: "project.readiness-demo" });
    expect(readinessById(demo).profiles).toBe(false);

    const applied = applyCommandEnvelope(
      demo,
      createCommandEnvelope(demo, [{ type: "structural-sizing.selection.apply" }]),
    );
    // Only the two main beams start as concept envelopes; the rest already carry
    // JLCFA SKUs, so applying the selection makes every member orderable.
    expect(readinessById(applied).profiles).toBe(true);
  });

  it("C-readiness-counts-five-steps keeps unmodelled steps pending with a reason", () => {
    const steps = evaluateOrderReadiness(
      createBlankProject({ projectId: "project.readiness-why" }),
    );
    const byId = Object.fromEntries(steps.map((step) => [step.id, step]));

    expect(steps.every((step) => step.ready === false)).toBe(true);
    // Connectors and machining are modelled now, so they report what is missing
    // rather than that the app cannot express them at all.
    expect(byId.connectors.reason).toBe("no-joints");
    expect(byId.machining.reason).toBe("no-joints");
    expect(byId.panels.reason).toBe("not-modelled");
    expect(byId.casters.reason).toBe("not-modelled");
  });

  it("C-readiness-connectors turns ready once every member end carries a joint", () => {
    const project = twoMembersFullyJointed("project.readiness-connectors");
    const byId = Object.fromEntries(
      evaluateOrderReadiness(project).map((step) => [step.id, step.ready]),
    );

    expect(byId.connectors).toBe(true);
    expect(byId.machining).toBe(true);
  });
});
