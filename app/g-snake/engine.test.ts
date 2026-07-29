import assert from 'node:assert/strict'
import test from 'node:test'
import {
  COLS,
  type Dir,
  type GameEvent,
  type GameState,
  initialState,
  MAX_LEVEL,
  MENU_ITEMS,
  MIN_LEVEL,
  ROWS,
  reduce,
  stepMsFor,
} from './engine.ts'

const turn = (dir: Dir): GameEvent => ({ type: 'TURN', dir, roll: 0.5 })

const running = (patch: Partial<GameState> = {}): GameState => ({
  ...initialState,
  phase: 'running',
  ...patch,
})

test('stepMsFor maps level 1..9 onto 295..95ms', () => {
  assert.equal(stepMsFor(MIN_LEVEL), 295)
  assert.equal(stepMsFor(5), 195)
  assert.equal(stepMsFor(MAX_LEVEL), 95)
})

test('menu arrows cycle the entries and ignore the x axis', () => {
  assert.equal(reduce(initialState, turn('down')).menuIndex, 1)
  assert.equal(
    reduce(initialState, turn('up')).menuIndex,
    MENU_ITEMS.length - 1,
  )
  const last = { ...initialState, menuIndex: MENU_ITEMS.length - 1 }
  assert.equal(reduce(last, turn('down')).menuIndex, 0)
  assert.equal(reduce(initialState, turn('left')), initialState)
})

test('menu select routes to game, level picker and top score', () => {
  const started = reduce(initialState, { type: 'SELECT', roll: 0 })
  assert.equal(started.phase, 'running')
  assert.equal(started.score, 0)
  assert.deepEqual(started.snake[0], { x: 5, y: 5 })
  assert.deepEqual(started.food, { x: 0, y: 0 })

  const picker = { ...initialState, menuIndex: 1 }
  assert.equal(reduce(picker, { type: 'SELECT', roll: 0 }).phase, 'level')
  const tops = { ...initialState, menuIndex: 2 }
  assert.equal(reduce(tops, { type: 'SELECT', roll: 0 }).phase, 'tops')
})

test('start spawns food on a free cell for any roll', () => {
  const high = reduce(initialState, { type: 'SELECT', roll: 0.999999 })
  assert.deepEqual(high.food, { x: COLS - 1, y: ROWS - 1 })
})

test('level picker clamps and only listens to the x axis', () => {
  const picker: GameState = { ...initialState, phase: 'level' }
  assert.equal(reduce(picker, turn('right')).level, 6)
  assert.equal(reduce(picker, turn('up')), picker)
  const top = { ...picker, level: MAX_LEVEL }
  assert.equal(reduce(top, turn('right')).level, MAX_LEVEL)
  const bottom = { ...picker, level: MIN_LEVEL }
  assert.equal(reduce(bottom, turn('left')).level, MIN_LEVEL)
  assert.equal(reduce(picker, { type: 'SELECT', roll: 0 }).phase, 'menu')
  assert.equal(
    reduce(initialState, { type: 'LEVEL', level: 42 }).level,
    MAX_LEVEL,
  )
  assert.equal(
    reduce(initialState, { type: 'LEVEL', level: 0 }).level,
    MIN_LEVEL,
  )
})

test('turn queue rejects same-axis turns and caps at three', () => {
  assert.deepEqual(reduce(running(), turn('right')).turns, [])
  assert.deepEqual(reduce(running(), turn('left')).turns, [])
  const one = reduce(running(), turn('up'))
  assert.deepEqual(one.turns, ['up'])
  // the queued 'up' is the heading, so 'down' shares its axis
  assert.deepEqual(reduce(one, turn('down')).turns, ['up'])
  const three = [turn('left'), turn('up')].reduce(reduce, one)
  assert.deepEqual(three.turns, ['up', 'left', 'up'])
  assert.deepEqual(reduce(three, turn('right')).turns, ['up', 'left', 'up'])
})

