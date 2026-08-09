import { z } from "zod";

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.null(),
    z.boolean(),
    z.number().finite(),
    z.string(),
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
  ]),
);

export const EntityIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/, "ID 只能包含字母、数字、点、下划线、冒号和连字符")
  .refine(
    (value) => !["__proto__", "constructor", "prototype"].includes(value),
    "ID 不能使用保留对象键",
  );

export const FiniteNumberSchema = z.number().finite();
export const PositiveMmSchema = FiniteNumberSchema.positive("长度必须大于 0 mm");

export const Vec3MmSchema = z.strictObject({
  x: FiniteNumberSchema,
  y: FiniteNumberSchema,
  z: FiniteNumberSchema,
});

export const ProjectContextSchema = z.strictObject({
  usage: z.array(z.string().min(1).max(80)).max(32),
  humanLoad: z.union([z.boolean(), z.literal("unknown")]),
  childAccess: z.union([z.boolean(), z.literal("unknown")]),
  mobility: z.enum(["static", "casters", "unknown"]),
  floor: z.enum(["wood", "tile", "carpet", "concrete", "unknown"]),
  loads: z.array(z.string().min(1).max(80)).max(64),
  notes: z.string().max(4_000).optional(),
});

export const BoundaryKindSchema = z.enum([
  "obstacle-outer",
  "clearance",
  "inner-clear",
  "frame-outer",
  "panel",
  "height",
  "generic",
]);

export const ParameterInputSchema = z.strictObject({
  valueMm: FiniteNumberSchema,
  label: z.string().min(1).max(100).optional(),
  boundaryKind: BoundaryKindSchema.optional(),
});

export const ParameterTermSchema = z.strictObject({
  param: EntityIdSchema,
  coef: FiniteNumberSchema,
});

export const DerivedParameterSchema = z.strictObject({
  label: z.string().min(1).max(100).optional(),
  terms: z.array(ParameterTermSchema).min(1).max(64),
  constantMm: FiniteNumberSchema,
});

export const ParameterSetSchema = z.strictObject({
  inputs: z.record(EntityIdSchema, ParameterInputSchema),
  derived: z.record(EntityIdSchema, DerivedParameterSchema),
});

export const BindingFieldSchema = z.enum(["lengthMm", "origin.x", "origin.y", "origin.z"]);

export const ParameterBindingSchema = z.strictObject({
  entityId: EntityIdSchema,
  field: BindingFieldSchema,
  param: EntityIdSchema,
});

export const PartRefSchema = z.strictObject({
  partId: EntityIdSchema,
  revision: z.string().min(1).max(64),
});

export const EndCutSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("square") }),
  z.strictObject({
    kind: z.literal("miter"),
    angleDeg: FiniteNumberSchema.min(-89.99).max(89.99),
  }),
]);

export const ProfileInstanceSchema = z.strictObject({
  id: EntityIdSchema,
  kind: z.literal("profile"),
  definitionRef: PartRefSchema,
  origin: Vec3MmSchema,
  axis: z.enum(["x", "y", "z"]),
  lengthMm: PositiveMmSchema,
  rotationAroundAxisDeg: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
  purpose: z.string().min(1).max(160),
  endCutA: EndCutSchema,
  endCutB: EndCutSchema,
});

export const EvidenceRefSchema = z.strictObject({
  kind: z.enum(["vendor", "standard", "calculation", "field-guide", "user"]),
  reference: z.string().min(1).max(500),
  confidence: z.enum(["high", "medium", "low"]),
});

export const ProfileDefinitionSchema = z.strictObject({
  id: EntityIdSchema,
  revision: z.string().min(1).max(64),
  kind: z.literal("profile"),
  name: z.string().min(1).max(160),
  unit: z.enum(["meter", "millimeter"]),
  section: z.strictObject({
    envelopeUMm: PositiveMmSchema,
    envelopeVMm: PositiveMmSchema,
    representation: z.enum(["rectangular-envelope", "verified-t-slot"]),
    referencePoint: z.literal("envelope-center"),
  }),
  procurement: z
    .strictObject({
      vendor: z.string().min(1).max(160).optional(),
      sku: z.string().min(1).max(160).optional(),
      productUrl: z.url().optional(),
    })
    .optional(),
  evidence: z.array(EvidenceRefSchema).min(1).max(32),
  extensions: z.record(z.string(), JsonValueSchema).optional(),
});

