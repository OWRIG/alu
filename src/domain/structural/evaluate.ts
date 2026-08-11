import { evaluateParameters } from "../params/evaluate";
import type { ProjectDocumentV1 } from "../project/schema";
import { getStructuralSizingStudy, type BeamCandidate, type StructuralSizingStudy } from "./schema";

export type BeamCandidateResult = {
  candidate: BeamCandidate;
  beamSetMassKg: number;
  sectionModulusMm3: number;
  deflectionLimitMm: number;
  deflectionMm: number;
  deflectionPartsMm: {
    panel: number;
    distributedPayload: number;
    beamSelfWeight: number;
    centerPointPayload: number;
  };
  utilization: number;
  maximumMomentNmm: number;
  bendingStressNPerMm2: number;
  centerPointMassLimitKgUnderBaseLoad: number;
  passesDeflection: boolean;
  fitsSectionHeight: boolean;
  fitsCompatibilityGroup: boolean;
  eligible: boolean;
};

export type StructuralSizingResult = {
  study: StructuralSizingStudy;
  effectiveSpanMm: number;
  maximumSectionHeightMm: number;
  beamCutLengthTotalMm: number;
  distributedForcePerBeamN: number;
  centerPointForcePerBeamN: number;
  candidates: BeamCandidateResult[];
  selected: BeamCandidateResult | null;
};

function uniformDeflectionMm(
  loadNPerMm: number,
  spanMm: number,
  elasticModulusNPerMm2: number,
  inertiaMm4: number,
) {
  return (5 * loadNPerMm * spanMm ** 4) / (384 * elasticModulusNPerMm2 * inertiaMm4);
}

function centerPointDeflectionMm(
  loadN: number,
  spanMm: number,
  elasticModulusNPerMm2: number,
  inertiaMm4: number,
) {
  return (loadN * spanMm ** 3) / (48 * elasticModulusNPerMm2 * inertiaMm4);
}

