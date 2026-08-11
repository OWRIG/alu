import { ZodError } from "zod";

import { evaluateParameters } from "../params/evaluate";
import { STRUCTURAL_SIZING_EXTENSION_KEY, StructuralSizingStudySchema } from "../structural/schema";
import { prettyCanonicalStringify } from "./canonical";
import { DomainError } from "./error";
import { computeDefinitionHash } from "./hash";
import {
  ProjectDocumentV1Schema,
  type BindingField,
  type ProfileInstance,
  type ProjectDocumentV1,
} from "./schema";

export const MAX_PROJECT_BYTES = 8 * 1024 * 1024;

export function partKey(partId: string, revision: string): string {
  return `${partId}@${revision}`;
}

function zodPathToPointer(path: PropertyKey[]): string {
  if (path.length === 0) return "";
  return `/${path.map((item) => String(item).replaceAll("~", "~0").replaceAll("/", "~1")).join("/")}`;
}

function schemaError(error: ZodError): DomainError {
  const issue = error.issues[0];
  return new DomainError({
    code: "schema.invalid",
    message: issue?.message ?? "工程格式无效",
    path: issue ? zodPathToPointer(issue.path) : undefined,
    suggestion: "检查错误位置并使用受支持的 ProjectDocument v1 字段",
  });
}

export function getBoundField(profile: ProfileInstance, field: BindingField): number {
  if (field === "lengthMm") return profile.lengthMm;
  if (field === "origin.x") return profile.origin.x;
  if (field === "origin.y") return profile.origin.y;
  return profile.origin.z;
}

export function assertProjectSemantics(project: ProjectDocumentV1): void {
  const values = evaluateParameters(project.parameters);
  const structuralSizingInput = project.extensions?.[STRUCTURAL_SIZING_EXTENSION_KEY];
  if (structuralSizingInput !== undefined) {
    const parsed = StructuralSizingStudySchema.safeParse(structuralSizingInput);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new DomainError({
        code: "structure.sizing-study-invalid",
        message: issue?.message ?? "梁选型研究格式无效",
        path: `/extensions/${STRUCTURAL_SIZING_EXTENSION_KEY}${
          issue?.path.length ? `/${issue.path.join("/")}` : ""
        }`,
      });
    }
    const study = parsed.data;
    if (!(study.effectiveSpanParam in values)) {
      throw new DomainError({
        code: "ref.parameter-missing",
        message: `梁选型研究引用了不存在的跨度参数 ${study.effectiveSpanParam}`,
        path: `/extensions/${STRUCTURAL_SIZING_EXTENSION_KEY}/effectiveSpanParam`,
      });
    }
    if (!(study.maximumSectionHeightParam in values)) {
      throw new DomainError({
        code: "ref.parameter-missing",
        message: `梁选型研究引用了不存在的截面高度参数 ${study.maximumSectionHeightParam}`,
        path: `/extensions/${STRUCTURAL_SIZING_EXTENSION_KEY}/maximumSectionHeightParam`,
      });
    }
    const uniqueBeamIds = new Set(study.beamEntityIds);
    if (
      uniqueBeamIds.size !== study.beamEntityIds.length ||
      study.beamCount !== uniqueBeamIds.size
    ) {
      throw new DomainError({
        code: "structure.sizing-beam-count-mismatch",
        message: "梁选型研究的 beamCount 必须等于唯一主梁实体数量",
        path: `/extensions/${STRUCTURAL_SIZING_EXTENSION_KEY}/beamCount`,
      });
    }
    for (const entityId of study.beamEntityIds) {
      if (!project.entities[entityId]) {
        throw new DomainError({
          code: "ref.entity-missing",
          message: `梁选型研究引用了不存在的型材 ${entityId}`,
          path: `/extensions/${STRUCTURAL_SIZING_EXTENSION_KEY}/beamEntityIds`,
          entityIds: [entityId],
        });
      }
    }
    if (
      new Set(study.candidates.map((candidate) => candidate.id)).size !== study.candidates.length
    ) {
      throw new DomainError({
        code: "structure.sizing-candidate-id-conflict",
        message: "梁选型候选 ID 必须唯一",
        path: `/extensions/${STRUCTURAL_SIZING_EXTENSION_KEY}/candidates`,
      });
    }
  }
  for (const binding of project.bindings) {
    if (!project.entities[binding.entityId]) {
      throw new DomainError({
        code: "ref.entity-missing",
        message: `绑定引用了不存在的型材 ${binding.entityId}`,
        path: "/bindings",
        entityIds: [binding.entityId],
      });
    }
    if (!(binding.param in values)) {
      throw new DomainError({
        code: "ref.parameter-missing",
        message: `绑定引用了不存在的参数 ${binding.param}`,
        path: "/bindings",
        entityIds: [binding.entityId],
      });
    }
  }

  for (const profile of Object.values(project.entities)) {
    const key = partKey(profile.definitionRef.partId, profile.definitionRef.revision);
    const snapshot = project.embeddedParts[key];
    if (!snapshot) {
      throw new DomainError({
        code: "ref.definition-missing",
        message: `型材 ${profile.id} 缺少 definition ${key}`,
        path: `/entities/${profile.id}/definitionRef`,
        entityIds: [profile.id],
        suggestion: "把精确 revision 的型材 definition snapshot 嵌入工程",
      });
    }
    if (
      snapshot.definition.id !== profile.definitionRef.partId ||
      snapshot.definition.revision !== profile.definitionRef.revision
    ) {
      throw new DomainError({
        code: "ref.definition-mismatch",
        message: `型材 ${profile.id} 的 definition 引用与 snapshot 不一致`,
        path: `/embeddedParts/${key}`,
        entityIds: [profile.id],
      });
    }
  }

  for (const [key, snapshot] of Object.entries(project.embeddedParts)) {
    const expectedKey = partKey(snapshot.definition.id, snapshot.definition.revision);
    if (key !== expectedKey) {
      throw new DomainError({
        code: "catalog.snapshot-key-mismatch",
        message: `内嵌 definition key 应为 ${expectedKey}`,
        path: `/embeddedParts/${key}`,
      });
    }
    const actualHash = computeDefinitionHash(snapshot.definition);
    if (actualHash !== snapshot.definitionHash) {
      throw new DomainError({
        code: "catalog.definition-hash-mismatch",
        message: `definition ${key} 内容与 definitionHash 不一致`,
        path: `/embeddedParts/${key}/definitionHash`,
      });
    }
  }
}

export function parseProjectDocument(input: unknown): ProjectDocumentV1 {
  const result = ProjectDocumentV1Schema.safeParse(input);
  if (!result.success) throw schemaError(result.error);
  assertProjectSemantics(result.data);
  return result.data;
}

export function parseProjectJson(source: string): ProjectDocumentV1 {
  if (new TextEncoder().encode(source).length > MAX_PROJECT_BYTES) {
    throw new DomainError({
      code: "project.file-too-large",
      message: "工程文件超过 8 MiB 上限",
    });
  }
  let input: unknown;
  try {
    input = JSON.parse(source);
  } catch {
    throw new DomainError({
      code: "project.invalid-json",
      message: "工程文件不是有效 JSON",
    });
  }
  return parseProjectDocument(input);
}

export function serializeProject(project: ProjectDocumentV1): string {
  const validated = parseProjectDocument(project);
  return prettyCanonicalStringify(validated);
}
