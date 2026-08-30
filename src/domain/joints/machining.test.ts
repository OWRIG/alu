import { describe, expect, it } from "vitest";

import { applyCommandEnvelope, createCommandEnvelope } from "../commands/apply";
import {
  createBlankProject,
  GENERIC_PROFILE_DEFINITIONS,
  snapshotDefinition,
} from "../project/defaults";
import { computeDesignHash } from "../project/hash";
import type { ProjectDocumentV1 } from "../project/schema";
import { deriveHardware, deriveMachining } from "./machining";

/**
 * A vertical upright at the origin and a horizontal beam whose end-A lands on
 * top of it — the most common corner in an extrusion frame.
 */
function frameWithTwoMembers(projectId: string): ProjectDocumentV1 {
  const blank = createBlankProject({ projectId, now: "2026-08-31T00:00:00.000Z" });
  const definition = GENERIC_PROFILE_DEFINITIONS[2]; // 40 x 40
  return applyCommandEnvelope(
    blank,
    createCommandEnvelope(blank, [
      {
        type: "profile.add",
        definitionSnapshot: snapshotDefinition(definition),
        profile: {
          id: "profile.upright",
          kind: "profile",
          definitionRef: { partId: definition.id, revision: definition.revision },
          origin: { x: 0, y: 0, z: 0 },
          axis: "z",
          lengthMm: 700,
          rotationAroundAxisDeg: 0,
          purpose: "upright",
          endCutA: { kind: "square" },
          endCutB: { kind: "square" },
        },
      },
      {
        type: "profile.add",
        definitionSnapshot: snapshotDefinition(definition),
        profile: {
          id: "profile.beam",
          kind: "profile",
          definitionRef: { partId: definition.id, revision: definition.revision },
          origin: { x: 0, y: 0, z: 700 },
          axis: "x",
          lengthMm: 1_200,
          rotationAroundAxisDeg: 0,
          purpose: "beam",
          endCutA: { kind: "square" },
          endCutB: { kind: "square" },
        },
      },
    ]),
  );
}

function addJoint(
  project: ProjectDocumentV1,
  patch: Partial<{
    id: string;
    jointType: "corner-bracket" | "hidden-connector" | "butt-screw";
    boltCount: 1 | 2;
    boltSizeMm: 5 | 6 | 8;
  }> = {},
): ProjectDocumentV1 {
  return applyCommandEnvelope(
    project,
    createCommandEnvelope(project, [
      {
        type: "joint.add",
        joint: {
          id: patch.id ?? "joint.corner",
          kind: "joint",
          jointType: patch.jointType ?? "hidden-connector",
          primary: { entityId: "profile.beam", end: "a" },
          secondaryEntityId: "profile.upright",
          boltSizeMm: patch.boltSizeMm ?? 8,
          boltCount: patch.boltCount ?? 2,
        },
      },
    ]),
  );
}

