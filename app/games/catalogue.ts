import type { Route } from 'next'

export type GameId =
  | 'geo'
  | 'crosswords'
  | 'boombox'
  | 'snake'
  | 'mines'
  | 'rubiks'
  | 'life'

export type GameEntry = {
  id: GameId
  code: string
  title: string
  href: Route
  category: string
  description: string
  controls: string
}

export const GAMES = [
  {
    id: 'geo',
    code: 'M//24',
    title: 'Meridian',
    href: '/meridian',
    category: 'Daily · geography',
    description:
      'A bilingual geography signal: shapes, flags, capitals and a precision world map.',
    controls: 'Pointer · keyboard · touch',
  },
  {
    id: 'crosswords',
    code: 'X//15',
    title: 'Crosswords',
    href: '/crosswords',
    category: 'Daily · word puzzle',
    description:
      'A bilingual metropolitan crossword built for quick keys and quiet thinking.',
    controls: 'Keyboard · touch',
  },
  {
    id: 'boombox',
    code: 'B//22',
    title: 'Boombox',
    href: '/boombox',
    category: 'Daily · music',
    description:
      'A mystery mixtape on a cassette deck. One second of song, six guesses, misses wind the tape further.',
    controls: 'Keyboard · pointer · audio',
  },
  {
    id: 'snake',
    code: 'N//33',
    title: 'Snake',
    href: '/snake',
    category: 'Arcade · high score',
    description:
      'Nokia-spec reflexes on an 84 × 48 LCD. Eat, grow and stay off your own tail.',
    controls: 'Arrow keys · 5 · touch',
  },
  {
    id: 'mines',
    code: 'S//90',
    title: 'Minesweeper',
    href: '/w98?sw=mines',
    category: 'Puzzle · logic sweep',
    description:
      'The desktop classic, booted straight into a Windows 98 window. Read the numbers, plant the flags, clear the field.',
    controls: 'Pointer · touch · audio',
  },
  {
    id: 'rubiks',
    code: 'R//03',
    title: "Rubik's",
    href: '/rubiks',
    category: 'Puzzle · speed solve',
    description:
      'Scramble a CSS 3D cube, race the clock and unwind every turn.',
    controls: 'Drag · face keys · touch',
  },
  {
    id: 'life',
    code: 'C//70',
    title: 'Game of Life',
    href: '/game-of-life',
    category: 'Simulation · generative',
    description:
      'Seed an infinite midnight grid and watch four small rules build strange machines.',
    controls: 'Draw · step · run',
  },
] as const satisfies readonly GameEntry[]
