export type SupportedLocale = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'hi';

export interface LanguageInfo {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  flagEmoji: string;
  isDefault: boolean;
  dir: 'ltr' | 'rtl';
}

export const DEFAULT_LOCALE: SupportedLocale = 'en';

export const SUPPORTED_LANGUAGES: Record<SupportedLocale, LanguageInfo> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flagEmoji: '🇺🇸',
    isDefault: true,
    dir: 'ltr'
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flagEmoji: '🇪🇸',
    isDefault: false,
    dir: 'ltr'
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flagEmoji: '🇫🇷',
    isDefault: false,
    dir: 'ltr'
  },
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flagEmoji: '🇩🇪',
    isDefault: false,
    dir: 'ltr'
  },
  pt: {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    flagEmoji: '🇧🇷',
    isDefault: false,
    dir: 'ltr'
  },
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    flagEmoji: '🇮🇳',
    isDefault: false,
    dir: 'ltr'
  }
};

export const SUPPORTED_LOCALES = Object.keys(SUPPORTED_LANGUAGES) as SupportedLocale[];

/**
 * Checks if the given code is a valid supported locale
 */
export function isValidLocale(code: string | null | undefined): code is SupportedLocale {
  if (!code) return false;
  return Object.prototype.hasOwnProperty.call(SUPPORTED_LANGUAGES, code.toLowerCase());
}

/**
 * Normalizes any locale string to a supported locale or fallback default
 */
export function normalizeLocale(locale?: string | null): SupportedLocale {
  if (!locale) return DEFAULT_LOCALE;
  const clean = locale.toLowerCase().split(/[-_]/)[0];
  if (isValidLocale(clean)) return clean;
  return DEFAULT_LOCALE;
}

/**
 * Extracts locale code from a pathname (e.g. "/es/assessments" -> "es", "/assessments" -> "en")
 */
export function getLocaleFromPath(pathname: string): SupportedLocale {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0 && isValidLocale(segments[0])) {
    return segments[0];
  }
  return DEFAULT_LOCALE;
}

/**
 * Strips the language prefix from a pathname (e.g. "/es/assessments/test" -> "/assessments/test")
 */
export function stripLocaleFromPath(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0 && isValidLocale(segments[0])) {
    const rest = segments.slice(1).join('/');
    return rest ? `/${rest}` : '/';
  }
  return pathname.startsWith('/') ? pathname : `/${pathname}`;
}

export const NON_LOCALIZED_PATH_PREFIXES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/dashboard',
  '/account',
  '/admin',
  '/api',
  '/auth',
  '/_astro'
];

/**
 * Checks if a pathname is non-localized (auth, dashboard, admin, API, etc.)
 */
export function isNonLocalizedPath(pathname: string): boolean {
  if (!pathname) return false;
  const clean = stripLocaleFromPath(pathname);
  const pathOnly = clean.split('?')[0].split('#')[0];
  return NON_LOCALIZED_PATH_PREFIXES.some(
    (prefix) => pathOnly === prefix || pathOnly.startsWith(`${prefix}/`)
  );
}

/**
 * Generates a localized URL for a given route and target locale
 * Root English routes do NOT have an /en prefix to maintain canonical stability
 * Other locales get prefixed: /[locale]/path
 * External links, mailto, tel, anchors, and non-localized paths are left un-prefixed
 */
export function getLocalizedPath(pathname: string, targetLocale: SupportedLocale): string {
  if (!pathname) return '/';
  if (
    pathname.startsWith('mailto:') ||
    pathname.startsWith('tel:') ||
    pathname.startsWith('http://') ||
    pathname.startsWith('https://') ||
    pathname.startsWith('#') ||
    pathname.startsWith('javascript:')
  ) {
    return pathname;
  }
  const cleanPath = stripLocaleFromPath(pathname);
  if (isNonLocalizedPath(cleanPath)) {
    return cleanPath;
  }
  if (targetLocale === DEFAULT_LOCALE) {
    return cleanPath;
  }
  if (cleanPath === '/') {
    return `/${targetLocale}`;
  }
  return `/${targetLocale}${cleanPath}`;
}

/**
 * Formats dates according to the target locale
 */
export function formatLocalizedDate(
  dateInput: string | number | Date,
  locale: SupportedLocale = DEFAULT_LOCALE,
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    const date = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options
    };
    const localeMap: Record<SupportedLocale, string> = {
      en: 'en-US',
      es: 'es-ES',
      fr: 'fr-FR',
      de: 'de-DE',
      pt: 'pt-BR',
      hi: 'hi-IN'
    };
    return new Intl.DateTimeFormat(localeMap[locale] || 'en-US', defaultOptions).format(date);
  } catch {
    return String(dateInput);
  }
}
