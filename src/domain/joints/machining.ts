import { compareCanonicalText, quantizeMm } from "../project/canonical";
import { partKey } from "../project/parse";
import type {
  Joint,
  JointType,
  ProfileInstance,
  ProjectDocumentV1,
  Vec3Mm,
} from "../project/schema";
import type {
  ConnectorMap,
  DrillTable,
  Face,
  HardwareItem,
  HardwareLine,
  MachiningOp,
} from "./schema";

/**
 * ISO metric tapping and clearance drills. These are published standards, not
 * vendor data, so they can be stated with confidence.
 */
const DRILL_TABLE: DrillTable = {
  5: { tapMm: 4.2, clearanceMm: 5.5 },
  6: { tapMm: 5, clearanceMm: 6.6 },
  8: { tapMm: 6.8, clearanceMm: 9 },
};

const DRILL_EVIDENCE = {
  kind: "standard" as const,
  reference: "ISO 261 coarse thread tapping drills; ISO 273 medium-fit clearance holes",
  confidence: "high" as const,
};

/** Tapped depth as a multiple of nominal diameter — the usual shop rule for aluminium. */
const TAP_DEPTH_FACTOR = 2.5;

type Axis = "x" | "y" | "z";

const CROSS_AXES: Record<Axis, [Axis, Axis]> = {
  x: ["y", "z"],
  y: ["x", "z"],
  z: ["x", "y"],
};

/**
 * Cross-section extents in world axes. A profile's rotation only ever swaps the
 * two envelope dimensions, so the envelope stays axis-aligned.
 */
function crossExtents(
  profile: ProfileInstance,
  envelopeUMm: number,
  envelopeVMm: number,
): Record<Axis, number> {
  const rotated = profile.rotationAroundAxisDeg === 90 || profile.rotationAroundAxisDeg === 270;
  const u = rotated ? envelopeVMm : envelopeUMm;
  const v = rotated ? envelopeUMm : envelopeVMm;
  if (profile.axis === "x") return { x: profile.lengthMm, y: u, z: v };
  if (profile.axis === "y") return { x: u, y: profile.lengthMm, z: v };
  return { x: u, y: v, z: profile.lengthMm };
}

function sectionOf(project: ProjectDocumentV1, profile: ProfileInstance) {
  const definition =
    project.embeddedParts[partKey(profile.definitionRef.partId, profile.definitionRef.revision)]
      ?.definition;
  if (!definition) return null;
  return crossExtents(profile, definition.section.envelopeUMm, definition.section.envelopeVMm);
}

/** Centre of the member, in world coordinates. */
function centreOf(profile: ProfileInstance): Vec3Mm {
  const centre = { ...profile.origin };
  centre[profile.axis] += profile.lengthMm / 2;
  return centre;
}

function endPlane(profile: ProfileInstance, end: "a" | "b"): number {
  return end === "a"
    ? profile.origin[profile.axis]
    : profile.origin[profile.axis] + profile.lengthMm;
}

function endFace(profile: ProfileInstance, end: "a" | "b"): Face {
  return `${end === "a" ? "-" : "+"}${profile.axis}` as Face;
}

/**
 * Bolt offsets across the face. A single bolt sits on the centreline; two are
 * spread to the quarter points so they straddle the profile's centre slot.
 */
function boltOffsets(count: number, extentMm: number): number[] {
  if (count === 1) return [0];
  const quarter = extentMm / 4;
  return [-quarter, quarter];
}

/** Of the two cross axes, bolts spread along whichever face is wider. */
function spreadAxis(extents: Record<Axis, number>, axis: Axis): Axis {
  const [first, second] = CROSS_AXES[axis];
  return extents[first] >= extents[second] ? first : second;
}

