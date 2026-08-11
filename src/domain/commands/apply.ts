import { evaluateParameters } from "../params/evaluate";
import { compareCanonicalText, quantizeMm } from "../project/canonical";
import { DomainError } from "../project/error";
import { computeDefinitionHash, hashJson } from "../project/hash";
import { assertProjectSemantics, getBoundField, partKey } from "../project/parse";
import {
  ProfileInstanceSchema,
  ProjectDocumentV1Schema,
  type BindingField,
  type JsonValue,
  type ParameterSet,
  type ProfileDefinition,
  type ProfileInstance,
  type ProjectDocumentV1,
} from "../project/schema";
import { evaluateStructuralSizing } from "../structural/evaluate";
import {
  getStructuralSizingStudy,
  STRUCTURAL_SIZING_EXTENSION_KEY,
  StructuralSizingStudySchema,
  type BeamCandidate,
} from "../structural/schema";
import { CommandEnvelopeSchema, type CommandEnvelope, type DomainCommand } from "./schema";

const BINDING_TOLERANCE_MM = 0.005;

function setBoundField(
  profile: ProfileInstance,
  field: BindingField,
  value: number,
): ProfileInstance {
  const quantized = quantizeMm(value);
  if (field === "lengthMm") return { ...profile, lengthMm: quantized };
  const origin = { ...profile.origin };
  if (field === "origin.x") origin.x = quantized;
  else if (field === "origin.y") origin.y = quantized;
  else origin.z = quantized;
  return { ...profile, origin };
}

function requireProfile(project: ProjectDocumentV1, entityId: string): ProfileInstance {
  const profile = project.entities[entityId];
  if (!profile) {
    throw new DomainError({
      code: "ref.entity-missing",
      message: `找不到型材 ${entityId}`,
      path: `/entities/${entityId}`,
      entityIds: [entityId],
    });
  }
  return profile;
}

function pruneEmbeddedParts(
  entities: ProjectDocumentV1["entities"],
  embeddedParts: ProjectDocumentV1["embeddedParts"],
) {
  const referencedDefinitions = new Set(
    Object.values(entities).map((profile) =>
      partKey(profile.definitionRef.partId, profile.definitionRef.revision),
    ),
  );
  return Object.fromEntries(
    Object.entries(embeddedParts).filter(([key]) => referencedDefinitions.has(key)),
  );
}

function applyParameterDefinitions(
  project: ProjectDocumentV1,
  parameters: ParameterSet,
): ProjectDocumentV1 {
  const oldValues = evaluateParameters(project.parameters);
  const synchronizedBindings = project.bindings.filter((binding) => {
    const profile = requireProfile(project, binding.entityId);
    return (
      Math.abs(getBoundField(profile, binding.field) - oldValues[binding.param]) <=
      BINDING_TOLERANCE_MM
    );
  });
  const nextValues = evaluateParameters(parameters);
  let entities = project.entities;
  for (const binding of synchronizedBindings) {
    if (entities === project.entities) entities = { ...entities };
    entities[binding.entityId] = setBoundField(
      entities[binding.entityId],
      binding.field,
      nextValues[binding.param],
    );
  }
  return { ...project, parameters, entities };
}

function applySetParameters(
  project: ProjectDocumentV1,
  values: Record<string, number>,
): ProjectDocumentV1 {
  for (const id of Object.keys(values)) {
    if (!project.parameters.inputs[id]) {
      throw new DomainError({
        code: "dimension.input-missing",
        message: `找不到输入参数 ${id}`,
        path: `/parameters/inputs/${id}`,
      });
    }
  }

  const inputs = { ...project.parameters.inputs };
  for (const [id, value] of Object.entries(values)) {
    inputs[id] = { ...inputs[id], valueMm: quantizeMm(value) };
  }
  const parameters = { ...project.parameters, inputs };
  return applyParameterDefinitions(project, parameters);
}

