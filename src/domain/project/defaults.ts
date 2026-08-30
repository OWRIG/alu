import { computeDefinitionHash } from "./hash";
import type {
  EmbeddedProfileSnapshot,
  Joint,
  ProfileDefinition,
  ProjectDocumentV1,
} from "./schema";
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
  makeGenericDefinition("generic.profile.3090-envelope", "Concept 3090 Envelope", 30, 90),
] as const;

const JLCFA_EURO_30_PROFILE_SOURCE =
  "https://static.jlcfa.com/Serial/T01/TXCK/482732153849024513.pdf";

function makeJlcfaEuro30Definition(options: {
  id: string;
  sku: string;
  envelopeUMm: number;
  envelopeVMm: number;
  massKgPerM: number;
  strongAxisInertiaMm4: number;
}): ProfileDefinition {
  return {
    id: options.id,
    revision: "catalog-2026-08-30",
    kind: "profile",
    name: `JLCFA ${options.sku}`,
    unit: "meter",
    section: {
      envelopeUMm: options.envelopeUMm,
      envelopeVMm: options.envelopeVMm,
      representation: "rectangular-envelope",
      referencePoint: "envelope-center",
    },
    procurement: {
      vendor: "JLCFA",
      sku: options.sku,
      productUrl: JLCFA_EURO_30_PROFILE_SOURCE,
    },
    evidence: [
      {
        kind: "vendor",
        reference: JLCFA_EURO_30_PROFILE_SOURCE,
        confidence: "high",
      },
    ],
    extensions: {
      material: "A6063-T5",
      finish: "natural-sandblasted-anodized",
      slotSeries: "euro-30-slot-8.2",
      massKgPerM: options.massKgPerM,
      strongAxisInertiaMm4: options.strongAxisInertiaMm4,
      catalogPage: "JLCFA TXCK Euro 30 table, PDF p.4",
    },
  };
}

export const JLCFA_EURO_30_PROFILE_DEFINITIONS = {
  upright: makeJlcfaEuro30Definition({
    id: "jlcfa.txck-h6-j3030",
    sku: "TXCK-H6-J3030",
    envelopeUMm: 30,
    envelopeVMm: 30,
    massKgPerM: 0.77,
    strongAxisInertiaMm4: 2.618e4,
  }),
  base: makeJlcfaEuro30Definition({
    id: "jlcfa.txck-h6-j3060",
    sku: "TXCK-H6-J3060",
    envelopeUMm: 30,
    envelopeVMm: 60,
    massKgPerM: 1.37,
    strongAxisInertiaMm4: 17.944e4,
  }),
} as const;

export function snapshotDefinition(definition: ProfileDefinition): EmbeddedProfileSnapshot {
  return { definition, definitionHash: computeDefinitionHash(definition) };
}

function newProjectMeta(name: string, now: string) {
  return { name, createdAt: now, updatedAt: now, appVersion: "0.2.1", units: "mm" as const };
}

