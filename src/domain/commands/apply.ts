import { evaluateParameters } from "../params/evaluate";
import { compareCanonicalText, quantizeMm } from "../project/canonical";
import { DomainError } from "../project/error";
import { computeDefinitionHash } from "../project/hash";
import { assertProjectSemantics, getBoundField, partKey } from "../project/parse";
import {
  ProfileInstanceSchema,
  ProjectDocumentV1Schema,
  type BindingField,
  type JsonValue,
  type ProfileInstance,
  type ProjectDocumentV1,
} from "../project/schema";
import {
  getStructuralSizingStudy,
  STRUCTURAL_SIZING_EXTENSION_KEY,
  StructuralSizingStudySchema,
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

function applySetParameters(
  project: ProjectDocumentV1,
  values: Record<string, number>,
): ProjectDocumentV1 {
  const oldValues = evaluateParameters(project.parameters);
  for (const id of Object.keys(values)) {
    if (!project.parameters.inputs[id]) {
      throw new DomainError({
        code: "dimension.input-missing",
        message: `找不到输入参数 ${id}`,
        path: `/parameters/inputs/${id}`,
      });
    }
  }

  const synchronizedBindings = project.bindings.filter((binding) => {
    const profile = requireProfile(project, binding.entityId);
    return (
      Math.abs(getBoundField(profile, binding.field) - oldValues[binding.param]) <=
      BINDING_TOLERANCE_MM
    );
  });

  const inputs = { ...project.parameters.inputs };
  for (const [id, value] of Object.entries(values)) {
    inputs[id] = { ...inputs[id], valueMm: quantizeMm(value) };
  }
  const parameters = { ...project.parameters, inputs };
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

function applySingle(project: ProjectDocumentV1, command: DomainCommand): ProjectDocumentV1 {
  switch (command.type) {
    case "parameters.set":
      return applySetParameters(project, command.values);
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
      const referencedDefinitions = new Set(
        Object.values(entities).map((profile) =>
          partKey(profile.definitionRef.partId, profile.definitionRef.revision),
        ),
      );
      const embeddedParts = Object.fromEntries(
        Object.entries(project.embeddedParts).filter(([key]) => referencedDefinitions.has(key)),
      );
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