function assertParameterCanBeRemoved(project: ProjectDocumentV1, id: string) {
  for (const [derivedId, definition] of Object.entries(project.parameters.derived)) {
    if (derivedId !== id && definition.terms.some((term) => term.param === id)) {
      throw new DomainError({
        code: "dimension.parameter-in-use",
        message: `参数 ${id} 仍被派生参数 ${derivedId} 引用`,
        path: `/parameters/derived/${derivedId}/terms`,
        suggestion: "先修改引用它的派生公式",
      });
    }
  }
  const binding = project.bindings.find((item) => item.param === id);
  if (binding) {
    throw new DomainError({
      code: "dimension.parameter-in-use",
      message: `参数 ${id} 仍被构件 ${binding.entityId} 绑定`,
      path: "/bindings",
      entityIds: [binding.entityId],
      suggestion: "先解除字段绑定",
    });
  }
  const study = getStructuralSizingStudy(project);
  const studyParams = study
    ? [
        study.effectiveSpanParam,
        study.maximumSectionHeightParam,
        study.appliedSectionWidthParam,
        study.appliedSectionHeightParam,
      ]
    : [];
  if (studyParams.includes(id)) {
    throw new DomainError({
      code: "dimension.parameter-in-use",
      message: `参数 ${id} 仍被梁选型研究引用`,
      path: `/extensions/${STRUCTURAL_SIZING_EXTENSION_KEY}`,
      suggestion: "先修改或移除梁选型研究",
    });
  }
}

function candidateDefinition(candidate: BeamCandidate): ProfileDefinition {
  const revision = `study-${hashJson(candidate as unknown as JsonValue).slice(0, 16)}`;
  return {
    id: candidate.id,
    revision,
    kind: "profile",
    name: `${candidate.vendor} ${candidate.sku}`,
    unit: "meter",
    section: {
      envelopeUMm: candidate.sectionWidthMm,
      envelopeVMm: candidate.sectionHeightMm,
      representation: "rectangular-envelope",
      referencePoint: "envelope-center",
    },
    procurement: {
      vendor: candidate.vendor,
      sku: candidate.sku,
      productUrl: candidate.source.url,
    },
    evidence: [
      {
        kind: "vendor",
        reference: candidate.source.url,
        confidence: "high",
      },
    ],
    extensions: {
      material: candidate.material,
      massKgPerM: candidate.massKgPerM,
      inertiaMm4: candidate.inertiaMm4,
      compatibilityGroup: candidate.compatibilityGroup,
      catalogPage: candidate.source.catalogPage,
    },
  };
}

function applyStructuralSizingSelection(project: ProjectDocumentV1): ProjectDocumentV1 {
  const result = evaluateStructuralSizing(project);
  if (!result) {
    throw new DomainError({
      code: "structure.sizing-study-missing",
      message: "当前工程没有有效的梁选型研究",
      path: `/extensions/${STRUCTURAL_SIZING_EXTENSION_KEY}`,
    });
  }
  if (!result.selected) {
    throw new DomainError({
      code: "structure.sizing-selection-missing",
      message: "当前候选集中没有可应用的入选型材",
      path: `/extensions/${STRUCTURAL_SIZING_EXTENSION_KEY}/candidates`,
      suggestion: "先调整明确的载荷或空间约束",
    });
  }

  const { study, selected } = result;
  const sectionValues: Record<string, number> = {};
  for (const [param, value] of [
    [study.appliedSectionWidthParam, selected.candidate.sectionWidthMm],
    [study.appliedSectionHeightParam, selected.candidate.sectionHeightMm],
  ] as const) {
    if (!param) continue;
    if (!project.parameters.inputs[param]) {
      throw new DomainError({
        code: "structure.section-parameter-not-input",
        message: `实际截面参数 ${param} 必须是可编辑输入参数`,
        path: `/parameters/inputs/${param}`,
      });
    }
    sectionValues[param] = value;
  }
  let next =
    Object.keys(sectionValues).length > 0 ? applySetParameters(project, sectionValues) : project;

  const definition = candidateDefinition(selected.candidate);
  const definitionSnapshot = {
    definition,
    definitionHash: computeDefinitionHash(definition),
  };
  const definitionRef = { partId: definition.id, revision: definition.revision };
  const entities = { ...next.entities };
  for (const entityId of study.beamEntityIds) {
    const profile = requireProfile(next, entityId);
    const rotationAroundAxisDeg =
      selected.candidate.orientation === "strong-axis-vertical"
        ? profile.axis === "x"
          ? 0
          : profile.axis === "y"
            ? 90
            : profile.rotationAroundAxisDeg
        : profile.rotationAroundAxisDeg;
    entities[entityId] = ProfileInstanceSchema.parse({
      ...profile,
      definitionRef,
      rotationAroundAxisDeg,
    });
  }
  const key = partKey(definition.id, definition.revision);
  const existing = next.embeddedParts[key];
  if (existing && existing.definitionHash !== definitionSnapshot.definitionHash) {
    throw new DomainError({
      code: "catalog.definition-conflict",
      message: `definition ${key} 与工程内快照冲突`,
      path: `/embeddedParts/${key}`,
    });
  }
  const embeddedParts = pruneEmbeddedParts(entities, {
    ...next.embeddedParts,
    [key]: definitionSnapshot,
  });
  next = { ...next, entities, embeddedParts };
  return next;
}

