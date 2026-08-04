import { range } from 'es-toolkit'
import { match } from 'ts-pattern'
import type { CrosswordPuzzle } from './crossword-data.ts'
import {
  restoreCrosswordState,
  serializeCrosswordState,
} from './crossword-save.ts'
import type {
  CrosswordAction,
  CrosswordState,
  GameSnapshot,
} from './crossword-state.ts'
import { createCrosswordState } from './crossword-state.ts'

export type {
  CrosswordAction,
  CrosswordState,
  CrosswordStatus,
  PersistedCrosswordState,
} from './crossword-state.ts'
export { createCrosswordState, restoreCrosswordState, serializeCrosswordState }

const HISTORY_LIMIT = 80

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

export const crosswordReducer = (
  state: CrosswordState,
  action: CrosswordAction,
): CrosswordState => {
  return match(action)
    .returnType<CrosswordState>()
    .with({ type: 'HYDRATE' }, ({ state }) => state)
    .with({ type: 'SELECT' }, (action) => ({
      ...state,
      selectedCell: action.index,
      direction: action.direction ?? state.direction,
    }))
    .with({ type: 'SET_DIRECTION' }, ({ direction }) => ({
      ...state,
      direction,
    }))
    .with({ type: 'TOGGLE_DIRECTION' }, () => ({
      ...state,
      direction: state.direction === 'across' ? 'down' : 'across',
    }))
    .with({ type: 'TOGGLE_PENCIL' }, () => ({
      ...state,
      pencilMode: !state.pencilMode,
    }))
    .with({ type: 'WRITE' }, (action) => {
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
    })
    .with({ type: 'CLEAR' }, (action) => {
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
    })
    .with({ type: 'CHECK' }, (action) => {
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
    })
    .with({ type: 'REVEAL' }, (action) => {
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
    })
    .with({ type: 'START' }, ({ now }) => {
      if (state.status !== 'not-started') return state
      return {
        ...state,
        status: 'playing',
        runStartedAt: now,
        autoPaused: false,
      }
    })
    .with({ type: 'PAUSE' }, (action) => {
      if (state.status !== 'playing') return state
      return {
        ...state,
        status: 'paused',
        elapsedMs: stoppedElapsed(state, action.now),
        runStartedAt: null,
        autoPaused: action.automatic,
      }
    })
    .with({ type: 'RESUME' }, ({ now }) => {
      if (state.status !== 'paused') return state
      return {
        ...state,
        status: 'playing',
        runStartedAt: now,
        autoPaused: false,
      }
    })
    .with({ type: 'COMPLETE' }, ({ now }) => {
      if (state.status === 'complete') return state
      return {
        ...state,
        status: 'complete',
        elapsedMs: stoppedElapsed(state, now),
        runStartedAt: null,
        autoPaused: false,
      }
    })
    .with({ type: 'UNDO' }, () => {
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
    })
    .with({ type: 'REDO' }, () => {
      if (state.status === 'complete') return state
      const next = state.redoStack[0]
      if (!next) return state
      return {
        ...state,
        ...next,
        undoStack: [...state.undoStack, snapshot(state)].slice(-HISTORY_LIMIT),
        redoStack: state.redoStack.slice(1),
      }
    })
    .exhaustive()
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
