import { z } from "zod";

export const APP_LOCALES = ["zh-CN", "en-US"] as const;
export const AppLocaleSchema = z.enum(APP_LOCALES);
export const DEFAULT_APP_LOCALE = "zh-CN" satisfies (typeof APP_LOCALES)[number];

export type AppLocale = z.infer<typeof AppLocaleSchema>;