function applySingle(project: ProjectDocumentV1, command: DomainCommand): ProjectDocumentV1 {
  switch (command.type) {
    case "parameters.set":
      return applySetParameters(project, command.values);
    case "parameter.input.upsert": {
      if (project.parameters.derived[command.id]) {
        throw new DomainError({
          code: "dimension.parameter-kind-conflict",
          message: `参数 ${command.id} 已是派生参数`,
          path: `/parameters/derived/${command.id}`,
        });
      }
      const parameters = {
        ...project.parameters,
        inputs: {
          ...project.parameters.inputs,
          [command.id]: {
            ...command.definition,
            valueMm: quantizeMm(command.definition.valueMm),
          },
        },
      };
      return applyParameterDefinitions(project, parameters);
    }
    case "parameter.derived.upsert": {
      if (project.parameters.inputs[command.id]) {
        throw new DomainError({
          code: "dimension.parameter-kind-conflict",
          message: `参数 ${command.id} 已是输入参数`,
          path: `/parameters/inputs/${command.id}`,
        });
      }
      const parameters = {
        ...project.parameters,
        derived: {
          ...project.parameters.derived,
          [command.id]: {
            ...command.definition,
            constantMm: quantizeMm(command.definition.constantMm),
          },
        },
      };
      return applyParameterDefinitions(project, parameters);
    }
    case "parameter.remove": {
      const exists =
        project.parameters.inputs[command.id] || project.parameters.derived[command.id];
      if (!exists) {
        throw new DomainError({
          code: "ref.parameter-missing",
          message: `找不到参数 ${command.id}`,
          path: `/parameters/${command.id}`,
        });
      }
      assertParameterCanBeRemoved(project, command.id);
      const inputs = { ...project.parameters.inputs };
      const derived = { ...project.parameters.derived };
      delete inputs[command.id];
      delete derived[command.id];
      return { ...project, parameters: { inputs, derived } };
    }
    case "profile.add": {
      if (project.entities[command.profile.id]) {
        throw new DomainError({
          code: "entity.id-conflict",
          message: `实体 ID 已存在：${command.profile.id}`,
          path: `/entities/${command.profile.id}`,
          entityIds: [command.profile.id],
        });
      }
      const definition = command.definitionSnapshot.definition;
      if (
        command.profile.definitionRef.partId !== definition.id ||
        command.profile.definitionRef.revision !== definition.revision
      ) {
        throw new DomainError({
          code: "ref.definition-mismatch",
          message: "新增型材的 definitionRef 与 snapshot 不一致",
          entityIds: [command.profile.id],
        });
      }
      if (computeDefinitionHash(definition) !== command.definitionSnapshot.definitionHash) {
        throw new DomainError({
          code: "catalog.definition-hash-mismatch",
          message: "新增型材 definitionHash 不匹配",
          entityIds: [command.profile.id],
        });
      }
      const key = partKey(definition.id, definition.revision);
      const existing = project.embeddedParts[key];
      if (existing && existing.definitionHash !== command.definitionSnapshot.definitionHash) {
        throw new DomainError({
          code: "catalog.definition-conflict",
          message: `definition ${key} 与工程内快照冲突`,
          path: `/embeddedParts/${key}`,
        });
      }
      const profile = ProfileInstanceSchema.parse({
        ...command.profile,
        origin: {
          x: quantizeMm(command.profile.origin.x),
          y: quantizeMm(command.profile.origin.y),
          z: quantizeMm(command.profile.origin.z),
        },
        lengthMm: quantizeMm(command.profile.lengthMm),
      });
      return {
        ...project,
        entities: { ...project.entities, [profile.id]: profile },
        embeddedParts: existing
          ? project.embeddedParts
          : { ...project.embeddedParts, [key]: command.definitionSnapshot },
      };
    }
    case "profile.update": {
      const current = requireProfile(project, command.entityId);
      const patch = command.patch;
      const updated = ProfileInstanceSchema.parse({
        ...current,
        ...patch,
        origin: patch.origin
          ? {
              x: quantizeMm(patch.origin.x),
              y: quantizeMm(patch.origin.y),
              z: quantizeMm(patch.origin.z),
            }
          : current.origin,
        lengthMm: patch.lengthMm === undefined ? current.lengthMm : quantizeMm(patch.lengthMm),
      });
      return { ...project, entities: { ...project.entities, [command.entityId]: updated } };
    }
    case "entity.remove": {
      requireProfile(project, command.entityId);
      const entities = { ...project.entities };
      delete entities[command.entityId];
      const embeddedParts = pruneEmbeddedParts(entities, project.embeddedParts);
      return {
        ...project,
        entities,
        embeddedParts,
        bindings: project.bindings.filter((binding) => binding.entityId !== command.entityId),
      };
    }
    case "binding.set": {
      const profile = requireProfile(project, command.entityId);
      const parameterValues = evaluateParameters(project.parameters);
      if (!(command.param in parameterValues)) {
        throw new DomainError({
          code: "ref.parameter-missing",
          message: `找不到参数 ${command.param}`,
          path: `/parameters/${command.param}`,
        });
      }
      const bindings = project.bindings.filter(
        (binding) => !(binding.entityId === command.entityId && binding.field === command.field),
      );
      bindings.push({ entityId: command.entityId, field: command.field, param: command.param });
      bindings.sort((a, b) =>
        compareCanonicalText(`${a.entityId}:${a.field}`, `${b.entityId}:${b.field}`),
      );
      return {
        ...project,
        bindings,
        entities: {
          ...project.entities,
          [command.entityId]: setBoundField(profile, command.field, parameterValues[command.param]),
        },
      };
    }
    case "binding.remove":
      return {
        ...project,
        bindings: project.bindings.filter(
          (binding) => !(binding.entityId === command.entityId && binding.field === command.field),
        ),
      };
    case "binding.resync": {
      const binding = project.bindings.find(
        (item) => item.entityId === command.entityId && item.field === command.field,
      );
      if (!binding) {
        throw new DomainError({
          code: "binding.missing",
          message: "找不到需要重同步的绑定",
          entityIds: [command.entityId],
        });
      }
      const profile = requireProfile(project, command.entityId);
      const values = evaluateParameters(project.parameters);
      return {
        ...project,
        entities: {
          ...project.entities,
          [command.entityId]: setBoundField(profile, command.field, values[binding.param]),
        },
      };
    }
    case "structural-sizing.loads.set": {
      const study = getStructuralSizingStudy(project);
      if (!study) {
        throw new DomainError({
          code: "structure.sizing-study-missing",
          message: "当前工程没有可编辑的梁选型研究",
          path: `/extensions/${STRUCTURAL_SIZING_EXTENSION_KEY}`,
        });
      }
      const nextStudy = StructuralSizingStudySchema.parse({
        ...study,
        loads: { ...study.loads, ...command.patch },
      });
      return {
        ...project,
        extensions: {
          ...project.extensions,
          [STRUCTURAL_SIZING_EXTENSION_KEY]: nextStudy as unknown as JsonValue,
        },
      };
    }
    case "structural-sizing.selection.apply":
      return applyStructuralSizingSelection(project);
  }
}

