import * as z from 'zod/mini'
import { type CrosswordPuzzle, GRID_LETTERS } from './crossword-data.ts'
import {
  blankFlags,
  type CrosswordState,
  type CrosswordStatus,
  createCrosswordState,
  type PersistedCrosswordState,
} from './crossword-state.ts'

const flagIndices = (flags: boolean[]) =>
  flags.flatMap((enabled, index) => (enabled ? [index] : []))

export const serializeCrosswordState = (
  state: CrosswordState,
  puzzleId: string,
): PersistedCrosswordState => ({
  schemaVersion: 1,
  puzzleId,
  guesses: state.guesses,
  pencilCells: flagIndices(state.pencilCells),
  checkedCells: flagIndices(state.checkedCells),
  revealedCells: flagIndices(state.revealedCells),
  incorrectCells: flagIndices(state.incorrectCells),
  selectedCell: state.selectedCell,
  direction: state.direction,
  status: state.status,
  elapsedMs: state.elapsedMs,
  runStartedAt: state.runStartedAt,
})

const isCellIndex = (value: unknown, cellCount: number): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= 0 &&
  value < cellCount

const restoreFlags = (value: readonly unknown[], cellCount: number) => {
  const flags = blankFlags(cellCount)
  for (const index of value) {
    if (isCellIndex(index, cellCount)) flags[index] = true
  }
  return flags
}

/* The gate rejects only foreign saves; every other field self-heals so one
   corrupt flag never wipes a filled grid. */
const savedGameSchema = z.object({
  schemaVersion: z.literal(1),
  puzzleId: z.string(),
  guesses: z.array(z.unknown()),
  pencilCells: z.catch(z.array(z.unknown()), []),
  checkedCells: z.catch(z.array(z.unknown()), []),
  revealedCells: z.catch(z.array(z.unknown()), []),
  incorrectCells: z.catch(z.array(z.unknown()), []),
  selectedCell: z.catch(z.nullable(z.int()), null),
  direction: z.catch(z.enum(['across', 'down']), 'across'),
  status: z.catch(
    z.enum(['not-started', 'playing', 'paused', 'complete']),
    'not-started',
  ),
  elapsedMs: z.catch(z.number().check(z.nonnegative()), 0),
  runStartedAt: z.catch(z.nullable(z.number().check(z.positive())), null),
})

const restoredClock = (
  runStartedAt: number | null,
  status: CrosswordStatus,
  now: number,
): number | null => {
  if (status !== 'playing') return null
  return runStartedAt ?? now
}

export const restoreCrosswordState = (
  value: unknown,
  puzzle: CrosswordPuzzle,
  now: number,
): CrosswordState | null => {
  const parsed = savedGameSchema.safeParse(value)
  if (!parsed.success) return null
  const saved = parsed.data
  if (
    saved.puzzleId !== puzzle.id ||
    saved.guesses.length !== puzzle.cells.length
  ) {
    return null
  }

  const guesses = saved.guesses.map((guess, index) => {
    if (puzzle.cells[index]?.solution === null) return ''
    return typeof guess === 'string' && GRID_LETTERS.has(guess) ? guess : ''
  })
  const selectedCell =
    saved.selectedCell !== null &&
    puzzle.cells[saved.selectedCell]?.solution !== null
      ? saved.selectedCell
      : createCrosswordState(puzzle).selectedCell

  return {
    ...createCrosswordState(puzzle),
    guesses,
    pencilCells: restoreFlags(saved.pencilCells, puzzle.cells.length),
    checkedCells: restoreFlags(saved.checkedCells, puzzle.cells.length),
    revealedCells: restoreFlags(saved.revealedCells, puzzle.cells.length),
    incorrectCells: restoreFlags(saved.incorrectCells, puzzle.cells.length),
    selectedCell,
    direction: saved.direction,
    status: saved.status,
    elapsedMs: saved.elapsedMs,
    runStartedAt: restoredClock(saved.runStartedAt, saved.status, now),
    autoPaused: false,
  }
}
