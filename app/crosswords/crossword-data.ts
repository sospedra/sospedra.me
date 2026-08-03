import { range, takeWhile } from 'es-toolkit'

export type CrosswordLocale = 'en' | 'es'
export type CrosswordDirection = 'across' | 'down'

export const GRID_LETTERS = new Set('ABCDEFGHIJKLMNOPQRSTUVWXYZÑ')
export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export type CrosswordEntry = {
  id: string
  number: number
  direction: CrosswordDirection
  row: number
  column: number
  length: number
  cells: number[]
  gridAnswer: string
  clue?: string
}

export type CrosswordCell = {
  index: number
  row: number
  column: number
  solution: string | null
  number?: number
  entryIds: string[]
}

export type CrosswordPuzzle = {
  id: string
  locale: CrosswordLocale
  publicationDate: string
  width: number
  height: number
  cells: CrosswordCell[]
  entries: CrosswordEntry[]
}

type ClueBook = {
  across: Record<string, string>
  down: Record<string, string>
}

type PuzzleSource = {
  locale: CrosswordLocale
  publicationDate: string
  solution: readonly string[]
  clues?: ClueBook
}

type PuzzleGrid = {
  cells: CrosswordCell[]
  width: number
  height: number
}

type EntryStart = {
  cell: CrosswordCell
  number: number
  directions: CrosswordDirection[]
}

const cellsFromSolution = (
  solution: readonly string[],
  width: number,
): CrosswordCell[] =>
  solution.flatMap((row, rowIndex) =>
    [...row].map((character, columnIndex) => ({
      index: rowIndex * width + columnIndex,
      row: rowIndex,
      column: columnIndex,
      solution: character === '#' ? null : character,
      entryIds: [],
    })),
  )

const startsAcross = (grid: PuzzleGrid, cell: CrosswordCell): boolean => {
  const blockedBefore =
    cell.column === 0 || grid.cells[cell.index - 1]?.solution === null
  const openAfter =
    cell.column < grid.width - 1 &&
    grid.cells[cell.index + 1]?.solution !== null
  return blockedBefore && openAfter
}

const startsDown = (grid: PuzzleGrid, cell: CrosswordCell): boolean => {
  const blockedAbove =
    cell.row === 0 || grid.cells[cell.index - grid.width]?.solution === null
  const openBelow =
    cell.row < grid.height - 1 &&
    grid.cells[cell.index + grid.width]?.solution !== null
  return blockedAbove && openBelow
}

const startDirections = (
  grid: PuzzleGrid,
  cell: CrosswordCell,
): CrosswordDirection[] => [
  ...(startsAcross(grid, cell) ? (['across'] as const) : []),
  ...(startsDown(grid, cell) ? (['down'] as const) : []),
]

const numberedStarts = (grid: PuzzleGrid): EntryStart[] =>
  grid.cells
    .filter((cell) => cell.solution !== null)
    .map((cell) => ({ cell, directions: startDirections(grid, cell) }))
    .filter((start) => start.directions.length > 0)
    .map((start, position) => ({ ...start, number: position + 1 }))

const entryCellIndices = (
  grid: PuzzleGrid,
  start: CrosswordCell,
  direction: CrosswordDirection,
): number[] => {
  const reach =
    direction === 'across' ? grid.width - start.column : grid.height - start.row
  const step = direction === 'across' ? 1 : grid.width
  const along = range(reach).map((offset) => start.index + offset * step)
  return takeWhile(along, (index) => grid.cells[index]?.solution !== null)
}

const entryFrom = (
  grid: PuzzleGrid,
  start: EntryStart,
  direction: CrosswordDirection,
  clues?: ClueBook,
): CrosswordEntry => {
  const cells = entryCellIndices(grid, start.cell, direction)
  const gridAnswer = cells
    .map((index) => grid.cells[index]?.solution ?? '')
    .join('')
  return {
    id: `${start.number}-${direction}`,
    number: start.number,
    direction,
    row: start.cell.row,
    column: start.cell.column,
    length: cells.length,
    cells,
    gridAnswer,
    clue: clues?.[direction][gridAnswer],
  }
}

const annotatedCells = (
  grid: PuzzleGrid,
  starts: EntryStart[],
  entries: CrosswordEntry[],
): CrosswordCell[] => {
  const numbers = new Map(
    starts.map((start) => [start.cell.index, start.number]),
  )
  const entryIds = new Map<number, string[]>()
  for (const entry of entries) {
    for (const index of entry.cells) {
      const ids = entryIds.get(index) ?? []
      ids.push(entry.id)
      entryIds.set(index, ids)
    }
  }
  return grid.cells.map((cell) => ({
    ...cell,
    ...(numbers.has(cell.index) ? { number: numbers.get(cell.index) } : {}),
    entryIds: entryIds.get(cell.index) ?? [],
  }))
}

export const buildPuzzle = ({
  locale,
  publicationDate,
  solution,
  clues,
}: PuzzleSource): CrosswordPuzzle => {
  const height = solution.length
  const width = solution[0]?.length ?? 0
  const grid: PuzzleGrid = {
    cells: cellsFromSolution(solution, width),
    width,
    height,
  }
  const starts = numberedStarts(grid)
  const entries = starts.flatMap((start) =>
    start.directions.map((direction) =>
      entryFrom(grid, start, direction, clues),
    ),
  )

  return {
    id: `${locale}:${publicationDate}`,
    locale,
    publicationDate,
    width,
    height,
    cells: annotatedCells(grid, starts, entries),
    entries,
  }
}

export type CrosswordEdition = {
  en: CrosswordPuzzle
  es?: CrosswordPuzzle
}

export type ChallengePuzzle = {
  solution: string[]
  clues?: ClueBook
}

export type CrosswordChallengeFile = {
  publicationDate: string
  puzzles: { en: ChallengePuzzle; es?: ChallengePuzzle }
}

const puzzleFromChallenge = (
  locale: CrosswordLocale,
  publicationDate: string,
  puzzle: ChallengePuzzle,
): CrosswordPuzzle =>
  buildPuzzle({
    locale,
    publicationDate,
    solution: puzzle.solution,
    clues: puzzle.clues,
  })

export const editionFromChallenge = (
  challenge: CrosswordChallengeFile,
): CrosswordEdition => ({
  en: puzzleFromChallenge(
    'en',
    challenge.publicationDate,
    challenge.puzzles.en,
  ),
  es: challenge.puzzles.es
    ? puzzleFromChallenge('es', challenge.publicationDate, challenge.puzzles.es)
    : undefined,
})

export const puzzleForDate = (
  editions: CrosswordEdition[],
  isoDate: string,
): CrosswordEdition | null =>
  editions.findLast((edition) => edition.en.publicationDate <= isoDate) ??
  editions.at(0) ??
  null
