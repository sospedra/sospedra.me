import en from './en.json'
import es from './es.json'

export const GEO_LOCALES = ['en', 'es'] as const

export type GeoLocale = (typeof GEO_LOCALES)[number]
export type GeoMessages = {
  [Key in keyof typeof en.geo]: string
}

const messages: Record<GeoLocale, GeoMessages> = {
  en: en.geo,
  es: es.geo,
}

export const getGeoMessages = (locale: GeoLocale): GeoMessages =>
  messages[locale]

export const formatGeoMessage = (
  message: string,
  values: Record<string, string | number>,
) =>
  Object.entries(values).reduce(
    (formatted, [key, value]) =>
      formatted.replaceAll(`{${key}}`, String(value)),
    message,
  )
