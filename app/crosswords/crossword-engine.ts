import { range } from 'es-toolkit'
import * as z from 'zod/mini'
import {
  type CrosswordDirection,
  type CrosswordPuzzle,
  GRID_LETTERS,
} from './crossword-data.ts'

export type CrosswordStatus = 'not-started' | 'playing' | 'paused' | 'complete'

type GameSnapshot = {
  guesses: string[]
  pencilCells: boolean[]
  checkedCells: boolean[]
  revealedCells: boolean[]
  incorrectCells: boolean[]
  selectedCell: number
  direction: CrosswordDirection
}

export type CrosswordState = GameSnapshot & {
  status: CrosswordStatus
  pencilMode: boolean
  elapsedMs: number
  runStartedAt: number | null
  autoPaused: boolean
  undoStack: GameSnapshot[]
  redoStack: GameSnapshot[]
}

export type PersistedCrosswordState = {
  schemaVersion: 1
  puzzleId: string
  guesses: string[]
  pencilCells: number[]
  checkedCells: number[]
  revealedCells: number[]
  incorrectCells: number[]
  selectedCell: number
  direction: CrosswordDirection
  status: CrosswordStatus
  elapsedMs: number
  runStartedAt: number | null
}

export type CrosswordAction =
  | { type: 'HYDRATE'; state: CrosswordState }
  | {
      type: 'SELECT'
      index: number
      direction?: CrosswordDirection
    }
  | { type: 'SET_DIRECTION'; direction: CrosswordDirection }
  | { type: 'TOGGLE_DIRECTION' }
  | { type: 'TOGGLE_PENCIL' }
  | {
      type: 'WRITE'
      index: number
      value: string
      nextIndex: number
      incorrect: boolean
      checked: boolean
      now: number
    }
  | {
      type: 'CLEAR'
      index: number
      nextIndex: number
      now: number
    }
  | {
      type: 'CHECK'
      indices: number[]
      solutions: Record<number, string>
    }
  | {
      type: 'REVEAL'
      indices: number[]
      solutions: Record<number, string>
      now: number
    }
  | { type: 'START'; now: number }
  | { type: 'PAUSE'; now: number; automatic: boolean }
  | { type: 'RESUME'; now: number }
  | { type: 'COMPLETE'; now: number }
  | { type: 'UNDO' }
  | { type: 'REDO' }

const HISTORY_LIMIT = 80

const blankFlags = (cellCount: number) =>
  Array.from({ length: cellCount }, () => false)

const snapshot = (state: CrosswordState): GameSnapshot => ({
  guesses: [...state.guesses],
  pencilCells: [...state.pencilCells],
  checkedCells: [...state.checkedCells],
  revealedCells: [...state.revealedCells],
  incorrectCells: [...state.incorrectCells],
  selectedCell: state.selectedCell,
  direction: state.direction,
})

const withHistory = (
  state: CrosswordState,
  next: Partial<CrosswordState>,
): CrosswordState => ({
  ...state,
  ...next,
  undoStack: [...state.undoStack.slice(-(HISTORY_LIMIT - 1)), snapshot(state)],
  redoStack: [],
})

const startClock = (
  state: CrosswordState,
  now: number,
): Pick<CrosswordState, 'status' | 'runStartedAt' | 'autoPaused'> =>
  state.status === 'not-started'
    ? { status: 'playing', runStartedAt: now, autoPaused: false }
    : {
        status: state.status,
        runStartedAt: state.runStartedAt,
        autoPaused: state.autoPaused,
      }

const stoppedElapsed = (state: CrosswordState, now: number) =>
  state.elapsedMs +
  (state.status === 'playing' && state.runStartedAt !== null
    ? Math.max(0, now - state.runStartedAt)
    : 0)

const boardLocked = (state: CrosswordState) =>
  state.status === 'paused' || state.status === 'complete'

type CellEdit = {
  guess: string
  pencil: boolean
  incorrect: boolean
  checked: boolean
}

const withCellEdit = (
  state: CrosswordState,
  index: number,
  patch: CellEdit,
): Pick<
  CrosswordState,
  'guesses' | 'pencilCells' | 'incorrectCells' | 'checkedCells'
> => {
  const guesses = [...state.guesses]
  const pencilCells = [...state.pencilCells]
  const incorrectCells = [...state.incorrectCells]
  const checkedCells = [...state.checkedCells]
  guesses[index] = patch.guess
  pencilCells[index] = patch.pencil
  incorrectCells[index] = patch.incorrect
  checkedCells[index] = patch.checked
  return { guesses, pencilCells, incorrectCells, checkedCells }
}

export const createCrosswordState = (
  puzzle: CrosswordPuzzle,
): CrosswordState => {
  const selectedCell =
    puzzle.cells.find((cell) => cell.solution !== null)?.index ?? 0
  const cellCount = puzzle.cells.length

  return {
    guesses: Array.from({ length: cellCount }, () => ''),
    pencilCells: blankFlags(cellCount),
    checkedCells: blankFlags(cellCount),
    revealedCells: blankFlags(cellCount),
    incorrectCells: blankFlags(cellCount),
    selectedCell,
    direction: 'across',
    status: 'not-started',
    pencilMode: false,
    elapsedMs: 0,
    runStartedAt: null,
    autoPaused: false,
    undoStack: [],
    redoStack: [],
  }
}

