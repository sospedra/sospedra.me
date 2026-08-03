// Facelet cube engine. Sticker slots are fixed (position, normal) pairs in
// grid space; a turn rotates the layer's slots and permutes their colors.

export type Face = 'U' | 'D' | 'L' | 'R' | 'F' | 'B'
export type Move = { face: Face; prime: boolean }
export type Vec = readonly [number, number, number]

export const FACES: readonly Face[] = ['U', 'R', 'F', 'D', 'L', 'B']

export const FACE_NORMAL: Record<Face, Vec> = {
  U: [0, 1, 0],
  D: [0, -1, 0],
  R: [1, 0, 0],
  L: [-1, 0, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
}

const GRID = [-1, 0, 1] as const

// quarter turns about a base axis, right-hand rule
const QUARTER: Record<number, (v: Vec) => Vec> = {
  0: ([x, y, z]) => [x, -z, y],
  1: ([x, y, z]) => [z, y, -x],
  2: ([x, y, z]) => [-y, x, z],
}

export const axisOf = (normal: Vec) =>
  normal.findIndex((component) => component !== 0)

// clockwise seen from outside the face = -90° about the outward normal
export const rotateForMove = (move: Move) => {
  const normal = FACE_NORMAL[move.face]
  const axis = axisOf(normal)
  const sign = normal[axis] * (move.prime ? 1 : -1)
  const turn = QUARTER[axis]
  if (sign === 1) return turn
  return (v: Vec) => turn(turn(turn(v)))
}

export type Slot = { position: Vec; normal: Vec; face: Face }

const buildSlots = (): Slot[] =>
  FACES.flatMap((face) => {
    const normal = FACE_NORMAL[face]
    const axis = axisOf(normal)
    return GRID.flatMap((a) =>
      GRID.map((b) => {
        const [free1, free2] = [0, 1, 2].filter((i) => i !== axis)
        const position: [number, number, number] = [0, 0, 0]
        position[axis] = normal[axis]
        position[free1] = a
        position[free2] = b
        return { position: position as Vec, normal, face }
      }),
    )
  })

export const SLOTS: readonly Slot[] = buildSlots()

const slotKey = (position: Vec, normal: Vec) =>
  `${position.join(',')}|${normal.join(',')}`

const SLOT_INDEX = new Map(
  SLOTS.map((slot, index) => [slotKey(slot.position, slot.normal), index]),
)

export const slotIndex = (position: Vec, normal: Vec) => {
  const index = SLOT_INDEX.get(slotKey(position, normal))
  if (index === undefined) throw new Error(`No slot at ${position} ${normal}`)
  return index
}

export type Stickers = readonly Face[]

export const SOLVED: Stickers = SLOTS.map((slot) => slot.face)

export const inLayer = (position: Vec, face: Face) => {
  const normal = FACE_NORMAL[face]
  const axis = axisOf(normal)
  return position[axis] === normal[axis]
}

export const applyMove = (stickers: Stickers, move: Move): Stickers => {
  const rotate = rotateForMove(move)
  const next = [...stickers]
  for (const [index, slot] of SLOTS.entries()) {
    if (!inLayer(slot.position, move.face)) continue
    const target = slotIndex(rotate(slot.position), rotate(slot.normal))
    next[target] = stickers[index]
  }
  return next
}

// centers never move: a face is done when it matches its center
export const isSolved = (stickers: Stickers) =>
  SLOTS.every((slot, index) => {
    const center = slotIndex(slot.normal, slot.normal)
    return stickers[index] === stickers[center]
  })

export const inverse = (move: Move): Move => ({
  face: move.face,
  prime: !move.prime,
})

// net quarter turns per run of same-face moves: 0 drops, 3 flips to prime
export const compress = (moves: readonly Move[]): Move[] => {
  const stack: { face: Face; net: number }[] = []
  for (const move of moves) {
    const top = stack.at(-1)
    const delta = move.prime ? 3 : 1
    if (!top || top.face !== move.face) {
      stack.push({ face: move.face, net: delta })
      continue
    }
    top.net = (top.net + delta) % 4
    if (top.net === 0) stack.pop()
  }
  return stack.flatMap(({ face, net }): Move[] => {
    if (net === 3) return [{ face, prime: true }]
    return Array.from({ length: net }, () => ({ face, prime: false }))
  })
}

export const solutionFor = (history: readonly Move[]): Move[] =>
  compress(history).toReversed().map(inverse)

// pick indexes the 5-face list with the previous face removed
const scrambleFace = (previous: Face | undefined, roll: number): Face => {
  if (previous === undefined) return FACES[Math.floor(roll * FACES.length)]
  const previousIndex = FACES.indexOf(previous)
  const pick = Math.floor(roll * (FACES.length - 1))
  return FACES[pick < previousIndex ? pick : pick + 1]
}

export const randomScramble = (length: number, roll: () => number): Move[] => {
  const moves: Move[] = []
  for (let index = 0; index < length; index += 1) {
    const face = scrambleFace(moves.at(-1)?.face, roll())
    moves.push({ face, prime: roll() < 0.5 })
  }
  return moves
}

export type TurnKind = 'play' | 'undo' | 'redo' | 'scramble' | 'solve'
export type Turn = { move: Move; kind: TurnKind }

export type Phase = 'idle' | 'scrambling' | 'solving'

export type TimerState =
  | { status: 'off' }
  | { status: 'armed' }
  | { status: 'running'; startedAt: number }
  | { status: 'done'; resultMs: number }

export type GameState = {
  stickers: Stickers
  history: readonly Move[]
  redo: readonly Move[]
  queue: readonly Turn[]
  turning: Turn | null
  phase: Phase
  timer: TimerState
}

export const initialState: GameState = {
  stickers: SOLVED,
  history: [],
  redo: [],
  queue: [],
  turning: null,
  phase: 'idle',
  timer: { status: 'off' },
}

export type GameEvent =
  | { type: 'PLAY'; move: Move; now: number }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SCRAMBLE'; moves: Move[] }
  | { type: 'SOLVE' }
  | { type: 'RESET' }
  | { type: 'TURN_END'; now: number }

const enqueue = (state: GameState, turns: Turn[]): GameState => {
  const queue = [...state.queue, ...turns]
  if (state.turning) return { ...state, queue }
  return { ...state, turning: queue[0] ?? null, queue: queue.slice(1) }
}

const play = (state: GameState, move: Move, now: number): GameState => {
  if (state.phase !== 'idle') return state
  const timer: TimerState =
    state.timer.status === 'armed'
      ? { status: 'running', startedAt: now }
      : state.timer
  return enqueue(
    { ...state, history: [...state.history, move], redo: [], timer },
    [{ move, kind: 'play' }],
  )
}

const undo = (state: GameState): GameState => {
  const last = state.history.at(-1)
  if (state.phase !== 'idle' || !last) return state
  return enqueue(
    {
      ...state,
      history: state.history.slice(0, -1),
      redo: [...state.redo, last],
    },
    [{ move: inverse(last), kind: 'undo' }],
  )
}

const redo = (state: GameState): GameState => {
  const next = state.redo.at(-1)
  if (state.phase !== 'idle' || !next) return state
  return enqueue(
    {
      ...state,
      history: [...state.history, next],
      redo: state.redo.slice(0, -1),
    },
    [{ move: next, kind: 'redo' }],
  )
}

const scramble = (state: GameState, moves: Move[]): GameState => {
  if (state.phase !== 'idle') return state
  return enqueue(
    {
      ...state,
      phase: 'scrambling',
      history: [...state.history, ...moves],
      redo: [],
      timer: { status: 'off' },
    },
    moves.map((move) => ({ move, kind: 'scramble' as const })),
  )
}

const solve = (state: GameState): GameState => {
  const solution = solutionFor(state.history)
  if (state.phase !== 'idle' || solution.length === 0) return state
  return enqueue(
    {
      ...state,
      phase: 'solving',
      history: [],
      redo: [],
      timer: { status: 'off' },
    },
    solution.map((move) => ({ move, kind: 'solve' as const })),
  )
}

const settle = (state: GameState, now: number): GameState => {
  if (state.turning) return state
  if (state.phase === 'scrambling') {
    return { ...state, phase: 'idle', timer: { status: 'armed' } }
  }
  if (state.timer.status === 'running' && isSolved(state.stickers)) {
    return {
      ...state,
      phase: 'idle',
      timer: { status: 'done', resultMs: now - state.timer.startedAt },
    }
  }
  return { ...state, phase: 'idle' }
}

const turnEnd = (state: GameState, now: number): GameState => {
  if (!state.turning) return state
  const after: GameState = {
    ...state,
    stickers: applyMove(state.stickers, state.turning.move),
    turning: state.queue[0] ?? null,
    queue: state.queue.slice(1),
  }
  return settle(after, now)
}

export const reduce = (state: GameState, event: GameEvent): GameState => {
  switch (event.type) {
    case 'PLAY':
      return play(state, event.move, event.now)
    case 'UNDO':
      return undo(state)
    case 'REDO':
      return redo(state)
    case 'SCRAMBLE':
      return scramble(state, event.moves)
    case 'SOLVE':
      return solve(state)
    case 'RESET':
      return initialState
    case 'TURN_END':
      return turnEnd(state, event.now)
  }
}
