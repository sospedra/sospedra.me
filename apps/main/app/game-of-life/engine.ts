import { match } from 'ts-pattern'

export type Cell = readonly [x: number, y: number]
export type CellKey = `${number},${number}`
export type CellSet = ReadonlySet<CellKey>

export type Bounds = {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
}

export type LifeState = {
  cells: CellSet
  seed: CellSet
  births: CellSet
  generation: number
  birthsCount: number
  deathsCount: number
  history: readonly number[]
  presetId: string
}

export type LifeAction =
  | { type: 'step' }
  | {
      type: 'paint'
      cells: readonly Cell[]
      alive: boolean
    }
  | { type: 'load'; cells: CellSet; presetId: string }
  | { type: 'reset' }
  | { type: 'clear' }

const HISTORY_LENGTH = 64
const RLE_HEADER = /^x\s*=/i
const WHITESPACE = /\s/g

export const keyOf = (x: number, y: number): CellKey => `${x},${y}`

export const cellOf = (key: CellKey): Cell => {
  const comma = key.indexOf(',')
  return [Number(key.slice(0, comma)), Number(key.slice(comma + 1))] as const
}

export const parseRle = (source: string): CellSet => {
  const data = source
    .replaceAll('\r', '')
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim()
      return (
        trimmed.length > 0 &&
        !trimmed.startsWith('#') &&
        !RLE_HEADER.test(trimmed)
      )
    })
    .join('')
    .replaceAll(WHITESPACE, '')

  const cells = new Set<CellKey>()
  let x = 0
  let y = 0
  let count = ''

  for (const token of data) {
    if (token >= '0' && token <= '9') {
      count += token
      continue
    }

    const run = count === '' ? 1 : Number(count)
    count = ''

    if (token === 'b' || token === 'B') {
      x += run
      continue
    }

    if (token === 'o' || token === 'O') {
      for (let offset = 0; offset < run; offset++) {
        cells.add(keyOf(x + offset, y))
      }
      x += run
      continue
    }

    if (token === '$') {
      x = 0
      y += run
      continue
    }

    if (token === '!') break
  }

  return cells
}

export const boundsOf = (cells: CellSet): Bounds => {
  if (cells.size === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 1, height: 1 }
  }

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const key of cells) {
    const [x, y] = cellOf(key)
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }
}

// Bresenham line walk; every pass advances an axis, so deltaX + deltaY
// passes suffice
export const rasterLine = (from: Cell, to: Cell): Cell[] => {
  const points: Cell[] = []
  let [x, y] = from
  const [targetX, targetY] = to
  const deltaX = Math.abs(targetX - x)
  const deltaY = Math.abs(targetY - y)
  const stepX = x < targetX ? 1 : -1
  const stepY = y < targetY ? 1 : -1
  let error = deltaX - deltaY

  for (let step = 0; step <= deltaX + deltaY; step += 1) {
    points.push([x, y])
    if (x === targetX && y === targetY) break
    const doubled = error * 2
    if (doubled > -deltaY) {
      error -= deltaY
      x += stepX
    }
    if (doubled < deltaX) {
      error += deltaX
      y += stepY
    }
  }

  return points
}

export const evolve = (
  cells: CellSet,
): { cells: CellSet; births: CellSet; deaths: number } => {
  const neighborCounts = new Map<CellKey, number>()

  for (const key of cells) {
    const [x, y] = cellOf(key)
    for (let deltaY = -1; deltaY <= 1; deltaY++) {
      for (let deltaX = -1; deltaX <= 1; deltaX++) {
        if (deltaX === 0 && deltaY === 0) continue
        const neighbor = keyOf(x + deltaX, y + deltaY)
        neighborCounts.set(neighbor, (neighborCounts.get(neighbor) ?? 0) + 1)
      }
    }
  }

  const next = new Set<CellKey>()
  const births = new Set<CellKey>()

  for (const [key, count] of neighborCounts) {
    const alive = cells.has(key)
    if (count === 3 || (alive && count === 2)) {
      next.add(key)
      if (!alive) births.add(key)
    }
  }

  const survivors = next.size - births.size
  return {
    cells: next,
    births,
    deaths: cells.size - survivors,
  }
}

export const createLifeState = (
  cells: CellSet,
  presetId: string,
): LifeState => {
  const seed = new Set(cells)
  return {
    cells: seed,
    seed: new Set(seed),
    births: new Set(),
    generation: 0,
    birthsCount: 0,
    deathsCount: 0,
    history: [seed.size],
    presetId,
  }
}

export const lifeReducer = (state: LifeState, action: LifeAction): LifeState =>
  match(action)
    .returnType<LifeState>()
    .with({ type: 'step' }, () => {
      const next = evolve(state.cells)
      return {
        ...state,
        cells: next.cells,
        births: next.births,
        generation: state.generation + 1,
        birthsCount: next.births.size,
        deathsCount: next.deaths,
        history: [
          ...state.history.slice(-(HISTORY_LENGTH - 1)),
          next.cells.size,
        ],
      }
    })
    .with({ type: 'paint' }, (action) => {
      const next = new Set(state.cells)
      const births = new Set<CellKey>()

      for (const [x, y] of action.cells) {
        const key = keyOf(x, y)
        if (action.alive) {
          if (!next.has(key)) births.add(key)
          next.add(key)
        } else {
          next.delete(key)
        }
      }

      const unchanged =
        next.size === state.cells.size &&
        action.cells.every(
          ([x, y]) => state.cells.has(keyOf(x, y)) === action.alive,
        )
      if (unchanged) return state

      return {
        cells: next,
        seed: new Set(next),
        births,
        generation: 0,
        birthsCount: births.size,
        deathsCount: 0,
        history: [next.size],
        presetId: 'custom',
      }
    })
    .with({ type: 'load' }, (action) =>
      createLifeState(action.cells, action.presetId),
    )
    .with({ type: 'reset' }, () => {
      const cells = new Set(state.seed)
      return {
        ...state,
        cells,
        births: new Set(),
        generation: 0,
        birthsCount: 0,
        deathsCount: 0,
        history: [cells.size],
      }
    })
    .with({ type: 'clear' }, () => createLifeState(new Set(), 'custom'))
    .exhaustive()
