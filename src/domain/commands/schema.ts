import { z } from "zod";

import {
  BindingFieldSchema,
  EmbeddedProfileSnapshotSchema,
  DerivedParameterSchema,
  EntityIdSchema,
  FiniteNumberSchema,
  ParameterInputSchema,
  PositiveMmSchema,
  ProfileInstanceSchema,
  Vec3MmSchema,
} from "../project/schema";
import { StructuralLoadPatchSchema } from "../structural/schema";

export const SetParametersCommandSchema = z.strictObject({
  type: z.literal("parameters.set"),
  values: z.record(EntityIdSchema, FiniteNumberSchema),
});

export const UpsertInputParameterCommandSchema = z.strictObject({
  type: z.literal("parameter.input.upsert"),
  id: EntityIdSchema,
  definition: ParameterInputSchema,
});

export const UpsertDerivedParameterCommandSchema = z.strictObject({
  type: z.literal("parameter.derived.upsert"),
  id: EntityIdSchema,
  definition: DerivedParameterSchema,
});

export const RemoveParameterCommandSchema = z.strictObject({
  type: z.literal("parameter.remove"),
  id: EntityIdSchema,
});

export const AddProfileCommandSchema = z.strictObject({
  type: z.literal("profile.add"),
  profile: ProfileInstanceSchema,
  definitionSnapshot: EmbeddedProfileSnapshotSchema,
});

export const UpdateProfilePatchSchema = z
  .strictObject({
    origin: Vec3MmSchema.optional(),
    axis: z.enum(["x", "y", "z"]).optional(),
    lengthMm: PositiveMmSchema.optional(),
    rotationAroundAxisDeg: z
      .union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)])
      .optional(),
    purpose: z.string().min(1).max(160).optional(),
  })
  .refine((patch) => Object.keys(patch).length > 0, "至少修改一个型材字段");

export const UpdateProfileCommandSchema = z.strictObject({
  type: z.literal("profile.update"),
  entityId: EntityIdSchema,
  patch: UpdateProfilePatchSchema,
});

export const RemoveEntityCommandSchema = z.strictObject({
  type: z.literal("entity.remove"),
  entityId: EntityIdSchema,
});

export const BindFieldCommandSchema = z.strictObject({
  type: z.literal("binding.set"),
  entityId: EntityIdSchema,
  field: BindingFieldSchema,
  param: EntityIdSchema,
});

export const UnbindFieldCommandSchema = z.strictObject({
  type: z.literal("binding.remove"),
  entityId: EntityIdSchema,
  field: BindingFieldSchema,
});

export const ResyncBindingCommandSchema = z.strictObject({
  type: z.literal("binding.resync"),
  entityId: EntityIdSchema,
  field: BindingFieldSchema,
});

export const SetStructuralSizingLoadsCommandSchema = z.strictObject({
  type: z.literal("structural-sizing.loads.set"),
  patch: StructuralLoadPatchSchema,
});

export const ApplyStructuralSizingSelectionCommandSchema = z.strictObject({
  type: z.literal("structural-sizing.selection.apply"),
});

export const DomainCommandSchema = z.discriminatedUnion("type", [
  SetParametersCommandSchema,
  UpsertInputParameterCommandSchema,
  UpsertDerivedParameterCommandSchema,
  RemoveParameterCommandSchema,
  AddProfileCommandSchema,
  UpdateProfileCommandSchema,
  RemoveEntityCommandSchema,
  BindFieldCommandSchema,
  UnbindFieldCommandSchema,
  ResyncBindingCommandSchema,
  SetStructuralSizingLoadsCommandSchema,
  ApplyStructuralSizingSelectionCommandSchema,
]);

export const CommandEnvelopeSchema = z.strictObject({
  commandVersion: z.literal(1),
  commandId: EntityIdSchema,
  expectedProjectRevision: z.number().int().nonnegative(),
  commands: z.array(DomainCommandSchema).min(1).max(1_000),
});

export type DomainCommand = z.infer<typeof DomainCommandSchema>;
export type CommandEnvelope = z.infer<typeof CommandEnvelopeSchema>;
export type UpdateProfilePatch = z.infer<typeof UpdateProfilePatchSchema>;
