import { z } from "zod";

export const APP_LOCALES = ["en-US", "zh-CN"] as const;
export const AppLocaleSchema = z.enum(APP_LOCALES);

export type AppLocale = z.infer<typeof AppLocaleSchema>;
