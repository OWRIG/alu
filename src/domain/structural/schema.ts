import { z } from "zod";

import type { ProjectDocumentV1 } from "../project/schema";
import { EntityIdSchema, FiniteNumberSchema } from "../project/schema";

const NonnegativeNumberSchema = FiniteNumberSchema.nonnegative();
const PositiveNumberSchema = FiniteNumberSchema.positive();
const LoadShareSchema = PositiveNumberSchema.max(1);

export const ProfileCompatibilityGroupSchema = z.enum([
  "misumi-jp-series-6",
  "misumi-jp-series-8",
  "misumi-euro-slot-8",
]);

export const StructuralLoadInputsSchema = z.strictObject({
  panelMassKg: NonnegativeNumberSchema,
  distributedPayloadKg: NonnegativeNumberSchema,
  centerPointPayloadKg: NonnegativeNumberSchema,
  distributedLoadSharePerBeam: LoadShareSchema,
  centerPointLoadSharePerBeam: LoadShareSchema,
});

export const StructuralLoadPatchSchema = z
  .strictObject({
    panelMassKg: NonnegativeNumberSchema.optional(),
    distributedPayloadKg: NonnegativeNumberSchema.optional(),
    centerPointPayloadKg: NonnegativeNumberSchema.optional(),
  })
  .refine((patch) => Object.keys(patch).length > 0, "至少修改一个载荷输入");

export const BeamCandidateSchema = z.strictObject({
  id: EntityIdSchema,
  vendor: z.string().min(1).max(120),
  sku: z.string().min(1).max(120),
  material: z.string().min(1).max(120),
  sectionWidthMm: PositiveNumberSchema,
  sectionHeightMm: PositiveNumberSchema,
  massKgPerM: PositiveNumberSchema,
  inertiaMm4: PositiveNumberSchema,
  orientation: z.enum(["symmetric", "strong-axis-vertical"]),
  compatibilityGroup: ProfileCompatibilityGroupSchema,
  source: z.strictObject({
    title: z.string().min(1).max(200),
    url: z.url(),
    catalogPage: z.string().min(1).max(80),
  }),
});

export const StructuralSizingStudySchema = z.strictObject({
  version: z.literal(1),
  scope: z.literal("twin-longitudinal-top-beams"),
  beamEntityIds: z.array(EntityIdSchema).min(1).max(16),
  effectiveSpanParam: EntityIdSchema,
  maximumSectionHeightParam: EntityIdSchema,
  requiredCompatibilityGroup: ProfileCompatibilityGroupSchema,
  beamCount: z.number().int().positive().max(16),
  gravityNPerKg: PositiveNumberSchema,
  elasticModulusNPerMm2: PositiveNumberSchema,
  deflectionLimitRatio: PositiveNumberSchema,
  loads: StructuralLoadInputsSchema,
  candidates: z.array(BeamCandidateSchema).min(1).max(64),
  assumptionIds: z
    .array(
      z.enum([
        "ideal-simply-supported",
        "linear-elastic",
        "no-panel-composite-action",
        "connections-excluded",
      ]),
    )
    .min(1),
  calculationSources: z
    .array(
      z.strictObject({
        id: EntityIdSchema,
        title: z.string().min(1).max(200),
        url: z.url(),
      }),
    )
    .min(1)
    .max(16),
  constructionEvidence: z
    .array(
      z.strictObject({
        id: z.enum([
          "flush-inset-panel",
          "continuous-main-members",
          "reinforced-load-joints",
          "preloaded-connectors-and-side-rails",
        ]),
        platform: z.literal("xiaohongshu"),
        noteId: EntityIdSchema,
        url: z.url(),
      }),
    )
    .min(1)
    .max(16),
});

export type StructuralLoadInputs = z.infer<typeof StructuralLoadInputsSchema>;
export type StructuralLoadPatch = z.infer<typeof StructuralLoadPatchSchema>;
export type ProfileCompatibilityGroup = z.infer<typeof ProfileCompatibilityGroupSchema>;
export type BeamCandidate = z.infer<typeof BeamCandidateSchema>;
export type StructuralSizingStudy = z.infer<typeof StructuralSizingStudySchema>;

export const STRUCTURAL_SIZING_EXTENSION_KEY = "structuralSizing";

export function getStructuralSizingStudy(project: ProjectDocumentV1): StructuralSizingStudy | null {
  const parsed = StructuralSizingStudySchema.safeParse(
    project.extensions?.[STRUCTURAL_SIZING_EXTENSION_KEY],
  );
  return parsed.success ? parsed.data : null;
}
