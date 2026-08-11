import { deriveProfileBom } from "../bom/derive";
import { evaluateParameters } from "../params/evaluate";
import { compareCanonicalText } from "../project/canonical";
import { computeDesignHash, hashJson } from "../project/hash";
import type { JsonValue, ProfileBomLine, ProjectDocumentV1 } from "../project/schema";
import { evaluateRules, type RuleFinding } from "../rules/evaluate";
import { applyCommandEnvelope } from "./apply";
import type { CommandEnvelope } from "./schema";

export type ProjectIdentity = {
  projectId: string;
  revision: number;
  designHash: string;
};

export type CommandDiff = {
  entities: { added: string[]; updated: string[]; removed: string[] };
  parameters: { changed: string[] };
  rules: {
    added: RuleFinding[];
    updated: Array<{ before: RuleFinding; after: RuleFinding }>;
    resolved: RuleFinding[];
  };
  bom: {
    added: ProfileBomLine[];
    updated: Array<{ before: ProfileBomLine; after: ProfileBomLine }>;
    removed: ProfileBomLine[];
  };
};

export type CommandPreview = {
  before: ProjectIdentity;
  after: ProjectIdentity;
  diff: CommandDiff;
  project: ProjectDocumentV1;
};

export function projectIdentity(project: ProjectDocumentV1): ProjectIdentity {
  return {
    projectId: project.projectId,
    revision: project.revision,
    designHash: computeDesignHash(project),
  };
}

function stableHash(value: unknown): string {
  return hashJson(value as JsonValue);
}

function changedRecordKeys(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): { added: string[]; updated: string[]; removed: string[] } {
  const beforeKeys = new Set(Object.keys(before));
  const afterKeys = new Set(Object.keys(after));
  const added = [...afterKeys].filter((key) => !beforeKeys.has(key)).sort(compareCanonicalText);
  const removed = [...beforeKeys].filter((key) => !afterKeys.has(key)).sort(compareCanonicalText);
  const updated = [...beforeKeys]
    .filter((key) => afterKeys.has(key) && stableHash(before[key]) !== stableHash(after[key]))
    .sort(compareCanonicalText);
  return { added, updated, removed };
}

function parameterState(project: ProjectDocumentV1): Record<string, unknown> {
  const values = evaluateParameters(project.parameters);
  const state: Record<string, unknown> = {};
  for (const [id, definition] of Object.entries(project.parameters.inputs)) {
    state[id] = { kind: "input", definition, valueMm: values[id] };
  }
  for (const [id, definition] of Object.entries(project.parameters.derived)) {
    state[id] = { kind: "derived", definition, valueMm: values[id] };
  }
  return state;
}

function findingKey(finding: RuleFinding): string {
  return `${finding.ruleId}|${finding.entityIds.join("|")}`;
}

function diffRules(before: RuleFinding[], after: RuleFinding[]): CommandDiff["rules"] {
  const beforeByKey = new Map(before.map((finding) => [findingKey(finding), finding]));
  const afterByKey = new Map(after.map((finding) => [findingKey(finding), finding]));
  const keys = [...new Set([...beforeByKey.keys(), ...afterByKey.keys()])].sort(
    compareCanonicalText,
  );
  const added: RuleFinding[] = [];
  const updated: Array<{ before: RuleFinding; after: RuleFinding }> = [];
  const resolved: RuleFinding[] = [];
  for (const key of keys) {
    const oldFinding = beforeByKey.get(key);
    const newFinding = afterByKey.get(key);
    if (!oldFinding && newFinding) added.push(newFinding);
    else if (oldFinding && !newFinding) resolved.push(oldFinding);
    else if (oldFinding && newFinding && stableHash(oldFinding) !== stableHash(newFinding)) {
      updated.push({ before: oldFinding, after: newFinding });
    }
  }
  return { added, updated, resolved };
}

function diffBom(before: ProfileBomLine[], after: ProfileBomLine[]): CommandDiff["bom"] {
  const beforeByKey = new Map(before.map((line) => [line.aggregateKey, line]));
  const afterByKey = new Map(after.map((line) => [line.aggregateKey, line]));
  const keys = [...new Set([...beforeByKey.keys(), ...afterByKey.keys()])].sort(
    compareCanonicalText,
  );
  const added: ProfileBomLine[] = [];
  const updated: Array<{ before: ProfileBomLine; after: ProfileBomLine }> = [];
  const removed: ProfileBomLine[] = [];
  for (const key of keys) {
    const oldLine = beforeByKey.get(key);
    const newLine = afterByKey.get(key);
    if (!oldLine && newLine) added.push(newLine);
    else if (oldLine && !newLine) removed.push(oldLine);
    else if (oldLine && newLine && stableHash(oldLine) !== stableHash(newLine)) {
      updated.push({ before: oldLine, after: newLine });
    }
  }
  return { added, updated, removed };
}

export function previewCommandEnvelope(
  project: ProjectDocumentV1,
  envelope: CommandEnvelope,
): CommandPreview {
  const next = applyCommandEnvelope(project, envelope);
  const entityDiff = changedRecordKeys(project.entities, next.entities);
  const parameterDiff = changedRecordKeys(parameterState(project), parameterState(next));
  return {
    before: projectIdentity(project),
    after: projectIdentity(next),
    diff: {
      entities: entityDiff,
      parameters: {
        changed: [...parameterDiff.added, ...parameterDiff.updated, ...parameterDiff.removed].sort(
          compareCanonicalText,
        ),
      },
      rules: diffRules(evaluateRules(project), evaluateRules(next)),
      bom: diffBom(deriveProfileBom(project).lines, deriveProfileBom(next).lines),
    },
    project: next,
  };
}
