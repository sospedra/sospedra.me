import type { Metadata } from 'next'
import { GAME_OF_LIFE_DESC } from 'service/descriptions'
import GameOfLifeView from './game-of-life-view'

export const metadata: Metadata = {
  title: 'Game of Life',
  description: GAME_OF_LIFE_DESC,
  alternates: { canonical: '/game-of-life' },
}

export default function GameOfLifePage() {
  return <GameOfLifeView />
}
