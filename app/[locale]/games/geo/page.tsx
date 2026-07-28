import GeoGame from 'components/geo/GeoGame'
import { CURRENT_GEO_CHALLENGE } from 'lib/geo/challenges'
import { GEO_LOCALES, getGeoMessages, isGeoLocale } from 'messages/geo'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

type PageProps = {
  params: Promise<{ locale: string }>
}

export const generateStaticParams = () =>
  GEO_LOCALES.map((locale) => ({ locale }))

export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const { locale } = await params
  if (!isGeoLocale(locale)) return {}
  const copy = getGeoMessages(locale)
  const description =
    locale === 'en'
      ? 'A bilingual daily geography signal: shapes, flags, capitals and a precision world map.'
      : 'Una señal geográfica diaria bilingüe: siluetas, banderas, capitales y un mapamundi de precisión.'

  return {
    title: `${copy.brand} — ${copy.edition}`,
    description,
    alternates: {
      canonical: '/meridian',
    },
  }
}

export default async function DailyGeoPage({ params }: PageProps) {
  const { locale } = await params
  if (!isGeoLocale(locale)) notFound()

  return (
    <GeoGame
      challenge={CURRENT_GEO_CHALLENGE}
      locale={locale}
      mode='daily'
      routeKind='today'
    />
  )
}