test('any turn resumes a paused run, even a rejected one', () => {
  const paused = running({ phase: 'paused' })
  assert.equal(reduce(paused, turn('right')).phase, 'running')
  assert.equal(reduce(paused, turn('up')).phase, 'running')
})

test('tick advances the head and consumes one queued turn', () => {
  const queued = reduce(running(), turn('up'))
  const next = reduce(queued, { type: 'TICK', roll: 0.5 })
  assert.deepEqual(next.snake[0], { x: 5, y: 4 })
  assert.equal(next.snake.length, 3)
  assert.equal(next.dir, 'up')
  assert.deepEqual(next.turns, [])
})

test('eating grows the snake, scores the level and respawns food', () => {
  const hungry = running({
    snake: [
      { x: 12, y: 5 },
      { x: 11, y: 5 },
      { x: 10, y: 5 },
    ],
    food: { x: 13, y: 5 },
  })
  const fed = reduce(hungry, { type: 'TICK', roll: 0 })
  assert.deepEqual(fed.snake[0], { x: 13, y: 5 })
  assert.equal(fed.snake.length, 4)
  assert.equal(fed.score, hungry.level)
  assert.equal(fed.top, hungry.level)
  assert.deepEqual(fed.food, { x: 0, y: 0 })
})

test('walls and body end the run', () => {
  const atWall = running({
    snake: [
      { x: 19, y: 5 },
      { x: 18, y: 5 },
      { x: 17, y: 5 },
    ],
  })
  assert.equal(reduce(atWall, { type: 'TICK', roll: 0.5 }).phase, 'over')

  const coiled = running({
    dir: 'down',
    snake: [
      { x: 5, y: 5 },
      { x: 5, y: 6 },
      { x: 6, y: 6 },
      { x: 6, y: 5 },
    ],
    food: { x: 0, y: 0 },
  })
  assert.equal(reduce(coiled, { type: 'TICK', roll: 0.5 }).phase, 'over')
})

test('the vacated tail cell is legal to enter', () => {
  const chasing = running({
    dir: 'down',
    snake: [
      { x: 5, y: 5 },
      { x: 6, y: 5 },
      { x: 6, y: 6 },
      { x: 5, y: 6 },
    ],
    food: { x: 0, y: 0 },
  })
  const next = reduce(chasing, { type: 'TICK', roll: 0.5 })
  assert.equal(next.phase, 'running')
  assert.deepEqual(next.snake[0], { x: 5, y: 6 })
})

test('a full board parks the food sentinel off-grid', () => {
  const cells = Array.from({ length: COLS * ROWS }, (_, key) => ({
    x: key % COLS,
    y: Math.floor(key / COLS),
  }))
  const snake = cells.filter((cell) => cell.x !== 0 || cell.y !== 0)
  const packed = running({ dir: 'left', snake, food: { x: 0, y: 0 } })
  const next = reduce(packed, { type: 'TICK', roll: 0.5 })
  assert.equal(next.phase, 'running')
  assert.equal(next.snake.length, COLS * ROWS)
  assert.deepEqual(next.food, { x: -1, y: -1 })
})

test('pause, hide, top score and game-over guards', () => {
  assert.equal(reduce(running(), { type: 'SELECT', roll: 0.5 }).phase, 'paused')
  const paused = running({ phase: 'paused' })
  assert.equal(reduce(paused, { type: 'SELECT', roll: 0.5 }).phase, 'running')
  assert.equal(reduce(running(), { type: 'HIDE' }).phase, 'paused')
  assert.equal(reduce(initialState, { type: 'HIDE' }), initialState)
  assert.equal(reduce(initialState, { type: 'TOP', top: 10 }).top, 10)
  const record = { ...initialState, top: 10 }
  assert.equal(reduce(record, { type: 'TOP', top: 3 }).top, 10)

  const over = running({ phase: 'over' })
  assert.equal(reduce(over, turn('up')), over)
  assert.equal(reduce(over, { type: 'TICK', roll: 0.5 }), over)
  assert.equal(reduce(over, { type: 'SELECT', roll: 0.5 }).phase, 'menu')
})