export function applyCommandEnvelope(
  project: ProjectDocumentV1,
  envelopeInput: CommandEnvelope,
): ProjectDocumentV1 {
  const parsed = CommandEnvelopeSchema.safeParse(envelopeInput);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new DomainError({
      code: "command.schema-invalid",
      message: issue?.message ?? "命令格式无效",
      path: issue ? `/${issue.path.join("/")}` : undefined,
    });
  }
  const envelope = parsed.data;
  if (project.revision !== envelope.expectedProjectRevision) {
    throw new DomainError({
      code: "revision.conflict",
      message: `工程 revision 已从 ${envelope.expectedProjectRevision} 变为 ${project.revision}`,
      path: "/expectedProjectRevision",
      suggestion: "重新读取工程并基于最新 revision 生成命令",
    });
  }

  let next = project;
  for (const command of envelope.commands) next = applySingle(next, command);
  next = { ...next, revision: project.revision + 1 };
  const schemaResult = ProjectDocumentV1Schema.safeParse(next);
  if (!schemaResult.success) {
    const issue = schemaResult.error.issues[0];
    throw new DomainError({
      code: "project.command-result-invalid",
      message: issue?.message ?? "命令结果无效",
      path: issue ? `/${issue.path.join("/")}` : undefined,
    });
  }
  assertProjectSemantics(schemaResult.data);
  return schemaResult.data;
}

export function createCommandEnvelope(
  project: ProjectDocumentV1,
  commands: DomainCommand[],
  commandId = `command.${globalThis.crypto.randomUUID()}`,
): CommandEnvelope {
  return {
    commandVersion: 1,
    commandId,
    expectedProjectRevision: project.revision,
    commands,
  };
}