export const EmbeddedProfileSnapshotSchema = z.strictObject({
  definition: ProfileDefinitionSchema,
  definitionHash: z.string().regex(/^[a-f0-9]{64}$/),
});

export const ProfileBomLineSchema = z.strictObject({
  aggregateKey: z.string().min(1),
  definitionRef: PartRefSchema,
  definitionName: z.string().min(1),
  lengthMm: PositiveMmSchema,
  rotationAroundAxisDeg: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
  purpose: z.string().min(1),
  quantity: z.number().int().positive(),
  sourceEntityIds: z.array(EntityIdSchema).min(1),
});

export const ProfileBomSnapshotSchema = z.strictObject({
  generatedFromDesignHash: z.string().regex(/^[a-f0-9]{64}$/),
  bomHash: z.string().regex(/^[a-f0-9]{64}$/),
  generatedAt: z.string().min(1),
  lines: z.array(ProfileBomLineSchema),
});

export const ProjectDocumentV1Schema = z
  .strictObject({
    formatVersion: z.literal(1),
    projectId: EntityIdSchema,
    revision: z.number().int().nonnegative(),
    meta: z.strictObject({
      name: z.string().min(1).max(200),
      createdAt: z.string().min(1),
      updatedAt: z.string().min(1),
      appVersion: z.string().min(1).max(80),
      units: z.literal("mm"),
    }),
    context: ProjectContextSchema,
    parameters: ParameterSetSchema,
    bindings: z.array(ParameterBindingSchema).max(10_000),
    entities: z.record(EntityIdSchema, ProfileInstanceSchema),
    embeddedParts: z.record(z.string(), EmbeddedProfileSnapshotSchema),
    bomSnapshot: ProfileBomSnapshotSchema.optional(),
    extensions: z.record(z.string(), JsonValueSchema).optional(),
  })
  .superRefine((project, context) => {
    const parameterCount =
      Object.keys(project.parameters.inputs).length +
      Object.keys(project.parameters.derived).length;
    if (parameterCount > 1_000) {
      context.addIssue({
        code: "custom",
        message: "参数数量不能超过 1000",
        path: ["parameters"],
      });
    }
    if (Object.keys(project.entities).length > 10_000) {
      context.addIssue({ code: "custom", message: "实体数量不能超过 10000", path: ["entities"] });
    }
    if (Object.keys(project.embeddedParts).length > 2_000) {
      context.addIssue({
        code: "custom",
        message: "内嵌 definition 不能超过 2000",
        path: ["embeddedParts"],
      });
    }
    for (const [id, entity] of Object.entries(project.entities)) {
      if (entity.id !== id) {
        context.addIssue({
          code: "custom",
          message: "实体 record key 必须与实体 id 一致",
          path: ["entities", id, "id"],
        });
      }
    }
  });

export type Vec3Mm = z.infer<typeof Vec3MmSchema>;
export type ProjectContext = z.infer<typeof ProjectContextSchema>;
export type ParameterInput = z.infer<typeof ParameterInputSchema>;
export type DerivedParameter = z.infer<typeof DerivedParameterSchema>;
export type ParameterSet = z.infer<typeof ParameterSetSchema>;
export type BindingField = z.infer<typeof BindingFieldSchema>;
export type ParameterBinding = z.infer<typeof ParameterBindingSchema>;
export type PartRef = z.infer<typeof PartRefSchema>;
export type ProfileInstance = z.infer<typeof ProfileInstanceSchema>;
export type ProfileDefinition = z.infer<typeof ProfileDefinitionSchema>;
export type EmbeddedProfileSnapshot = z.infer<typeof EmbeddedProfileSnapshotSchema>;
export type ProfileBomLine = z.infer<typeof ProfileBomLineSchema>;
export type ProfileBomSnapshot = z.infer<typeof ProfileBomSnapshotSchema>;
export type ProjectDocumentV1 = z.infer<typeof ProjectDocumentV1Schema>;
