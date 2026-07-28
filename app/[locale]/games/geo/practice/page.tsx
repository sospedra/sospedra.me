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

  return {
    title: `${copy.brand} — ${copy.practice}`,
    description:
      locale === 'en'
        ? 'Untimed or timed geography training outside the official daily result.'
        : 'Entrenamiento geográfico con o sin tiempo, fuera del resultado diario oficial.',
    alternates: {
      canonical: '/meridian',
    },
  }
}

export default async function GeoPracticePage({ params }: PageProps) {
  const { locale } = await params
  if (!isGeoLocale(locale)) notFound()

  return (
    <GeoGame
      challenge={CURRENT_GEO_CHALLENGE}
      locale={locale}
      mode='practice'
      routeKind='practice'
    />
  )
}