function evaluateCandidate(
  candidate: BeamCandidate,
  study: StructuralSizingStudy,
  effectiveSpanMm: number,
  maximumSectionHeightMm: number,
  beamCutLengthTotalMm: number,
): BeamCandidateResult {
  const { loads, gravityNPerKg, elasticModulusNPerMm2 } = study;
  const panelLoadNPerMm =
    (loads.panelMassKg * gravityNPerKg * loads.distributedLoadSharePerBeam) / effectiveSpanMm;
  const payloadLoadNPerMm =
    (loads.distributedPayloadKg * gravityNPerKg * loads.distributedLoadSharePerBeam) /
    effectiveSpanMm;
  const selfWeightNPerMm = (candidate.massKgPerM * gravityNPerKg) / 1_000;
  const centerPointLoadN =
    loads.centerPointPayloadKg * gravityNPerKg * loads.centerPointLoadSharePerBeam;
  const deflectionPartsMm = {
    panel: uniformDeflectionMm(
      panelLoadNPerMm,
      effectiveSpanMm,
      elasticModulusNPerMm2,
      candidate.inertiaMm4,
    ),
    distributedPayload: uniformDeflectionMm(
      payloadLoadNPerMm,
      effectiveSpanMm,
      elasticModulusNPerMm2,
      candidate.inertiaMm4,
    ),
    beamSelfWeight: uniformDeflectionMm(
      selfWeightNPerMm,
      effectiveSpanMm,
      elasticModulusNPerMm2,
      candidate.inertiaMm4,
    ),
    centerPointPayload: centerPointDeflectionMm(
      centerPointLoadN,
      effectiveSpanMm,
      elasticModulusNPerMm2,
      candidate.inertiaMm4,
    ),
  };
  const baseDeflectionMm =
    deflectionPartsMm.panel +
    deflectionPartsMm.distributedPayload +
    deflectionPartsMm.beamSelfWeight;
  const deflectionMm = baseDeflectionMm + deflectionPartsMm.centerPointPayload;
  const deflectionLimitMm = effectiveSpanMm / study.deflectionLimitRatio;
  const totalUniformLoadNPerMm = panelLoadNPerMm + payloadLoadNPerMm + selfWeightNPerMm;
  const maximumMomentNmm =
    (totalUniformLoadNPerMm * effectiveSpanMm ** 2) / 8 + (centerPointLoadN * effectiveSpanMm) / 4;
  const sectionModulusMm3 = candidate.inertiaMm4 / (candidate.sectionHeightMm / 2);
  const remainingDeflectionMm = Math.max(0, deflectionLimitMm - baseDeflectionMm);
  const centerPointForceLimitN =
    (remainingDeflectionMm * 48 * elasticModulusNPerMm2 * candidate.inertiaMm4) /
    effectiveSpanMm ** 3;
  const centerPointMassLimitKgUnderBaseLoad =
    centerPointForceLimitN / (gravityNPerKg * loads.centerPointLoadSharePerBeam);
  const passesDeflection = deflectionMm <= deflectionLimitMm;
  const fitsSectionHeight = candidate.sectionHeightMm <= maximumSectionHeightMm;
  const fitsCompatibilityGroup = candidate.compatibilityGroup === study.requiredCompatibilityGroup;

  return {
    candidate,
    beamSetMassKg: (candidate.massKgPerM * beamCutLengthTotalMm) / 1_000,
    sectionModulusMm3,
    deflectionLimitMm,
    deflectionMm,
    deflectionPartsMm,
    utilization: deflectionMm / deflectionLimitMm,
    maximumMomentNmm,
    bendingStressNPerMm2: maximumMomentNmm / sectionModulusMm3,
    centerPointMassLimitKgUnderBaseLoad,
    passesDeflection,
    fitsSectionHeight,
    fitsCompatibilityGroup,
    eligible: passesDeflection && fitsSectionHeight && fitsCompatibilityGroup,
  };
}

export function evaluateStructuralSizing(
  project: ProjectDocumentV1,
): StructuralSizingResult | null {
  const study = getStructuralSizingStudy(project);
  if (!study) return null;

  let values: Record<string, number>;
  try {
    values = evaluateParameters(project.parameters);
  } catch {
    return null;
  }
  const effectiveSpanMm = values[study.effectiveSpanParam];
  const maximumSectionHeightMm = values[study.maximumSectionHeightParam];
  if (
    !Number.isFinite(effectiveSpanMm) ||
    effectiveSpanMm <= 0 ||
    !Number.isFinite(maximumSectionHeightMm) ||
    maximumSectionHeightMm <= 0
  ) {
    return null;
  }

  const beamCutLengthTotalMm = study.beamEntityIds.reduce(
    (total, entityId) => total + (project.entities[entityId]?.lengthMm ?? 0),
    0,
  );
  const candidates = study.candidates
    .map((candidate) =>
      evaluateCandidate(
        candidate,
        study,
        effectiveSpanMm,
        maximumSectionHeightMm,
        beamCutLengthTotalMm,
      ),
    )
    .sort(
      (left, right) =>
        left.candidate.massKgPerM - right.candidate.massKgPerM ||
        left.candidate.id.localeCompare(right.candidate.id, "en"),
    );
  const selected = candidates.find((candidate) => candidate.eligible) ?? null;

  return {
    study,
    effectiveSpanMm,
    maximumSectionHeightMm,
    beamCutLengthTotalMm,
    distributedForcePerBeamN:
      (study.loads.panelMassKg + study.loads.distributedPayloadKg) *
      study.gravityNPerKg *
      study.loads.distributedLoadSharePerBeam,
    centerPointForcePerBeamN:
      study.loads.centerPointPayloadKg *
      study.gravityNPerKg *
      study.loads.centerPointLoadSharePerBeam,
    candidates,
    selected,
  };
}
