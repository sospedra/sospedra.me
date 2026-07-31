import { loadCurrentGeoChallenge } from 'lib/geo/challenges'
import type { Metadata } from 'next'
import { MERIDIAN_DESC } from 'service/descriptions'
import MeridianGame from './meridian-game'

export const metadata: Metadata = {
  title: 'Meridian — Daily geography',
  description: MERIDIAN_DESC,
  alternates: { canonical: '/meridian' },
}

export default async function MeridianPage() {
  const challenge = await loadCurrentGeoChallenge()
  return <MeridianGame challenge={challenge} />
}
