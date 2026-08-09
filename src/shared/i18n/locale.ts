import { z } from "zod";

export const APP_LOCALES = ["zh-CN", "en-US"] as const;
export const AppLocaleSchema = z.enum(APP_LOCALES);

export type AppLocale = z.infer<typeof AppLocaleSchema>;