describe("joints and derived machining", () => {
  it("C-joint-explicit-not-inferred derives nothing from touching members alone", () => {
    const project = frameWithTwoMembers("project.no-joint");
    expect(project.joints).toBeUndefined();
    expect(deriveMachining(project)).toEqual([]);
    expect(deriveHardware(project)).toEqual([]);
  });

  it("C-bracket-needs-no-machining derives hardware but no holes for a corner bracket", () => {
    const project = addJoint(frameWithTwoMembers("project.bracket"), {
      jointType: "corner-bracket",
    });

    expect(deriveMachining(project)).toEqual([]);
    const hardware = deriveHardware(project);
    expect(hardware.map((line) => line.item)).toEqual(["corner-bracket", "t-nut", "bolt"]);
    expect(hardware.every((line) => line.sku === null)).toBe(true);
  });

  it("C-hidden-connector-machining taps the beam end and opens the upright side", () => {
    const project = addJoint(frameWithTwoMembers("project.hidden"), {
      jointType: "hidden-connector",
      boltCount: 2,
    });
    const ops = deriveMachining(project);

    const taps = ops.filter((op) => op.kind === "tap");
    const access = ops.filter((op) => op.kind === "through-hole");
    expect(taps).toHaveLength(2);
    expect(access).toHaveLength(2);
    expect(taps.every((op) => op.entityId === "profile.beam")).toBe(true);
    expect(access.every((op) => op.entityId === "profile.upright")).toBe(true);
    // The beam runs along +X and its end A is the low-X end, so its end face
    // points at -X.
    expect(taps.every((op) => op.face === "-x")).toBe(true);
    expect(ops.every((op) => op.sourceJointId === "joint.corner")).toBe(true);
  });

  it("C-machining-diameters-from-standard uses ISO tapping and clearance drills", () => {
    const sizes = [5, 6, 8] as const;
    const expected = { 5: [4.2, 5.5], 6: [5, 6.6], 8: [6.8, 9] } as const;

    for (const boltSizeMm of sizes) {
      const project = addJoint(frameWithTwoMembers(`project.iso-${boltSizeMm}`), {
        jointType: "butt-screw",
        boltSizeMm,
        boltCount: 1,
      });
      const ops = deriveMachining(project);
      const tap = ops.find((op) => op.kind === "tap");
      const clearance = ops.find((op) => op.kind === "through-hole");

      expect(tap?.diameterMm).toBe(expected[boltSizeMm][0]);
      expect(clearance?.diameterMm).toBe(expected[boltSizeMm][1]);
      expect(tap?.depthMm).toBe(Math.ceil(boltSizeMm * 2.5));
      expect(clearance?.depthMm).toBeNull();
      expect(ops.every((op) => op.evidence.kind === "standard")).toBe(true);
    }
  });

  it("C-machining-position-from-geometry moves holes when the geometry moves", () => {
    const base = addJoint(frameWithTwoMembers("project.geometry"));
    const before = deriveMachining(base).find((op) => op.kind === "tap");

    const moved = applyCommandEnvelope(
      base,
      createCommandEnvelope(base, [
        {
          type: "profile.update",
          entityId: "profile.beam",
          patch: { origin: { x: 0, y: 0, z: 900 } },
        },
      ]),
    );
    const after = deriveMachining(moved).find((op) => op.kind === "tap");

    expect(before?.positionMm.z).toBe(700);
    expect(after?.positionMm.z).toBe(900);
  });

  it("C-machining-single-source keeps holes out of the profile entities", () => {
    const project = addJoint(frameWithTwoMembers("project.single-source"));
    const serialized = JSON.stringify(project.entities);

    expect(serialized).not.toContain("diameterMm");
    expect(serialized).not.toContain("machining");
    expect(deriveMachining(project).length).toBeGreaterThan(0);
  });

  it("C-hardware-bom-aggregation counts bolts per joint", () => {
    const project = addJoint(frameWithTwoMembers("project.hardware"), { boltCount: 2 });
    const bolts = deriveHardware(project).find((line) => line.item === "bolt");

    expect(bolts?.quantity).toBe(2);
    expect(bolts?.specification).toContain("M8");
  });

  it("C-joint-design-hash changes the design hash when a joint is added", () => {
    const base = frameWithTwoMembers("project.hash");
    const withJoint = addJoint(base);

    expect(computeDesignHash(withJoint)).not.toBe(computeDesignHash(base));
  });

  it("C-joint-validates-refs rejects unknown members, self joints and duplicates", () => {
    const project = frameWithTwoMembers("project.validation");

    const badRef = () =>
      applyCommandEnvelope(
        project,
        createCommandEnvelope(project, [
          {
            type: "joint.add",
            joint: {
              id: "joint.bad",
              kind: "joint",
              jointType: "corner-bracket",
              primary: { entityId: "profile.missing", end: "a" },
              secondaryEntityId: "profile.upright",
              boltSizeMm: 8,
              boltCount: 2,
            },
          },
        ]),
      );
    expect(badRef).toThrowError(
      expect.objectContaining({ code: "ref.entity-missing" }) as unknown as Error,
    );

    const selfJoint = () =>
      applyCommandEnvelope(
        project,
        createCommandEnvelope(project, [
          {
            type: "joint.add",
            joint: {
              id: "joint.self",
              kind: "joint",
              jointType: "corner-bracket",
              primary: { entityId: "profile.beam", end: "a" },
              secondaryEntityId: "profile.beam",
              boltSizeMm: 8,
              boltCount: 2,
            },
          },
        ]),
      );
    expect(selfJoint).toThrowError(
      expect.objectContaining({ code: "joint.self-reference" }) as unknown as Error,
    );

    const withJoint = addJoint(project);
    const duplicate = () =>
      applyCommandEnvelope(
        withJoint,
        createCommandEnvelope(withJoint, [
          {
            type: "joint.add",
            joint: {
              id: "joint.duplicate",
              kind: "joint",
              jointType: "corner-bracket",
              primary: { entityId: "profile.beam", end: "a" },
              secondaryEntityId: "profile.upright",
              boltSizeMm: 8,
              boltCount: 2,
            },
          },
        ]),
      );
    expect(duplicate).toThrowError(
      expect.objectContaining({ code: "joint.end-already-connected" }) as unknown as Error,
    );
  });

  it("C-joint-removed-with-member drops joints that reference a deleted member", () => {
    const project = addJoint(frameWithTwoMembers("project.cascade"));
    expect(Object.keys(project.joints ?? {})).toEqual(["joint.corner"]);

    const removed = applyCommandEnvelope(
      project,
      createCommandEnvelope(project, [{ type: "entity.remove", entityId: "profile.upright" }]),
    );

    expect(removed.joints ?? {}).toEqual({});
    expect(deriveMachining(removed)).toEqual([]);
  });
});
