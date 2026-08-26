import { en } from './ui/en';
import { es } from './ui/es';
import { fr } from './ui/fr';
import { de } from './ui/de';
import { pt } from './ui/pt';
import { hi } from './ui/hi';
import {
  type SupportedLocale,
  DEFAULT_LOCALE,
  SUPPORTED_LANGUAGES,
  SUPPORTED_LOCALES,
  isValidLocale,
  normalizeLocale,
  getLocaleFromPath,
  stripLocaleFromPath,
  getLocalizedPath,
  formatLocalizedDate
} from './config';

export {
  type SupportedLocale,
  DEFAULT_LOCALE,
  SUPPORTED_LANGUAGES,
  SUPPORTED_LOCALES,
  isValidLocale,
  normalizeLocale,
  getLocaleFromPath,
  stripLocaleFromPath,
  getLocalizedPath,
  formatLocalizedDate
};

export const dictionaries: Record<SupportedLocale, typeof en> = {
  en,
  es,
  fr,
  de,
  pt,
  hi
};

/**
 * Returns the dictionary object for a given locale with fallback to English
 */
export function getTranslations(locale: string | null | undefined): typeof en {
  const norm = normalizeLocale(locale);
  return dictionaries[norm] || dictionaries[DEFAULT_LOCALE];
}

/**
 * Hook-style translation function resolver for components
 */
export function useTranslations(locale: string | null | undefined) {
  const t = getTranslations(locale);
  const activeLocale = normalizeLocale(locale);

  /**
   * Helper to interpolate variables like {name} in translation strings
   */
  function interpolate(text: string, vars?: Record<string, string | number>): string {
    if (!vars) return text;
    let result = text;
    for (const [key, val] of Object.entries(vars)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val));
    }
    return result;
  }

  return {
    t,
    locale: activeLocale,
    interpolate,
    isRtl: SUPPORTED_LANGUAGES[activeLocale]?.dir === 'rtl',
    langInfo: SUPPORTED_LANGUAGES[activeLocale]
  };
}

/**
 * Resolves locale from an Astro URL object, request, or pathname
 */
export function getLocaleFromUrl(url: URL | string): SupportedLocale {
  const pathname = typeof url === 'string' ? url : url.pathname;
  return getLocaleFromPath(pathname);
}
