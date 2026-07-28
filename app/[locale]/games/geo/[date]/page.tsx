import GeoGame from 'components/geo/GeoGame'
import { GEO_CHALLENGE_DATES, getGeoChallenge } from 'lib/geo/challenges'
import { GEO_LOCALES, getGeoMessages, isGeoLocale } from 'messages/geo'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

type PageProps = {
  params: Promise<{ date: string; locale: string }>
}

export const generateStaticParams = () =>
  GEO_LOCALES.flatMap((locale) =>
    GEO_CHALLENGE_DATES.map((date) => ({ date, locale })),
  )

export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const { date, locale } = await params
  if (!isGeoLocale(locale) || !getGeoChallenge(date)) return {}
  const copy = getGeoMessages(locale)

  return {
    title: `${copy.brand} — ${date}`,
    description:
      locale === 'en'
        ? `Play the bilingual geography challenge published on ${date}.`
        : `Juega al desafío geográfico bilingüe publicado el ${date}.`,
    alternates: {
      canonical: '/meridian',
    },
  }
}

export default async function ArchivedGeoPage({ params }: PageProps) {
  const { date, locale } = await params
  if (!isGeoLocale(locale)) notFound()
  const challenge = getGeoChallenge(date)
  if (!challenge) notFound()

  return (
    <GeoGame
      challenge={challenge}
      locale={locale}
      mode='daily'
      routeKind='archive'
    />
  )
}
