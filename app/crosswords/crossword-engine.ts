import type { CrosswordDirection, CrosswordPuzzle } from './crossword-data'

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
      if (state.revealedCells[action.index]) return state
      const guesses = [...state.guesses]
      const pencilCells = [...state.pencilCells]
      const incorrectCells = [...state.incorrectCells]
      const checkedCells = [...state.checkedCells]
      guesses[action.index] = action.value
      pencilCells[action.index] = state.pencilMode
      incorrectCells[action.index] = action.incorrect
      checkedCells[action.index] = action.checked
      return withHistory(state, {
        ...startClock(state, action.now),
        guesses,
        pencilCells,
        incorrectCells,
        checkedCells,
        selectedCell: action.nextIndex,
      })
    }
    case 'CLEAR': {
      if (state.revealedCells[action.index]) return state
      if (!state.guesses[action.index] && action.index === action.nextIndex) {
        return state
      }
      const guesses = [...state.guesses]
      const pencilCells = [...state.pencilCells]
      const incorrectCells = [...state.incorrectCells]
      const checkedCells = [...state.checkedCells]
      guesses[action.index] = ''
      pencilCells[action.index] = false
      incorrectCells[action.index] = false
      checkedCells[action.index] = false
      return withHistory(state, {
        guesses,
        pencilCells,
        incorrectCells,
        checkedCells,
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

const restoreFlags = (value: unknown, cellCount: number) => {
  const flags = blankFlags(cellCount)
  if (!Array.isArray(value)) return flags
  for (const index of value) {
    if (Number.isInteger(index) && index >= 0 && index < cellCount) {
      flags[index] = true
    }
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

/* One symbol per grid row: green solved it yourself, yellow leaned on
   Check, red needed a reveal. The same journey grammar as /boombox. */
export const shareCard = (
  puzzle: CrosswordPuzzle,
  state: CrosswordState,
): string => {
  const rows = Array.from({ length: puzzle.height }, (_, row) =>
    rowSymbol(puzzle, state, row),
  )
  const brand = puzzle.locale === 'es' ? 'CRUCIGRAMA' : 'CROSSWORDS'

  return [
    `${brand} ${puzzle.publicationDate} 🗞️`,
    rows.join(''),
    `⏱️ ${formatTime(state.elapsedMs)} · sospedra.me/crosswords`,
  ].join('\n')
}

export const restoreCrosswordState = (
  value: unknown,
  puzzle: CrosswordPuzzle,
): CrosswordState | null => {
  if (!value || typeof value !== 'object') return null
  const saved = value as Partial<PersistedCrosswordState>
  if (
    saved.schemaVersion !== 1 ||
    saved.puzzleId !== puzzle.id ||
    !Array.isArray(saved.guesses) ||
    saved.guesses.length !== puzzle.cells.length
  ) {
    return null
  }

  const guesses = saved.guesses.map((guess, index) => {
    if (puzzle.cells[index]?.solution === null) return ''
    return typeof guess === 'string' && /^[A-ZÑ]$/u.test(guess) ? guess : ''
  })
  const selectedCell =
    Number.isInteger(saved.selectedCell) &&
    puzzle.cells[saved.selectedCell ?? -1]?.solution !== null
      ? (saved.selectedCell as number)
      : createCrosswordState(puzzle).selectedCell
  const status: CrosswordStatus = [
    'not-started',
    'playing',
    'paused',
    'complete',
  ].includes(saved.status ?? '')
    ? (saved.status as CrosswordStatus)
    : 'not-started'

  return {
    ...createCrosswordState(puzzle),
    guesses,
    pencilCells: restoreFlags(saved.pencilCells, puzzle.cells.length),
    checkedCells: restoreFlags(saved.checkedCells, puzzle.cells.length),
    revealedCells: restoreFlags(saved.revealedCells, puzzle.cells.length),
    incorrectCells: restoreFlags(saved.incorrectCells, puzzle.cells.length),
    selectedCell,
    direction: saved.direction === 'down' ? 'down' : 'across',
    status,
    elapsedMs:
      typeof saved.elapsedMs === 'number' && saved.elapsedMs >= 0
        ? saved.elapsedMs
        : 0,
    runStartedAt:
      status === 'playing' &&
      typeof saved.runStartedAt === 'number' &&
      saved.runStartedAt > 0
        ? saved.runStartedAt
        : status === 'playing'
          ? Date.now()
          : null,
    autoPaused: false,
  }
}
