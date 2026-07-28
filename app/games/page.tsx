import type { Metadata } from 'next'
import GamesView from './games-view'

export const metadata: Metadata = {
  title: 'Games',
  description:
    'Six browser games in a PS2-inspired archive: Meridian, Crosswords, Snake, Windows 98, Rubik’s and Game of Life.',
  alternates: { canonical: '/games' },
}

export default function GamesPage() {
  return <GamesView />
}
