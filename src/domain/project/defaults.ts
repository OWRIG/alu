import { computeDefinitionHash } from "./hash";
import type { EmbeddedProfileSnapshot, ProfileDefinition, ProjectDocumentV1 } from "./schema";
import { createDemoStructuralSizingStudy } from "../structural/catalog";

function makeGenericDefinition(
  id: string,
  name: string,
  envelopeUMm: number,
  envelopeVMm: number,
): ProfileDefinition {
  return {
    id,
    revision: "1",
    kind: "profile",
    name,
    unit: "millimeter",
    section: {
      envelopeUMm,
      envelopeVMm,
      representation: "rectangular-envelope",
      referencePoint: "envelope-center",
    },
    evidence: [
      {
        kind: "field-guide",
        reference:
          "Generic section envelope for concept modeling only; verify the vendor catalog before procurement.",
        confidence: "low",
      },
    ],
  };
}

export const GENERIC_PROFILE_DEFINITIONS = [
  makeGenericDefinition("generic.profile.2020-envelope", "Concept 2020 Envelope", 20, 20),
  makeGenericDefinition("generic.profile.3030-envelope", "Concept 3030 Envelope", 30, 30),
  makeGenericDefinition("generic.profile.4040-envelope", "Concept 4040 Envelope", 40, 40),
  makeGenericDefinition("generic.profile.4080-envelope", "Concept 4080 Envelope", 40, 80),
] as const;

export function snapshotDefinition(definition: ProfileDefinition): EmbeddedProfileSnapshot {
  return { definition, definitionHash: computeDefinitionHash(definition) };
}

function newProjectMeta(name: string, now: string) {
  return { name, createdAt: now, updatedAt: now, appVersion: "0.2.0", units: "mm" as const };
}

export function createBlankProject(options?: {
  projectId?: string;
  now?: string;
  name?: string;
}): ProjectDocumentV1 {
  const now = options?.now ?? new Date().toISOString();
  return {
    formatVersion: 1,
    projectId: options?.projectId ?? `project.${globalThis.crypto.randomUUID()}`,
    revision: 0,
    meta: newProjectMeta(options?.name ?? "Untitled Project", now),
    context: {
      usage: [],
      humanLoad: "unknown",
      childAccess: "unknown",
      mobility: "unknown",
      floor: "unknown",
      loads: [],
    },
    parameters: { inputs: {}, derived: {} },
    bindings: [],
    entities: {},
    embeddedParts: {},
  };
}

