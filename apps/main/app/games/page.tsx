import type { Metadata } from 'next'
import { routeViewport } from 'services/chrome'
import GamesView from './games-view'

export const metadata: Metadata = {
  title: 'Games',
  description:
    'Nine browser toys in a PS2-inspired archive: Meridian, Crosswords, Boombox, Snake, Minesweeper, Rubik’s, Game of Life, Cims and Camera.',
  alternates: { canonical: '/games' },
}

export const viewport = routeViewport('/games')

export default function GamesPage() {
  return <GamesView />
}
