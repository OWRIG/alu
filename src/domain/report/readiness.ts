import { deriveMachining } from "../joints/machining";
import { partKey } from "../project/parse";
import type { ProjectDocumentV1 } from "../project/schema";

/**
 * The steps between a design and a cut list somebody can actually order from.
 * Only the first one is modelled today; the rest land with their own changesets.
 */
export const ORDER_READINESS_STEPS = [
  "profiles",
  "connectors",
  "machining",
  "panels",
  "casters",
] as const;

export type OrderReadinessStepId = (typeof ORDER_READINESS_STEPS)[number];

/** Why a step is not ready. `not-modelled` means the app cannot express it yet. */
export type OrderReadinessReason =
  | "empty"
  | "concept-only"
  | "not-modelled"
  | "no-joints"
  | "open-ends";

export type OrderReadinessStep = {
  id: OrderReadinessStepId;
  ready: boolean;
  reason?: OrderReadinessReason;
};

function profilesStep(project: ProjectDocumentV1): OrderReadinessStep {
  const profiles = Object.values(project.entities);
  if (profiles.length === 0) return { id: "profiles", ready: false, reason: "empty" };

  const everyMemberHasSku = profiles.every((profile) => {
    const snapshot =
      project.embeddedParts[partKey(profile.definitionRef.partId, profile.definitionRef.revision)];
    return Boolean(snapshot?.definition.procurement?.sku);
  });
  return everyMemberHasSku
    ? { id: "profiles", ready: true }
    : { id: "profiles", ready: false, reason: "concept-only" };
}

/**
 * Connectors are ready once every member end is accounted for by a joint. A
 * member with a free end is either unfinished or deliberately open — either way
 * the user has to say so before this counts as orderable.
 */
function connectorsStep(project: ProjectDocumentV1): OrderReadinessStep {
  const joints = Object.values(project.joints ?? {});
  if (joints.length === 0) return { id: "connectors", ready: false, reason: "no-joints" };

  const connectedEnds = new Set(
    joints.map((joint) => `${joint.primary.entityId}|${joint.primary.end}`),
  );
  const totalEnds = Object.keys(project.entities).length * 2;
  return connectedEnds.size === totalEnds
    ? { id: "connectors", ready: true }
    : { id: "connectors", ready: false, reason: "open-ends" };
}

/**
 * Machining is ready when every derived hole has a diameter and a defined depth.
 * A frame built entirely from corner brackets needs no holes and is also ready.
 */
function machiningStep(project: ProjectDocumentV1): OrderReadinessStep {
  if (Object.values(project.joints ?? {}).length === 0) {
    return { id: "machining", ready: false, reason: "no-joints" };
  }
  const ops = deriveMachining(project);
  const complete = ops.every(
    (op) => op.diameterMm > 0 && (op.kind === "through-hole" || (op.depthMm ?? 0) > 0),
  );
  return complete ? { id: "machining", ready: true } : { id: "machining", ready: false };
}

/**
 * Derives how far the project is from an orderable cut list. This replaces the
 * repeated "not order-ready" disclaimers with one place that says what is missing.
 */
export function evaluateOrderReadiness(project: ProjectDocumentV1): OrderReadinessStep[] {
  return ORDER_READINESS_STEPS.map((id) => {
    if (id === "profiles") return profilesStep(project);
    if (id === "connectors") return connectorsStep(project);
    if (id === "machining") return machiningStep(project);
    return { id, ready: false, reason: "not-modelled" };
  });
}