export function createParametricClearanceFrameDemo(options?: {
  projectId?: string;
  now?: string;
}): ProjectDocumentV1 {
  const now = options?.now ?? new Date().toISOString();
  const topBeamDefinition = GENERIC_PROFILE_DEFINITIONS[3];
  const frameDefinition = GENERIC_PROFILE_DEFINITIONS[2];
  const topBeamSnapshot = snapshotDefinition(topBeamDefinition);
  const frameSnapshot = snapshotDefinition(frameDefinition);
  return {
    formatVersion: 1,
    projectId: options?.projectId ?? `project.${globalThis.crypto.randomUUID()}`,
    revision: 0,
    meta: newProjectMeta("Parametric Clearance Frame", now),
    context: {
      usage: ["clearance-frame"],
      humanLoad: false,
      childAccess: "unknown",
      mobility: "casters",
      floor: "wood",
      loads: ["laptop", "meal", "small-projector"],
      notes:
        "The 18 mm panel sits inside a four-sided top-frame pocket on continuous inner ledges or shelf supports. Its top face is flush with the profile and keeps a nominal 2 mm gap per side. Assemble and square the frame before measuring the final panel. The embedded beam study screens exact vendor SKUs for ideal-beam deflection only; joints, sway, tipping, casters, support interfaces, current catalog verification, and proof testing remain unresolved.",
    },
    parameters: {
      inputs: {
        obstacleOuterWidth: {
          valueMm: 2100,
          label: "Obstacle outer width",
          boundaryKind: "obstacle-outer",
        },
        obstacleTopHeight: {
          valueMm: 500,
          label: "Obstacle top height",
          boundaryKind: "height",
        },
        clearanceLeft: {
          valueMm: 25,
          label: "Left working clearance",
          boundaryKind: "clearance",
        },
        clearanceRight: {
          valueMm: 25,
          label: "Right working clearance",
          boundaryKind: "clearance",
        },
        uprightWidthX: {
          valueMm: 40,
          label: "Frame and upright width",
          boundaryKind: "generic",
        },
        topFrameHeight: {
          valueMm: 80,
          label: "Top-frame profile height",
          boundaryKind: "generic",
        },
        topFrameOuterDepth: {
          valueMm: 500,
          label: "Top-frame outer depth",
          boundaryKind: "frame-outer",
        },
        panelFitClearance: {
          valueMm: 2,
          label: "Panel gap per side",
          boundaryKind: "panel",
        },
        tabletopThickness: {
          valueMm: 18,
          label: "Panel thickness",
          boundaryKind: "panel",
        },
        finishedHeight: {
          valueMm: 750,
          label: "Finished surface height",
          boundaryKind: "height",
        },
      },
      derived: {
        innerClearWidth: {
          label: "Clear structural width",
          terms: [
            { param: "obstacleOuterWidth", coef: 1 },
            { param: "clearanceLeft", coef: 1 },
            { param: "clearanceRight", coef: 1 },
          ],
          constantMm: 0,
        },
        frameOuterWidth: {
          label: "Frame outer width",
          terms: [
            { param: "innerClearWidth", coef: 1 },
            { param: "uprightWidthX", coef: 2 },
          ],
          constantMm: 0,
        },
        topBeamEffectiveSpan: {
          label: "Top-beam effective support span",
          terms: [
            { param: "frameOuterWidth", coef: 1 },
            { param: "uprightWidthX", coef: -1 },
          ],
          constantMm: 0,
        },
        topFrameInnerWidth: {
          label: "Top-frame inner width",
          terms: [
            { param: "frameOuterWidth", coef: 1 },
            { param: "uprightWidthX", coef: -2 },
          ],
          constantMm: 0,
        },
        topFrameInnerDepth: {
          label: "Top-frame inner depth",
          terms: [
            { param: "topFrameOuterDepth", coef: 1 },
            { param: "uprightWidthX", coef: -2 },
          ],
          constantMm: 0,
        },
        tabletopWidth: {
          label: "Inset panel width",
          terms: [
            { param: "topFrameInnerWidth", coef: 1 },
            { param: "panelFitClearance", coef: -2 },
          ],
          constantMm: 0,
        },
        tabletopDepth: {
          label: "Inset panel depth",
          terms: [
            { param: "topFrameInnerDepth", coef: 1 },
            { param: "panelFitClearance", coef: -2 },
          ],
          constantMm: 0,
        },
        clearanceAboveObstacle: {
          label: "Panel underside above obstacle",
          terms: [
            { param: "finishedHeight", coef: 1 },
            { param: "tabletopThickness", coef: -1 },
            { param: "obstacleTopHeight", coef: -1 },
          ],
          constantMm: 0,
        },
        beamUndersideClearance: {
          label: "Clearance below main beam",
          terms: [
            { param: "finishedHeight", coef: 1 },
            { param: "topFrameHeight", coef: -1 },
            { param: "obstacleTopHeight", coef: -1 },
          ],
          constantMm: 0,
        },
        uprightLength: {
          label: "Upright cut length",
          terms: [
            { param: "finishedHeight", coef: 1 },
            { param: "topFrameHeight", coef: -1 },
          ],
          constantMm: 0,
        },
        topBeamCenterZ: {
          label: "Top-beam center height",
          terms: [
            { param: "uprightLength", coef: 1 },
            { param: "topFrameHeight", coef: 0.5 },
          ],
          constantMm: 0,
        },
        topSideRailCenterZ: {
          label: "Top side-rail center height",
          terms: [
            { param: "finishedHeight", coef: 1 },
            { param: "uprightWidthX", coef: -0.5 },
          ],
          constantMm: 0,
        },
        leftUprightCenterX: {
          label: "Left upright center X",
          terms: [{ param: "uprightWidthX", coef: 0.5 }],
          constantMm: 0,
        },
        rightUprightCenterX: {
          label: "Right upright center X",
          terms: [
            { param: "frameOuterWidth", coef: 1 },
            { param: "uprightWidthX", coef: -0.5 },
          ],
          constantMm: 0,
        },
        frontTopBeamCenterY: {
          label: "Front top-beam center Y",
          terms: [{ param: "uprightWidthX", coef: 0.5 }],
          constantMm: 0,
        },
        rearTopBeamCenterY: {
          label: "Rear top-beam center Y",
          terms: [
            { param: "topFrameOuterDepth", coef: 1 },
            { param: "uprightWidthX", coef: -0.5 },
          ],
          constantMm: 0,
        },
        frontUprightCenterY: {
          label: "Front upright center Y",
          terms: [{ param: "uprightWidthX", coef: 0.5 }],
          constantMm: 0,
        },
        rearUprightCenterY: {
          label: "Rear upright center Y",
          terms: [
            { param: "topFrameOuterDepth", coef: 1 },
            { param: "uprightWidthX", coef: -0.5 },
          ],
          constantMm: 0,
        },
        topSideRailStartY: {
          label: "Top side-rail start Y",
          terms: [{ param: "uprightWidthX", coef: 1 }],
          constantMm: 0,
        },
        baseRailCenterZ: {
          label: "Base side-rail center height",
          terms: [{ param: "uprightWidthX", coef: 0.5 }],
          constantMm: 0,
        },
      },
    },
    bindings: [
      { entityId: "profile.top-front", field: "lengthMm", param: "frameOuterWidth" },
      { entityId: "profile.top-rear", field: "lengthMm", param: "frameOuterWidth" },
      { entityId: "profile.top-front", field: "origin.z", param: "topBeamCenterZ" },
      { entityId: "profile.top-rear", field: "origin.z", param: "topBeamCenterZ" },
      { entityId: "profile.top-front", field: "origin.y", param: "frontTopBeamCenterY" },
      { entityId: "profile.top-rear", field: "origin.y", param: "rearTopBeamCenterY" },
      { entityId: "profile.top-side-left", field: "lengthMm", param: "topFrameInnerDepth" },
      { entityId: "profile.top-side-right", field: "lengthMm", param: "topFrameInnerDepth" },
      { entityId: "profile.top-side-left", field: "origin.x", param: "leftUprightCenterX" },
      { entityId: "profile.top-side-right", field: "origin.x", param: "rightUprightCenterX" },
      { entityId: "profile.top-side-left", field: "origin.y", param: "topSideRailStartY" },
      { entityId: "profile.top-side-right", field: "origin.y", param: "topSideRailStartY" },
      { entityId: "profile.top-side-left", field: "origin.z", param: "topSideRailCenterZ" },
      { entityId: "profile.top-side-right", field: "origin.z", param: "topSideRailCenterZ" },
      { entityId: "profile.upright-left-front", field: "lengthMm", param: "uprightLength" },
      { entityId: "profile.upright-left-rear", field: "lengthMm", param: "uprightLength" },
      { entityId: "profile.upright-right-front", field: "lengthMm", param: "uprightLength" },
      { entityId: "profile.upright-right-rear", field: "lengthMm", param: "uprightLength" },
      { entityId: "profile.upright-left-front", field: "origin.x", param: "leftUprightCenterX" },
      { entityId: "profile.upright-left-rear", field: "origin.x", param: "leftUprightCenterX" },
      { entityId: "profile.upright-right-front", field: "origin.x", param: "rightUprightCenterX" },
      { entityId: "profile.upright-right-rear", field: "origin.x", param: "rightUprightCenterX" },
      { entityId: "profile.upright-left-front", field: "origin.y", param: "frontUprightCenterY" },
      { entityId: "profile.upright-right-front", field: "origin.y", param: "frontUprightCenterY" },
      { entityId: "profile.upright-left-rear", field: "origin.y", param: "rearUprightCenterY" },
      { entityId: "profile.upright-right-rear", field: "origin.y", param: "rearUprightCenterY" },
      { entityId: "profile.base-left", field: "lengthMm", param: "topFrameOuterDepth" },
      { entityId: "profile.base-right", field: "lengthMm", param: "topFrameOuterDepth" },
      { entityId: "profile.base-left", field: "origin.x", param: "leftUprightCenterX" },
      { entityId: "profile.base-right", field: "origin.x", param: "rightUprightCenterX" },
      { entityId: "profile.base-left", field: "origin.z", param: "baseRailCenterZ" },
      { entityId: "profile.base-right", field: "origin.z", param: "baseRailCenterZ" },
    ],
    entities: {
      "profile.top-front": {
        id: "profile.top-front",
        kind: "profile",
        definitionRef: {
          partId: topBeamDefinition.id,
          revision: topBeamDefinition.revision,
        },
        origin: { x: 0, y: 20, z: 710 },
        axis: "x",
        lengthMm: 2230,
        rotationAroundAxisDeg: 0,
        purpose: "Long-span top beam",
        endCutA: { kind: "square" },
        endCutB: { kind: "square" },
      },
      "profile.top-rear": {
        id: "profile.top-rear",
        kind: "profile",
        definitionRef: {
          partId: topBeamDefinition.id,
          revision: topBeamDefinition.revision,
        },
        origin: { x: 0, y: 480, z: 710 },
        axis: "x",
        lengthMm: 2230,
        rotationAroundAxisDeg: 0,
        purpose: "Long-span top beam",
        endCutA: { kind: "square" },
        endCutB: { kind: "square" },
      },
      "profile.top-side-left": {
        id: "profile.top-side-left",
        kind: "profile",
        definitionRef: { partId: frameDefinition.id, revision: frameDefinition.revision },
        origin: { x: 20, y: 40, z: 730 },
        axis: "y",
        lengthMm: 420,
        rotationAroundAxisDeg: 0,
        purpose: "Top-frame side rail",
        endCutA: { kind: "square" },
        endCutB: { kind: "square" },
      },
      "profile.top-side-right": {
        id: "profile.top-side-right",
        kind: "profile",
        definitionRef: { partId: frameDefinition.id, revision: frameDefinition.revision },
        origin: { x: 2210, y: 40, z: 730 },
        axis: "y",
        lengthMm: 420,
        rotationAroundAxisDeg: 0,
        purpose: "Top-frame side rail",
        endCutA: { kind: "square" },
        endCutB: { kind: "square" },
      },
      "profile.upright-left-front": {
        id: "profile.upright-left-front",
        kind: "profile",
        definitionRef: { partId: frameDefinition.id, revision: frameDefinition.revision },
        origin: { x: 20, y: 20, z: 0 },
        axis: "z",
        lengthMm: 670,
        rotationAroundAxisDeg: 0,
        purpose: "Upright",
        endCutA: { kind: "square" },
        endCutB: { kind: "square" },
      },
      "profile.upright-left-rear": {
        id: "profile.upright-left-rear",
        kind: "profile",
        definitionRef: { partId: frameDefinition.id, revision: frameDefinition.revision },
        origin: { x: 20, y: 480, z: 0 },
        axis: "z",
        lengthMm: 670,
        rotationAroundAxisDeg: 0,
        purpose: "Upright",
        endCutA: { kind: "square" },
        endCutB: { kind: "square" },
      },
      "profile.upright-right-front": {
        id: "profile.upright-right-front",
        kind: "profile",
        definitionRef: { partId: frameDefinition.id, revision: frameDefinition.revision },
        origin: { x: 2210, y: 20, z: 0 },
        axis: "z",
        lengthMm: 670,
        rotationAroundAxisDeg: 0,
        purpose: "Upright",
        endCutA: { kind: "square" },
        endCutB: { kind: "square" },
      },
      "profile.upright-right-rear": {
        id: "profile.upright-right-rear",
        kind: "profile",
        definitionRef: { partId: frameDefinition.id, revision: frameDefinition.revision },
        origin: { x: 2210, y: 480, z: 0 },
        axis: "z",
        lengthMm: 670,
        rotationAroundAxisDeg: 0,
        purpose: "Upright",
        endCutA: { kind: "square" },
        endCutB: { kind: "square" },
      },
      "profile.base-left": {
        id: "profile.base-left",
        kind: "profile",
        definitionRef: { partId: frameDefinition.id, revision: frameDefinition.revision },
        origin: { x: 20, y: 0, z: 20 },
        axis: "y",
        lengthMm: 500,
        rotationAroundAxisDeg: 0,
        purpose: "Base side rail",
        endCutA: { kind: "square" },
        endCutB: { kind: "square" },
      },
      "profile.base-right": {
        id: "profile.base-right",
        kind: "profile",
        definitionRef: { partId: frameDefinition.id, revision: frameDefinition.revision },
        origin: { x: 2210, y: 0, z: 20 },
        axis: "y",
        lengthMm: 500,
        rotationAroundAxisDeg: 0,
        purpose: "Base side rail",
        endCutA: { kind: "square" },
        endCutB: { kind: "square" },
      },
    },
    embeddedParts: {
      [`${topBeamDefinition.id}@${topBeamDefinition.revision}`]: topBeamSnapshot,
      [`${frameDefinition.id}@${frameDefinition.revision}`]: frameSnapshot,
    },
    extensions: {
      notForOrdering: true,
      panelMount: {
        method: "shelf-support-flush-inset",
        panelTopFlushWithFrame: true,
        fitClearancePerSideMm: 2,
        supportConcept: "continuous-inner-ledges-or-shelf-supports",
        measurePanelAfterFrameAssembly: true,
      },
      structuralSizing: createDemoStructuralSizingStudy(),
    },
  };
}
