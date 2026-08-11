import { deriveProfileBom } from "../bom/derive";
import { evaluateParameters } from "../params/evaluate";
import { evaluateRules, canProceed, type ValidationTarget } from "../rules/evaluate";
import { evaluateStructuralSizing } from "../structural/evaluate";
import type { ProjectDocumentV1 } from "./schema";

export function inspectProject(project: ProjectDocumentV1) {
  return {
    evaluatedParameters: evaluateParameters(project.parameters),
    bom: deriveProfileBom(project),
    findings: evaluateRules(project),
    structuralSizing: evaluateStructuralSizing(project),
  };
}

export function validateProject(project: ProjectDocumentV1, target: ValidationTarget) {
  const findings = evaluateRules(project);
  return { target, canProceed: canProceed(findings, target), findings };
}
