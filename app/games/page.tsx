import type { Metadata } from 'next'
import { GAMES_DESC } from 'service/descriptions'
import GamesView from './games-view'

export const metadata: Metadata = {
  title: 'Games',
  description: GAMES_DESC,
  alternates: { canonical: '/games' },
}

export default function GamesPage() {
  return <GamesView />
}