export const crosswordReducer = (
  state: CrosswordState,
  action: CrosswordAction,
): CrosswordState => {
  switch (action.type) {
    case 'HYDRATE':
      return action.state
    case 'SELECT':
      return {
        ...state,
        selectedCell: action.index,
        direction: action.direction ?? state.direction,
      }
    case 'SET_DIRECTION':
      return { ...state, direction: action.direction }
    case 'TOGGLE_DIRECTION':
      return {
        ...state,
        direction: state.direction === 'across' ? 'down' : 'across',
      }
    case 'TOGGLE_PENCIL':
      return { ...state, pencilMode: !state.pencilMode }
    case 'WRITE': {
      if (boardLocked(state)) return state
      if (state.revealedCells[action.index]) return state
      return withHistory(state, {
        ...startClock(state, action.now),
        ...withCellEdit(state, action.index, {
          guess: action.value,
          pencil: state.pencilMode,
          incorrect: action.incorrect,
          checked: action.checked,
        }),
        selectedCell: action.nextIndex,
      })
    }
    case 'CLEAR': {
      if (boardLocked(state)) return state
      if (state.revealedCells[action.index]) return state
      if (!state.guesses[action.index] && action.index === action.nextIndex) {
        return state
      }
      return withHistory(state, {
        ...withCellEdit(state, action.index, {
          guess: '',
          pencil: false,
          incorrect: false,
          checked: false,
        }),
        selectedCell: action.nextIndex,
      })
    }
    case 'CHECK': {
      const checkedCells = [...state.checkedCells]
      const incorrectCells = [...state.incorrectCells]
      for (const index of action.indices) {
        if (!state.guesses[index]) continue
        checkedCells[index] = true
        incorrectCells[index] = state.guesses[index] !== action.solutions[index]
      }
      return {
        ...state,
        checkedCells,
        incorrectCells,
      }
    }
    case 'REVEAL': {
      const guesses = [...state.guesses]
      const pencilCells = [...state.pencilCells]
      const revealedCells = [...state.revealedCells]
      const incorrectCells = [...state.incorrectCells]
      for (const index of action.indices) {
        const solution = action.solutions[index]
        if (!solution) continue
        guesses[index] = solution
        pencilCells[index] = false
        revealedCells[index] = true
        incorrectCells[index] = false
      }
      return withHistory(state, {
        guesses,
        pencilCells,
        revealedCells,
        incorrectCells,
      })
    }
    case 'START':
      if (state.status !== 'not-started') return state
      return {
        ...state,
        status: 'playing',
        runStartedAt: action.now,
        autoPaused: false,
      }
    case 'PAUSE':
      if (state.status !== 'playing') return state
      return {
        ...state,
        status: 'paused',
        elapsedMs: stoppedElapsed(state, action.now),
        runStartedAt: null,
        autoPaused: action.automatic,
      }
    case 'RESUME':
      if (state.status !== 'paused') return state
      return {
        ...state,
        status: 'playing',
        runStartedAt: action.now,
        autoPaused: false,
      }
    case 'COMPLETE':
      if (state.status === 'complete') return state
      return {
        ...state,
        status: 'complete',
        elapsedMs: stoppedElapsed(state, action.now),
        runStartedAt: null,
        autoPaused: false,
      }
    case 'UNDO': {
      if (state.status === 'complete') return state
      const previous = state.undoStack.at(-1)
      if (!previous) return state
      return {
        ...state,
        ...previous,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [snapshot(state), ...state.redoStack].slice(
          0,
          HISTORY_LIMIT,
        ),
      }
    }
    case 'REDO': {
      if (state.status === 'complete') return state
      const next = state.redoStack[0]
      if (!next) return state
      return {
        ...state,
        ...next,
        undoStack: [...state.undoStack, snapshot(state)].slice(-HISTORY_LIMIT),
        redoStack: state.redoStack.slice(1),
      }
    }
  }
}

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

export const formatTime = (milliseconds: number) => {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000))
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const minutePart =
    hours > 0 ? String(minutes % 60).padStart(2, '0') : String(minutes)
  const secondPart = String(seconds % 60).padStart(2, '0')
  return hours > 0
    ? `${hours}:${minutePart}:${secondPart}`
    : `${minutePart}:${secondPart}`
}

const ROW_CLEAN = '🟩'
const ROW_CHECKED = '🟨'
const ROW_REVEALED = '🟥'

const rowSymbol = (
  puzzle: CrosswordPuzzle,
  state: CrosswordState,
  row: number,
) => {
  const cells = puzzle.cells.filter(
    (cell) => cell.row === row && cell.solution !== null,
  )
  if (cells.some((cell) => state.revealedCells[cell.index])) {
    return ROW_REVEALED
  }
  if (cells.some((cell) => state.checkedCells[cell.index])) {
    return ROW_CHECKED
  }
  return ROW_CLEAN
}

export const shareCard = (
  puzzle: CrosswordPuzzle,
  state: CrosswordState,
): string => {
  const rows = range(puzzle.height).map((row) => rowSymbol(puzzle, state, row))
  const brand = puzzle.locale === 'es' ? 'CRUCIGRAMA' : 'CROSSWORDS'

  return [
    `${brand} ${puzzle.publicationDate} 🗞️`,
    rows.join(''),
    `⏱️ ${formatTime(state.elapsedMs)} · sospedra.me/crosswords`,
  ].join('\n')
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
