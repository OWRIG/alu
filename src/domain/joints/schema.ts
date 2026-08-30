import type { BoltSize, JointType } from "../project/schema";

export type { BoltSize, Joint, JointType } from "../project/schema";

/** A world-axis face of a rectangular profile envelope. */
export type Face = "+x" | "-x" | "+y" | "-y" | "+z" | "-z";

export type MachiningKind = "tap" | "through-hole";

export type MachiningOp = {
  entityId: string;
  face: Face;
  kind: MachiningKind;
  diameterMm: number;
  /** `null` means the hole goes all the way through. */
  depthMm: number | null;
  /** World position of the hole centre on the face. */
  positionMm: { x: number; y: number; z: number };
  /** Distance from the member's end A, measured along its own axis. */
  offsetFromEndAMm: number;
  sourceJointId: string;
  evidence: { kind: "standard"; reference: string; confidence: "high" };
};

export type HardwareItem = "corner-bracket" | "hidden-connector" | "t-nut" | "bolt";

export type HardwareLine = {
  aggregateKey: string;
  item: HardwareItem;
  specification: string;
  quantity: number;
  /** Vendor part numbers are never guessed; they stay unconfirmed. */
  sku: null;
  sourceJointIds: string[];
};

/** Drill sizes are keyed by nominal bolt size. */
export type DrillTable = Record<BoltSize, { tapMm: number; clearanceMm: number }>;

/** Which neutral connector a joint type needs, if any. */
export type ConnectorMap = Record<JointType, HardwareItem | null>;
