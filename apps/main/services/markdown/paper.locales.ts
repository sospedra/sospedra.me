/**
 * Locale data for translated papers. No MDX imports live here: the proxy loads
 * this module on every /papers/<slug> request and must stay tiny.
 */

export const PAPER_LOCALES = ['da', 'es', 'fr', 'is', 'pt', 'ru'] as const

export type PaperLocale = (typeof PAPER_LOCALES)[number]

/** The canonical language, which has no locale segment in the URL. */
export const DEFAULT_LOCALE = 'en'

export type ReaderLocale = PaperLocale | typeof DEFAULT_LOCALE

export const LOCALE_LABEL: Record<ReaderLocale, string> = {
  da: 'Dansk',
  en: 'English',
  es: 'Español',
  fr: 'Français',
  is: 'Íslenska',
  pt: 'Português',
  ru: 'Русский',
}

export const TRANSLATED_PAPERS: Record<string, readonly PaperLocale[]> = {
  'total-eclipse': ['es', 'pt', 'fr', 'is', 'da', 'ru'],
}

/** Only countries with one dominant language among the set above. */
const COUNTRY_LOCALE: Record<string, PaperLocale> = {
  AO: 'pt',
  AR: 'es',
  BF: 'fr',
  BJ: 'fr',
  BO: 'es',
  BR: 'pt',
  BY: 'ru',
  CD: 'fr',
  CG: 'fr',
  CI: 'fr',
  CL: 'es',
  CO: 'es',
  CR: 'es',
  CU: 'es',
  CV: 'pt',
  DK: 'da',
  DO: 'es',
  EC: 'es',
  ES: 'es',
  FO: 'da',
  FR: 'fr',
  GA: 'fr',
  GL: 'da',
  GN: 'fr',
  GQ: 'es',
  GT: 'es',
  GW: 'pt',
  HN: 'es',
  IS: 'is',
  KG: 'ru',
  KZ: 'ru',
  ML: 'fr',
  MC: 'fr',
  MX: 'es',
  MZ: 'pt',
  NE: 'fr',
  NI: 'es',
  PA: 'es',
  PE: 'es',
  PR: 'es',
  PT: 'pt',
  PY: 'es',
  RU: 'ru',
  SN: 'fr',
  ST: 'pt',
  SV: 'es',
  TG: 'fr',
  TL: 'pt',
  UY: 'es',
  VE: 'es',
}

export const localesOf = (slug: string): readonly PaperLocale[] =>
  TRANSLATED_PAPERS[slug] ?? []

export const isPaperLocale = (value: string): value is PaperLocale =>
  (PAPER_LOCALES as readonly string[]).includes(value)

export const localeFromCountry = (code: string | null): PaperLocale | null => {
  if (!code) return null
  return COUNTRY_LOCALE[code.toUpperCase()] ?? null
}

type LanguageRange = { tag: string; quality: number }

const parseRange = (part: string): LanguageRange => {
  const [tag, ...params] = part.trim().split(';')
  const weight = params.find((param) => param.trim().startsWith('q='))
  const quality = weight ? Number(weight.trim().slice(2)) : 1
  return {
    tag: tag.toLowerCase().split('-')[0],
    quality: Number.isFinite(quality) ? quality : 0,
  }
}

/** The first Accept-Language entry this site can serve, English included. */
export const localeFromHeader = (
  header: string | null,
): ReaderLocale | null => {
  if (!header) return null
  const ranked = header
    .split(',')
    .map(parseRange)
    .filter((range) => range.quality > 0)
    .toSorted((left, right) => right.quality - left.quality)
  const hit = ranked.find(
    (range) => range.tag === DEFAULT_LOCALE || isPaperLocale(range.tag),
  )
  return (hit?.tag as ReaderLocale) ?? null
}

export const paperPath = (slug: string, locale: ReaderLocale): string =>
  locale === DEFAULT_LOCALE ? `/papers/${slug}` : `/papers/${slug}/${locale}`

/** `pnpm cli og` writes exactly these files, so nothing has to be recorded. */
export const paperCardPath = (slug: string, locale: ReaderLocale): string =>
  locale === DEFAULT_LOCALE
    ? `/papers/${slug}.png`
    : `/papers/${slug}.${locale}.png`