function jointRecord(
  id: string,
  jointType: Joint["jointType"],
  primaryEntityId: string,
  end: "a" | "b",
  secondaryEntityId: string,
): Joint {
  return {
    id,
    kind: "joint",
    jointType,
    primary: { entityId: primaryEntityId, end },
    secondaryEntityId,
    boltSizeMm: 8,
    boltCount: 2,
  };
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
  const topBeamDefinition = GENERIC_PROFILE_DEFINITIONS[4];
  const uprightDefinition = JLCFA_EURO_30_PROFILE_DEFINITIONS.upright;
  const baseDefinition = JLCFA_EURO_30_PROFILE_DEFINITIONS.base;
  const topBeamSnapshot = snapshotDefinition(topBeamDefinition);
  const uprightSnapshot = snapshotDefinition(uprightDefinition);
  const baseSnapshot = snapshotDefinition(baseDefinition);
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
        "Manufacturing-friendly mobile overbed-table concept for a measured 2100 mm obstacle. The extrusion cuts use 2200, 600, and 400 mm nominal lengths. The 18 mm panel sits inside a four-sided top-frame pocket on continuous inner ledges or verified shelf supports; its top face is flush and keeps a nominal 5 mm gap per side. Assemble and square the frame before measuring the final panel. GD-80-S-HUP publishes a 103 mm caster height; the model adds a provisional 10 mm adapter stack for TPED-308-3060-M12 and must be replaced by the measured floor-to-base height before final cutting. No sitting, leaning, climbing, or child loading. The embedded beam study is an ideal-beam deflection screen only; joints, sway, tipping, caster dynamics, support interfaces, and proof testing remain unresolved.",
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
          valueMm: 20,
          label: "Left working clearance",
          boundaryKind: "clearance",
        },
        clearanceRight: {
          valueMm: 20,
          label: "Right working clearance",
          boundaryKind: "clearance",
        },
        uprightWidthX: {
          valueMm: 30,
          label: "Upright and top side-rail width",
          boundaryKind: "generic",
        },
        topBeamWidth: {
          valueMm: 30,
          label: "Applied top-beam width",
          boundaryKind: "generic",
        },
        topFrameHeight: {
          valueMm: 90,
          label: "Applied top-beam height",
          boundaryKind: "generic",
        },
        topBeamMaximumHeight: {
          valueMm: 90,
          label: "Maximum allowed top-beam height",
          boundaryKind: "generic",
        },
        topFrameOuterDepth: {
          valueMm: 460,
          label: "Top-frame outer depth",
          boundaryKind: "frame-outer",
        },
        baseOuterDepth: {
          valueMm: 600,
          label: "Base support depth",
          boundaryKind: "frame-outer",
        },
        baseFrameHeight: {
          valueMm: 30,
          label: "Flat 3060 base vertical height",
          boundaryKind: "height",
        },
        panelFitClearance: {
          valueMm: 5,
          label: "Panel gap per side",
          boundaryKind: "panel",
        },
        tabletopThickness: {
          valueMm: 18,
          label: "Panel thickness",
          boundaryKind: "panel",
        },
        finishedHeight: {
          valueMm: 833,
          label: "Finished surface height",
          boundaryKind: "height",
        },
        casterInstalledHeight: {
          valueMm: 113,
          label: "Caster and adapter installed height (verify)",
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
            { param: "topBeamWidth", coef: -2 },
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
            { param: "casterInstalledHeight", coef: -1 },
            { param: "baseFrameHeight", coef: -1 },
          ],
          constantMm: 0,
        },
        uprightStartZ: {
          label: "Upright start height",
          terms: [
            { param: "casterInstalledHeight", coef: 1 },
            { param: "baseFrameHeight", coef: 1 },
          ],
          constantMm: 0,
        },
        topBeamCenterZ: {
          label: "Top-beam center height",
          terms: [
            { param: "casterInstalledHeight", coef: 1 },
            { param: "baseFrameHeight", coef: 1 },
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
          terms: [{ param: "topBeamWidth", coef: 0.5 }],
          constantMm: 0,
        },
        rearTopBeamCenterY: {
          label: "Rear top-beam center Y",
          terms: [
            { param: "topFrameOuterDepth", coef: 1 },
            { param: "topBeamWidth", coef: -0.5 },
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
          terms: [{ param: "topBeamWidth", coef: 1 }],
          constantMm: 0,
        },
        baseRailStartY: {
          label: "Centered base-rail start Y",
          terms: [
            { param: "topFrameOuterDepth", coef: 0.5 },
            { param: "baseOuterDepth", coef: -0.5 },
          ],
          constantMm: 0,
        },
        baseRailCenterZ: {
          label: "Base side-rail center height",
          terms: [
            { param: "casterInstalledHeight", coef: 1 },
            { param: "baseFrameHeight", coef: 0.5 },
          ],
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
      {
        entityId: "profile.upright-left-front",
        field: "origin.z",
        param: "uprightStartZ",
      },
      {
        entityId: "profile.upright-left-rear",
        field: "origin.z",
        param: "uprightStartZ",
      },
      {
        entityId: "profile.upright-right-front",
        field: "origin.z",
        param: "uprightStartZ",
      },
      {
        entityId: "profile.upright-right-rear",
        field: "origin.z",
        param: "uprightStartZ",
      },
      { entityId: "profile.upright-left-front", field: "origin.x", param: "leftUprightCenterX" },
      { entityId: "profile.upright-left-rear", field: "origin.x", param: "leftUprightCenterX" },
      { entityId: "profile.upright-right-front", field: "origin.x", param: "rightUprightCenterX" },
      { entityId: "profile.upright-right-rear", field: "origin.x", param: "rightUprightCenterX" },
      { entityId: "profile.upright-left-front", field: "origin.y", param: "frontUprightCenterY" },
      { entityId: "profile.upright-right-front", field: "origin.y", param: "frontUprightCenterY" },
      { entityId: "profile.upright-left-rear", field: "origin.y", param: "rearUprightCenterY" },
      { entityId: "profile.upright-right-rear", field: "origin.y", param: "rearUprightCenterY" },
      { entityId: "profile.base-left", field: "lengthMm", param: "baseOuterDepth" },
      { entityId: "profile.base-right", field: "lengthMm", param: "baseOuterDepth" },
      { entityId: "profile.base-left", field: "origin.x", param: "leftUprightCenterX" },
      { entityId: "profile.base-right", field: "origin.x", param: "rightUprightCenterX" },
      { entityId: "profile.base-left", field: "origin.y", param: "baseRailStartY" },
      { entityId: "profile.base-right", field: "origin.y", param: "baseRailStartY" },
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
        origin: { x: 0, y: 15, z: 788 },
        axis: "x",
        lengthMm: 2200,
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
        origin: { x: 0, y: 445, z: 788 },
        axis: "x",
        lengthMm: 2200,
        rotationAroundAxisDeg: 0,
        purpose: "Long-span top beam",
        endCutA: { kind: "square" },
        endCutB: { kind: "square" },
      },
      "profile.top-side-left": {
        id: "profile.top-side-left",
        kind: "profile",
        definitionRef: { partId: uprightDefinition.id, revision: uprightDefinition.revision },
        origin: { x: 15, y: 30, z: 818 },
        axis: "y",
        lengthMm: 400,
        rotationAroundAxisDeg: 0,
        purpose: "Top-frame side rail",
        endCutA: { kind: "square" },
        endCutB: { kind: "square" },
      },
      "profile.top-side-right": {
        id: "profile.top-side-right",
        kind: "profile",
        definitionRef: { partId: uprightDefinition.id, revision: uprightDefinition.revision },
        origin: { x: 2185, y: 30, z: 818 },
        axis: "y",
        lengthMm: 400,
        rotationAroundAxisDeg: 0,
        purpose: "Top-frame side rail",
        endCutA: { kind: "square" },
        endCutB: { kind: "square" },
      },
      "profile.upright-left-front": {
        id: "profile.upright-left-front",
        kind: "profile",
        definitionRef: { partId: uprightDefinition.id, revision: uprightDefinition.revision },
        origin: { x: 15, y: 15, z: 143 },
        axis: "z",
        lengthMm: 600,
        rotationAroundAxisDeg: 0,
        purpose: "Upright",
        endCutA: { kind: "square" },
        endCutB: { kind: "square" },
      },
      "profile.upright-left-rear": {
        id: "profile.upright-left-rear",
        kind: "profile",
        definitionRef: { partId: uprightDefinition.id, revision: uprightDefinition.revision },
        origin: { x: 15, y: 445, z: 143 },
        axis: "z",
        lengthMm: 600,
        rotationAroundAxisDeg: 0,
        purpose: "Upright",
        endCutA: { kind: "square" },
        endCutB: { kind: "square" },
      },
      "profile.upright-right-front": {
        id: "profile.upright-right-front",
        kind: "profile",
        definitionRef: { partId: uprightDefinition.id, revision: uprightDefinition.revision },
        origin: { x: 2185, y: 15, z: 143 },
        axis: "z",
        lengthMm: 600,
        rotationAroundAxisDeg: 0,
        purpose: "Upright",
        endCutA: { kind: "square" },
        endCutB: { kind: "square" },
      },
      "profile.upright-right-rear": {
        id: "profile.upright-right-rear",
        kind: "profile",
        definitionRef: { partId: uprightDefinition.id, revision: uprightDefinition.revision },
        origin: { x: 2185, y: 445, z: 143 },
        axis: "z",
        lengthMm: 600,
        rotationAroundAxisDeg: 0,
        purpose: "Upright",
        endCutA: { kind: "square" },
        endCutB: { kind: "square" },
      },
      "profile.base-left": {
        id: "profile.base-left",
        kind: "profile",
        definitionRef: { partId: baseDefinition.id, revision: baseDefinition.revision },
        origin: { x: 15, y: -70, z: 128 },
        axis: "y",
        lengthMm: 600,
        rotationAroundAxisDeg: 90,
        purpose: "Base side rail",
        endCutA: { kind: "square" },
        endCutB: { kind: "square" },
      },
      "profile.base-right": {
        id: "profile.base-right",
        kind: "profile",
        definitionRef: { partId: baseDefinition.id, revision: baseDefinition.revision },
        origin: { x: 2185, y: -70, z: 128 },
        axis: "y",
        lengthMm: 600,
        rotationAroundAxisDeg: 90,
        purpose: "Base side rail",
        endCutA: { kind: "square" },
        endCutB: { kind: "square" },
      },
    },
    joints: {
      // Top-frame corners: each side rail butts into the front and rear beams.
      // Hidden connectors keep the outside faces clean, which is why these four
      // corners need access holes while the uprights do not.
      "joint.top-left-front": jointRecord(
        "joint.top-left-front",
        "hidden-connector",
        "profile.top-side-left",
        "a",
        "profile.top-front",
      ),
      "joint.top-left-rear": jointRecord(
        "joint.top-left-rear",
        "hidden-connector",
        "profile.top-side-left",
        "b",
        "profile.top-rear",
      ),
      "joint.top-right-front": jointRecord(
        "joint.top-right-front",
        "hidden-connector",
        "profile.top-side-right",
        "a",
        "profile.top-front",
      ),
      "joint.top-right-rear": jointRecord(
        "joint.top-right-rear",
        "hidden-connector",
        "profile.top-side-right",
        "b",
        "profile.top-rear",
      ),
      // Uprights carry the frame on brackets, so they need no drilling at all.
      "joint.upright-left-front": jointRecord(
        "joint.upright-left-front",
        "corner-bracket",
        "profile.upright-left-front",
        "b",
        "profile.top-front",
      ),
      "joint.upright-left-rear": jointRecord(
        "joint.upright-left-rear",
        "corner-bracket",
        "profile.upright-left-rear",
        "b",
        "profile.top-rear",
      ),
      "joint.upright-right-front": jointRecord(
        "joint.upright-right-front",
        "corner-bracket",
        "profile.upright-right-front",
        "b",
        "profile.top-front",
      ),
      "joint.upright-right-rear": jointRecord(
        "joint.upright-right-rear",
        "corner-bracket",
        "profile.upright-right-rear",
        "b",
        "profile.top-rear",
      ),
    },
    embeddedParts: {
      [`${topBeamDefinition.id}@${topBeamDefinition.revision}`]: topBeamSnapshot,
      [`${uprightDefinition.id}@${uprightDefinition.revision}`]: uprightSnapshot,
      [`${baseDefinition.id}@${baseDefinition.revision}`]: baseSnapshot,
    },
    extensions: {
      notForOrdering: true,
      designTarget: {
        requestedFinishedHeightMm: 850,
        acceptedToleranceMm: 30,
        modeledFinishedHeightMm: 833,
        integerCutLengths: true,
        preferredCutIncrementMm: 100,
      },
      casterMount: {
        vendor: "Foot Master",
        sku: "GD-80-S-HUP",
        quantity: 4,
        wheelMaterial: "cast-polyurethane",
        wheelDiameterMm: 63,
        wheelWidthMm: 28,
        publishedCasterHeightMm: 103,
        levelingAdjustmentMm: 15,
        stemThread: "M12x1.75P",
        stemLengthMm: 16,
        adapterPlateSku: "TPED-308-3060-M12",
        adapterPlateQuantity: 4,
        modeledAdapterStackAllowanceMm: 10,
        modeledInstalledHeightMm: 113,
        verifyInstalledStackBeforeCutting: true,
        casterSource: "https://www.gdok.co.kr/cn/catalog/01_leveling_caster_catalog_cn.pdf",
        adapterSource: "https://static.jlcfa.com/Serial/T02/TPED/402998356727799809.pdf",
      },
      panelMount: {
        method: "shelf-support-flush-inset",
        panelTopFlushWithFrame: true,
        fitClearancePerSideMm: 5,
        supportConcept: "continuous-inner-ledges-or-shelf-supports",
        measurePanelAfterFrameAssembly: true,
      },
      structuralSizing: createDemoStructuralSizingStudy(),
    },
  };
}
