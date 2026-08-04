import type { CrosswordDirection, CrosswordPuzzle } from './crossword-data.ts'

export type CrosswordStatus = 'not-started' | 'playing' | 'paused' | 'complete'

export type GameSnapshot = {
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

export const blankFlags = (cellCount: number) =>
  Array.from({ length: cellCount }, () => false)

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
