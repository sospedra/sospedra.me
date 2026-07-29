export const COLS = 20
export const ROWS = 10
export const MIN_LEVEL = 1
export const MAX_LEVEL = 9
const TURN_QUEUE_LIMIT = 3

export type Dir = 'up' | 'down' | 'left' | 'right'
export type Vec = { x: number; y: number }
export type Phase = 'menu' | 'level' | 'tops' | 'running' | 'paused' | 'over'

export const MENU_ITEMS = ['NEW GAME', 'LEVEL', 'TOP SCORE'] as const

export type GameState = {
  phase: Phase
  menuIndex: number
  level: number
  snake: Vec[]
  dir: Dir
  turns: Dir[]
  food: Vec
  score: number
  top: number
}

// roll rides in on user and clock events: Math.random is banned inside the reducer
export type GameEvent =
  | { type: 'TURN'; dir: Dir; roll: number }
  | { type: 'SELECT'; roll: number }
  | { type: 'TICK'; roll: number }
  | { type: 'HIDE' }
  | { type: 'TOP'; top: number }
  | { type: 'LEVEL'; level: number }

// level 1 strolls at 295ms per cell, level 9 sprints at 95ms
export const stepMsFor = (level: number) => 320 - level * 25

const DIR_VEC: Record<Dir, Vec> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

const AXIS: Record<Dir, 'x' | 'y'> = {
  up: 'y',
  down: 'y',
  left: 'x',
  right: 'x',
}

const START_SNAKE: Vec[] = [
  { x: 5, y: 5 },
  { x: 4, y: 5 },
  { x: 3, y: 5 },
]

export const initialState: GameState = {
  phase: 'menu',
  menuIndex: 0,
  level: 5,
  snake: START_SNAKE,
  dir: 'right',
  turns: [],
  food: { x: 13, y: 5 },
  score: 0,
  top: 0,
}

const clampLevel = (level: number) =>
  Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, level))

const cellKey = (cell: Vec) => cell.y * COLS + cell.x

const spawnFood = (snake: Vec[], roll: number): Vec => {
  const taken = new Set(snake.map(cellKey))
  const free = Array.from({ length: COLS * ROWS }, (_, key) => key).filter(
    (key) => !taken.has(key),
  )
  if (free.length === 0) return { x: -1, y: -1 }

  const key = free[Math.min(free.length - 1, Math.floor(roll * free.length))]
  return { x: key % COLS, y: Math.floor(key / COLS) }
}

const start = (state: GameState, roll: number): GameState => ({
  ...state,
  phase: 'running',
  snake: START_SNAKE,
  dir: 'right',
  turns: [],
  score: 0,
  food: spawnFood(START_SNAKE, roll),
})

const queueTurn = (state: GameState, dir: Dir): GameState => {
  const running = state.phase === 'paused' ? 'running' : state.phase
  const heading = state.turns[state.turns.length - 1] ?? state.dir
  const rejected =
    AXIS[heading] === AXIS[dir] || state.turns.length >= TURN_QUEUE_LIMIT
  if (rejected) return { ...state, phase: running }
  return { ...state, phase: running, turns: [...state.turns, dir] }
}

const menuTurn = (state: GameState, dir: Dir): GameState => {
  if (AXIS[dir] === 'x') return state
  const delta = dir === 'down' ? 1 : -1
  const count = MENU_ITEMS.length
  return { ...state, menuIndex: (state.menuIndex + delta + count) % count }
}

const levelTurn = (state: GameState, dir: Dir): GameState => {
  if (AXIS[dir] === 'y') return state
  const delta = dir === 'right' ? 1 : -1
  return { ...state, level: clampLevel(state.level + delta) }
}

const turn = (state: GameState, dir: Dir): GameState => {
  switch (state.phase) {
    case 'menu':
      return menuTurn(state, dir)
    case 'level':
      return levelTurn(state, dir)
    case 'tops':
      return { ...state, phase: 'menu' }
    case 'running':
    case 'paused':
      return queueTurn(state, dir)
    case 'over':
      return state
  }
}

const menuSelect = (state: GameState, roll: number): GameState => {
  if (state.menuIndex === 1) return { ...state, phase: 'level' }
  if (state.menuIndex === 2) return { ...state, phase: 'tops' }
  return start(state, roll)
}

const select = (state: GameState, roll: number): GameState => {
  switch (state.phase) {
    case 'menu':
      return menuSelect(state, roll)
    case 'level':
    case 'tops':
    case 'over':
      return { ...state, phase: 'menu' }
    case 'running':
      return { ...state, phase: 'paused' }
    case 'paused':
      return { ...state, phase: 'running' }
  }
}

const hitsWall = (cell: Vec) =>
  cell.x < 0 || cell.y < 0 || cell.x >= COLS || cell.y >= ROWS

const hitsBody = (head: Vec, snake: Vec[], eats: boolean) => {
  // the tail cell is legal to enter unless a meal keeps it in place
  const body = eats ? snake : snake.slice(0, -1)
  return body.some((cell) => cell.x === head.x && cell.y === head.y)
}

const tick = (state: GameState, roll: number): GameState => {
  if (state.phase !== 'running') return state

  const [turnNext, ...turns] = state.turns
  const dir = turnNext ?? state.dir
  const step = DIR_VEC[dir]
  const head = { x: state.snake[0].x + step.x, y: state.snake[0].y + step.y }
  const eats = head.x === state.food.x && head.y === state.food.y
  if (hitsWall(head) || hitsBody(head, state.snake, eats)) {
    return { ...state, phase: 'over' }
  }

  const snake = [head, ...(eats ? state.snake : state.snake.slice(0, -1))]
  if (!eats) return { ...state, snake, dir, turns }

  const score = state.score + state.level
  return {
    ...state,
    snake,
    dir,
    turns,
    score,
    top: Math.max(state.top, score),
    food: spawnFood(snake, roll),
  }
}

export const reduce = (state: GameState, event: GameEvent): GameState => {
  switch (event.type) {
    case 'TURN':
      return turn(state, event.dir)
    case 'SELECT':
      return select(state, event.roll)
    case 'TICK':
      return tick(state, event.roll)
    case 'HIDE':
      return state.phase === 'running' ? { ...state, phase: 'paused' } : state
    case 'TOP':
      return { ...state, top: Math.max(state.top, event.top) }
    case 'LEVEL':
      return { ...state, level: clampLevel(event.level) }
  }
}
