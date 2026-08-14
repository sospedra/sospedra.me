import type { Metadata } from 'next'
import { routeViewport } from 'services/chrome'
import GameOfLifeView from './game-of-life-view'

export const metadata: Metadata = {
  title: 'Game of Life',
  description:
    "Conway's Game of Life on an infinite midnight grid. Draw a seed, load a legendary pattern and watch simple rules turn into strange machinery.",
  alternates: { canonical: '/game-of-life' },
}

export const viewport = routeViewport('/game-of-life')

export default function GameOfLifePage() {
  return <GameOfLifeView />
}
