import en from './messages.en.json'
import es from './messages.es.json'

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

const placeholderPattern = /\{(\w+)\}/g

export const formatGeoMessage = (
  message: string,
  values: Record<string, string | number>,
) =>
  message.replace(placeholderPattern, (match, key: string) =>
    Object.hasOwn(values, key) ? String(values[key]) : match,
  )
