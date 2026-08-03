import type { Metadata } from 'next'
import { loadCurrentGeoChallenge } from './challenges.server-snapshot'
import MeridianGame from './meridian-game'

export const metadata: Metadata = {
  title: 'Meridian — Daily geography',
  description:
    'A bilingual daily geography signal with shapes, flags, capitals, and a precision world map.',
  alternates: { canonical: '/meridian' },
}

export default async function MeridianPage() {
  const challenge = await loadCurrentGeoChallenge()
  return <MeridianGame challenge={challenge} />
}