function machiningForJoint(project: ProjectDocumentV1, joint: Joint): MachiningOp[] {
  const primary = project.entities[joint.primary.entityId];
  const secondary = project.entities[joint.secondaryEntityId];
  if (!primary || !secondary) return [];
  const primaryExtents = sectionOf(project, primary);
  const secondaryExtents = sectionOf(project, secondary);
  if (!primaryExtents || !secondaryExtents) return [];

  // A corner bracket clamps into the T-slots from outside; nothing is drilled.
  if (joint.jointType === "corner-bracket") return [];

  const drill = DRILL_TABLE[joint.boltSizeMm];
  const ops: MachiningOp[] = [];

  const primaryAxis = primary.axis;
  const primarySpread = spreadAxis(primaryExtents, primaryAxis);
  const primaryPlane = endPlane(primary, joint.primary.end);
  const offsets = boltOffsets(joint.boltCount, primaryExtents[primarySpread]);

  // 1. Tapped holes into the primary member's end face.
  for (const offset of offsets) {
    const position = { ...centreOf(primary) };
    position[primaryAxis] = primaryPlane;
    position[primarySpread] = quantizeMm(position[primarySpread] + offset);
    ops.push({
      entityId: primary.id,
      face: endFace(primary, joint.primary.end),
      kind: "tap",
      diameterMm: drill.tapMm,
      depthMm: Math.ceil(joint.boltSizeMm * TAP_DEPTH_FACTOR),
      positionMm: position,
      offsetFromEndAMm: joint.primary.end === "a" ? 0 : primary.lengthMm,
      sourceJointId: joint.id,
      evidence: DRILL_EVIDENCE,
    });
  }

  // 2. The matching hole in the secondary member, on the side the primary meets.
  const secondaryAxis = secondary.axis;
  const secondaryCentre = centreOf(secondary);
  const primaryCentre = centreOf(primary);
  const [crossA, crossB] = CROSS_AXES[secondaryAxis];
  const deltaA = primaryCentre[crossA] - secondaryCentre[crossA];
  const deltaB = primaryCentre[crossB] - secondaryCentre[crossB];
  const faceAxis = Math.abs(deltaA) >= Math.abs(deltaB) ? crossA : crossB;
  const faceDelta = faceAxis === crossA ? deltaA : deltaB;
  // When the two centrelines coincide the primary sits on the secondary's end,
  // so fall back to the face the primary points away from.
  const faceSign = faceDelta === 0 ? (joint.primary.end === "a" ? -1 : 1) : Math.sign(faceDelta);
  const face = `${faceSign < 0 ? "-" : "+"}${faceAxis}` as Face;
  const alongSecondary = primaryPlane;
  const secondarySpread = faceAxis === crossA ? crossB : crossA;

  for (const offset of offsets) {
    const position = { ...secondaryCentre };
    position[secondaryAxis] = quantizeMm(alongSecondary);
    position[faceAxis] = quantizeMm(
      secondaryCentre[faceAxis] + (faceSign * secondaryExtents[faceAxis]) / 2,
    );
    position[secondarySpread] = quantizeMm(position[secondarySpread] + offset);
    ops.push({
      entityId: secondary.id,
      face,
      kind: "through-hole",
      diameterMm: drill.clearanceMm,
      depthMm: null,
      positionMm: position,
      offsetFromEndAMm: quantizeMm(alongSecondary - secondary.origin[secondaryAxis]),
      sourceJointId: joint.id,
      evidence: DRILL_EVIDENCE,
    });
  }

  return ops;
}

/**
 * All machining implied by the project's joints. Holes have exactly one source:
 * a joint. Nothing is written back onto the profile entities.
 */
export function deriveMachining(project: ProjectDocumentV1): MachiningOp[] {
  const joints = Object.values(project.joints ?? {}).sort((left, right) =>
    compareCanonicalText(left.id, right.id),
  );
  return joints.flatMap((joint) => machiningForJoint(project, joint));
}

const CONNECTOR_ITEM: ConnectorMap = {
  "corner-bracket": "corner-bracket",
  "hidden-connector": "hidden-connector",
  "butt-screw": null,
};

/** T-nuts are only needed where the connector clamps into a slot. */
const NEEDS_T_NUT: Record<JointType, boolean> = {
  "corner-bracket": true,
  "hidden-connector": true,
  "butt-screw": false,
};

const ITEM_ORDER: HardwareItem[] = ["corner-bracket", "hidden-connector", "t-nut", "bolt"];

/**
 * Connectors and fasteners implied by the joints. Vendor SKUs stay `null` —
 * the neutral type and the bolt size are stated, the part number is not guessed.
 */
export function deriveHardware(project: ProjectDocumentV1): HardwareLine[] {
  const joints = Object.values(project.joints ?? {}).sort((left, right) =>
    compareCanonicalText(left.id, right.id),
  );
  const groups = new Map<string, HardwareLine>();

  function add(item: HardwareItem, specification: string, quantity: number, jointId: string) {
    const aggregateKey = `${item}|${specification}`;
    const existing = groups.get(aggregateKey);
    if (existing) {
      existing.quantity += quantity;
      if (!existing.sourceJointIds.includes(jointId)) existing.sourceJointIds.push(jointId);
      return;
    }
    groups.set(aggregateKey, {
      aggregateKey,
      item,
      specification,
      quantity,
      sku: null,
      sourceJointIds: [jointId],
    });
  }

  for (const joint of joints) {
    if (!project.entities[joint.primary.entityId] || !project.entities[joint.secondaryEntityId]) {
      continue;
    }
    const size = `M${joint.boltSizeMm}`;
    const connector = CONNECTOR_ITEM[joint.jointType];
    if (connector) add(connector, size, 1, joint.id);
    if (NEEDS_T_NUT[joint.jointType]) add("t-nut", size, joint.boltCount, joint.id);
    // Butt screws reach through the secondary member, so they run longer.
    const boltLength =
      joint.jointType === "butt-screw" ? joint.boltSizeMm * 5 : joint.boltSizeMm * 3;
    add("bolt", `${size}×${boltLength}`, joint.boltCount, joint.id);
  }

  return [...groups.values()].sort(
    (left, right) =>
      ITEM_ORDER.indexOf(left.item) - ITEM_ORDER.indexOf(right.item) ||
      compareCanonicalText(left.specification, right.specification),
  );
}
