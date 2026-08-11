import { z } from "zod";

import { ProjectDocumentV1Schema, type ProjectDocumentV1 } from "../../domain/project/schema";
import type { SettingsApi } from "./settings";

export { PROJECT_IPC } from "./channels";

export const IpcErrorSchema = z.strictObject({
  code: z.string().min(1),
  message: z.string().min(1),
  path: z.string().optional(),
  suggestion: z.string().optional(),
});

export const OpenedProjectSchema = z.strictObject({
  project: ProjectDocumentV1Schema,
  fileName: z.string().min(1),
  fileHash: z.string().regex(/^[a-f0-9]{64}$/),
  bomDrift: z.boolean(),
});

export const RecentProjectSchema = z.strictObject({
  id: z.string().regex(/^[a-f0-9]{64}$/),
  name: z.string().min(1),
  openedAt: z.string().min(1),
});

export const SavedProjectSchema = z.strictObject({
  project: ProjectDocumentV1Schema,
  fileName: z.string().min(1),
  fileHash: z.string().regex(/^[a-f0-9]{64}$/),
});

const FileHashSchema = z.string().regex(/^[a-f0-9]{64}$/);

function resultSchema<T extends z.ZodType>(data: T) {
  return z.discriminatedUnion("ok", [
    z.strictObject({ ok: z.literal(true), data }),
    z.strictObject({ ok: z.literal(false), error: IpcErrorSchema }),
  ]);
}

export const OpenProjectResponseSchema = resultSchema(OpenedProjectSchema.nullable());
export const RecentProjectsResponseSchema = resultSchema(z.array(RecentProjectSchema));
export const SaveProjectResponseSchema = resultSchema(SavedProjectSchema.nullable());
export const OpenRecentRequestSchema = z.strictObject({ id: z.string().regex(/^[a-f0-9]{64}$/) });
export const SaveProjectRequestSchema = z.strictObject({
  project: ProjectDocumentV1Schema,
  expectedFileHash: FileHashSchema.nullable(),
});

export type IpcError = z.infer<typeof IpcErrorSchema>;
export type OpenedProject = z.infer<typeof OpenedProjectSchema>;
export type RecentProject = z.infer<typeof RecentProjectSchema>;
export type SavedProject = z.infer<typeof SavedProjectSchema>;
export type OpenProjectResponse = z.infer<typeof OpenProjectResponseSchema>;
export type RecentProjectsResponse = z.infer<typeof RecentProjectsResponseSchema>;
export type SaveProjectResponse = z.infer<typeof SaveProjectResponseSchema>;

export type AluDesktopApi = {
  project: {
    getLaunch(): Promise<OpenProjectResponse>;
    open(): Promise<OpenProjectResponse>;
    openRecent(id: string): Promise<OpenProjectResponse>;
    recent(): Promise<RecentProjectsResponse>;
    save(project: ProjectDocumentV1, expectedFileHash: string): Promise<SaveProjectResponse>;
    saveAs(project: ProjectDocumentV1): Promise<SaveProjectResponse>;
  };
  settings: SettingsApi;
};
