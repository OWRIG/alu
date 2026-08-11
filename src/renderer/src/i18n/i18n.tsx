import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { APP_LOCALES, type AppLocale } from "../../../shared/i18n/locale";
import { enUS, zhCN, type MessageKey, type MessageValues } from "./messages";

export const supportedLocales = APP_LOCALES;
export type Locale = AppLocale;
export type Translator = (key: MessageKey, values?: MessageValues) => string;

const DEFAULT_LOCALE: Locale = "en-US";
const STORAGE_KEY = "alu.locale";
const dictionaries = { "en-US": enUS, "zh-CN": zhCN } as const;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && supportedLocales.includes(value as Locale);
}

export function translate(locale: Locale, key: MessageKey, values: MessageValues = {}): string {
  const template = dictionaries[locale][key] ?? enUS[key];
  return template.replace(/\{([a-zA-Z0-9]+)\}/g, (token, name: string) => {
    const value = values[name];
    return value === undefined ? token : String(value);
  });
}

function initialLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isLocale(stored) ? stored : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translator;
  formatNumber: (value: number, maximumFractionDigits?: number) => string;
  formatDateTime: (value: Date) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(initialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // A disabled localStorage should not prevent the editor from running.
    }
    void window.alu.settings.setLocale(locale).catch(() => {
      // Native dialogs keep the main process default if the preference cannot be delivered.
    });
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, values) => translate(locale, key, values),
      formatNumber: (number, maximumFractionDigits = 2) =>
        new Intl.NumberFormat(locale, { maximumFractionDigits }).format(number),
      formatDateTime: (date) =>
        new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(date),
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}
