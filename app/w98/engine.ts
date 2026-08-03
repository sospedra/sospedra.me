import { mulberry32 } from 'services/random'

export type Level = { rows: number; cols: number; mines: number }

export type Cell = {
  mine: boolean
  adjacent: number
  revealed: boolean
  flagged: boolean
}

export type MinesStatus = 'idle' | 'playing' | 'won' | 'lost'

export type MinesState = {
  level: Level
  status: MinesStatus
  cells: Cell[]
  detonated: number | null
}

export type MinesEvent =
  | { type: 'reveal'; index: number; seed: number }
  | { type: 'flag'; index: number }
  | { type: 'reset'; level: Level }

export const createGame = (level: Level): MinesState => ({
  level,
  status: 'idle',
  cells: Array.from({ length: level.rows * level.cols }, () => ({
    mine: false,
    adjacent: 0,
    revealed: false,
    flagged: false,
  })),
  detonated: null,
})

export const flagCount = (state: MinesState): number =>
  state.cells.filter((cell) => cell.flagged).length

export const minesLeft = (state: MinesState): number =>
  state.level.mines - flagCount(state)

const OFFSETS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
] as const

const neighborsOf = (index: number, level: Level): number[] => {
  const row = Math.floor(index / level.cols)
  const col = index % level.cols
  return OFFSETS.map(([rowStep, colStep]) => [row + rowStep, col + colStep])
    .filter(
      ([nearRow, nearCol]) =>
        nearRow >= 0 &&
        nearRow < level.rows &&
        nearCol >= 0 &&
        nearCol < level.cols,
    )
    .map(([nearRow, nearCol]) => nearRow * level.cols + nearCol)
}

// first click is never a mine: the safe index leaves the candidate pool
const pickMines = (level: Level, safe: number, seed: number): Set<number> => {
  const random = mulberry32(seed)
  const picked = Array.from({ length: level.rows * level.cols }, (_, i) => i)
    .filter((index) => index !== safe)
    .map((index) => ({ index, key: random() }))
    .toSorted((a, b) => a.key - b.key)
    .slice(0, level.mines)
  return new Set(picked.map(({ index }) => index))
}

const armBoard = (state: MinesState, safe: number, seed: number): Cell[] => {
  const { level } = state
  const mines = pickMines(level, safe, seed)
  return state.cells.map((cell, index) => ({
    ...cell,
    mine: mines.has(index),
    adjacent: neighborsOf(index, level).filter((near) => mines.has(near))
      .length,
  }))
}

const floodInPlace = (swept: Cell[], level: Level, start: number) => {
  const queue = [start]
  // drains at most once per cell: revealed cells never re-enqueue
  while (queue.length > 0) {
    const index = queue.pop()
    if (index === undefined) break
    const cell = swept[index]
    if (cell.revealed || cell.flagged) continue
    cell.revealed = true
    if (cell.adjacent === 0) queue.push(...neighborsOf(index, level))
  }
}

const floodReveal = (cells: Cell[], level: Level, start: number): Cell[] => {
  const swept = cells.map((cell) => ({ ...cell }))
  floodInPlace(swept, level, start)
  return swept
}

const detonate = (
  state: MinesState,
  cells: Cell[],
  index: number,
): MinesState => ({
  ...state,
  status: 'lost',
  detonated: index,
  cells: cells.map((cell) => (cell.mine ? { ...cell, revealed: true } : cell)),
})

const settle = (state: MinesState): MinesState => {
  const hidden = state.cells.filter((cell) => !cell.revealed).length
  if (hidden > state.level.mines) return state
  return {
    ...state,
    status: 'won',
    cells: state.cells.map((cell) =>
      cell.mine ? { ...cell, flagged: true } : cell,
    ),
  }
}

// chord: a satisfied number sweeps its unflagged neighbors in one click
const chordAt = (state: MinesState, index: number): MinesState => {
  const cell = state.cells[index]
  if (cell.adjacent === 0) return state
  const { level } = state
  const neighbors = neighborsOf(index, level)
  const flags = neighbors.filter((near) => state.cells[near].flagged).length
  if (flags !== cell.adjacent) return state
  const hidden = neighbors.filter(
    (near) => !state.cells[near].flagged && !state.cells[near].revealed,
  )
  const mineIndex = hidden.find((near) => state.cells[near].mine)
  if (mineIndex !== undefined) return detonate(state, state.cells, mineIndex)
  const swept = state.cells.map((cell) => ({ ...cell }))
  for (const near of hidden) floodInPlace(swept, level, near)
  return settle({ ...state, cells: swept })
}

const revealAt = (
  state: MinesState,
  index: number,
  seed: number,
): MinesState => {
  const target = state.cells[index]
  if (target.flagged) return state
  if (target.revealed) return chordAt(state, index)
  const cells =
    state.status === 'idle' ? armBoard(state, index, seed) : state.cells
  if (cells[index].mine) return detonate(state, cells, index)
  const swept = floodReveal(cells, state.level, index)
  return settle({ ...state, status: 'playing', cells: swept })
}

const flagAt = (state: MinesState, index: number): MinesState => {
  const cell = state.cells[index]
  if (cell.revealed) return state
  const cells = state.cells.with(index, { ...cell, flagged: !cell.flagged })
  return { ...state, cells }
}

const canSweep = (state: MinesState) =>
  state.status === 'idle' || state.status === 'playing'

export const reduce = (state: MinesState, event: MinesEvent): MinesState => {
  switch (event.type) {
    case 'reveal':
      return canSweep(state) ? revealAt(state, event.index, event.seed) : state
    case 'flag':
      return canSweep(state) ? flagAt(state, event.index) : state
    case 'reset':
      return createGame(event.level)
  }
}
