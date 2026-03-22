import en from '../locales/en.json';
import ja from '../locales/ja.json';

type LocaleData = typeof en;
type NestedKeys<T, Prefix extends string = ''> = {
  [K in keyof T]: K extends string
    ? T[K] extends Record<string, unknown>
      ? NestedKeys<T[K], `${Prefix}${K}.`>
      : `${Prefix}${K}`
    : never;
}[keyof T];

export type LocaleKey = NestedKeys<LocaleData>;

const locales: Record<string, LocaleData> = { en, ja };

/**
 * Get a translated string for the given locale and dot-notation key.
 * Placeholders: {0}, {1}, ... are replaced with args.
 */
export function t(locale: string, key: string, ...args: (string | number)[]): string {
  const lang = locales[locale] ?? locales['en'];
  const keys = key.split('.');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let value: any = lang;
  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) break;
  }

  // Fallback to English
  if (typeof value !== 'string') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fallback: any = locales['en'];
    for (const k of keys) {
      fallback = fallback?.[k];
      if (fallback === undefined) break;
    }
    if (typeof fallback === 'string') value = fallback;
    else return key;
  }

  return (value as string).replace(/\{(\d+)\}/g, (_, i: string) => {
    const idx = parseInt(i, 10);
    return args[idx] !== undefined ? String(args[idx]) : `{${i}}`;
  });
}

/**
 * Creates a translator bound to a specific locale.
 */
export function createTranslator(locale: string) {
  return (key: string, ...args: (string | number)[]) => t(locale, key, ...args);
}

export const supportedLanguages = ['en', 'ja'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

export function isValidLanguage(lang: string): lang is SupportedLanguage {
  return (supportedLanguages as readonly string[]).includes(lang);
}
