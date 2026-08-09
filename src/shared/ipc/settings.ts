import { z } from "zod";

import { AppLocaleSchema, type AppLocale } from "../i18n/locale";

export const SetLocaleRequestSchema = z.strictObject({ locale: AppLocaleSchema });

export type SettingsApi = {
  setLocale(locale: AppLocale): Promise<void>;
};
