import type { Route } from 'next'

export type ArchiveId =
  | 'geo'
  | 'crosswords'
  | 'boombox'
  | 'snake'
  | 'mines'
  | 'rubiks'
  | 'life'
  | 'cims'
  | 'camera'

// a toy has no win state, so the w98 Games menu leaves it out
export type ArchiveKind = 'game' | 'toy'

export type ArchiveEntry = {
  id: ArchiveId
  kind: ArchiveKind
  code: string
  title: string
  href: Route
  category: string
  description: string
  controls: string
}

export const ARCHIVE = [
  {
    id: 'geo',
    kind: 'game',
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
    kind: 'game',
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
    kind: 'game',
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
    kind: 'game',
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
    kind: 'game',
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
    kind: 'game',
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
    kind: 'game',
    code: 'C//70',
    title: 'Game of Life',
    href: '/game-of-life',
    category: 'Simulation · generative',
    description:
      'Seed an infinite midnight grid and watch four small rules build strange machines.',
    controls: 'Draw · step · run',
  },
  {
    id: 'cims',
    kind: 'toy',
    code: 'T//30',
    title: 'Cims',
    href: '/cims',
    category: 'Console · terrain',
    description:
      'Twelve Catalan peaks at 30 m resolution. Fly the contours on a phosphor scope under a real sun and moon.',
    controls: 'Dials · pointer · keyboard',
  },
  {
    id: 'camera',
    kind: 'toy',
    code: 'P//48',
    title: 'Camera',
    href: '/camera',
    category: 'Booth · instant film',
    description:
      'A midnight photo booth. Frame yourself in the viewfinder and crank out an instant print.',
    controls: 'Shutter · pointer · touch',
  },
] as const satisfies readonly ArchiveEntry[]

export const GAMES = ARCHIVE.filter(
  (entry): entry is Extract<(typeof ARCHIVE)[number], { kind: 'game' }> =>
    entry.kind === 'game',
)
