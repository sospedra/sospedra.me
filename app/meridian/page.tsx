import { CURRENT_GEO_CHALLENGE } from 'lib/geo/challenges'
import type { Metadata } from 'next'
import MeridianGame from './meridian-game'

export const metadata: Metadata = {
  title: 'Meridian — Daily geography',
  description:
    'A bilingual daily geography signal with shapes, flags, capitals, and a precision world map.',
  alternates: { canonical: '/meridian' },
}

export default function MeridianPage() {
  return <MeridianGame challenge={CURRENT_GEO_CHALLENGE} />
}
