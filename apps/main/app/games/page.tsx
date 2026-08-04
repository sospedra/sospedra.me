import type { Metadata } from 'next'
import GamesView from './games-view'

export const metadata: Metadata = {
  title: 'Games',
  description:
    'Seven browser games in a PS2-inspired archive: Meridian, Crosswords, Boombox, Snake, Minesweeper, Rubik’s and Game of Life.',
  alternates: { canonical: '/games' },
}

export default function GamesPage() {
  return <GamesView />
}
