import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyMove,
  compress,
  FACE_NORMAL,
  FACES,
  type GameEvent,
  type GameState,
  initialState,
  isSolved,
  type Move,
  randomScramble,
  reduce,
  SLOTS,
  SOLVED,
  type Stickers,
  slotIndex,
  solutionFor,
} from './engine.ts'

const move = (face: Move['face'], prime = false): Move => ({ face, prime })

const applyAll = (stickers: Stickers, moves: readonly Move[]): Stickers =>
  moves.reduce(applyMove, stickers)

const run = (events: readonly GameEvent[]): GameState =>
  events.reduce(reduce, initialState)

test('the cube has 54 fixed slots and starts solved', () => {
  assert.equal(SLOTS.length, 54)
  assert.equal(isSolved(SOLVED), true)
})

test('four quarter turns of any face are the identity', () => {
  for (const face of FACES) {
    const once = applyMove(SOLVED, move(face))
    assert.equal(isSolved(once), false)
    const cycled = applyAll(once, [move(face), move(face), move(face)])
    assert.deepEqual(cycled, SOLVED)
  }
})

test('a prime turn undoes its plain turn', () => {
  for (const face of FACES) {
    assert.deepEqual(applyAll(SOLVED, [move(face), move(face, true)]), SOLVED)
  }
})

test('moves permute stickers and never touch centers', () => {
  const scrambled = applyAll(SOLVED, [
    move('R'),
    move('U', true),
    move('F'),
    move('D'),
    move('L', true),
    move('B'),
  ])
  for (const face of FACES) {
    const center = slotIndex(FACE_NORMAL[face], FACE_NORMAL[face])
    assert.equal(scrambled[center], face)
    assert.equal(scrambled.filter((sticker) => sticker === face).length, 9)
  }
})

test('compress folds runs of same-face moves', () => {
  const r = move('R')
  assert.deepEqual(compress([r, r, r]), [move('R', true)])
  assert.deepEqual(compress([r, r, r, r]), [])
  assert.deepEqual(compress([r, move('R', true)]), [])
  assert.deepEqual(compress([r, r]), [r, r])
  const mixed = [move('F'), move('F'), move('F'), move('U')]
  assert.deepEqual(compress(mixed), [move('F', true), move('U')])
  const cascade = [move('R'), move('U'), move('U', true), move('R', true)]
  assert.deepEqual(compress(cascade), [])
})

test('solutionFor unwinds any move history', () => {
  const history = [move('R'), move('U', true), move('F'), move('F')]
  const solution = solutionFor(history)
  assert.deepEqual(solution, [
    move('F', true),
    move('F', true),
    move('U'),
    move('R', true),
  ])
  const scrambled = applyAll(SOLVED, history)
  assert.deepEqual(applyAll(scrambled, solution), SOLVED)
})

test('randomScramble honors length and never repeats a face', () => {
  const rolls = [0.05, 0.9, 0.35, 0.6, 0.85, 0.15, 0.55, 0.4, 0.7, 0.25]
  let cursor = 0
  const roll = () => rolls[cursor++ % rolls.length]
  const moves = randomScramble(8, roll)
  assert.equal(moves.length, 8)
  for (const [index, scrambleMove] of moves.entries()) {
    assert.equal(FACES.includes(scrambleMove.face), true)
    if (index > 0) assert.notEqual(scrambleMove.face, moves[index - 1].face)
  }
})

test('randomScramble terminates on a degenerate constant roll', () => {
  const moves = randomScramble(8, () => 0)
  assert.equal(moves.length, 8)
  for (const [index, scrambleMove] of moves.entries()) {
    assert.equal(FACES.includes(scrambleMove.face), true)
    if (index > 0) assert.notEqual(scrambleMove.face, moves[index - 1].face)
  }
})

test('play buffers turns and records history', () => {
  const one = reduce(initialState, { type: 'PLAY', move: move('R'), now: 0 })
  assert.deepEqual(one.turning, { move: move('R'), kind: 'play' })
  assert.deepEqual(one.history, [move('R')])
  // not armed: casual turns never start the clock
  assert.equal(one.timerStart, null)

  const two = reduce(one, { type: 'PLAY', move: move('U'), now: 1 })
  assert.deepEqual(two.queue, [{ move: move('U'), kind: 'play' }])
  assert.deepEqual(two.history, [move('R'), move('U')])
})

test('turn end applies the move and drains the queue', () => {
  const two = run([
    { type: 'PLAY', move: move('R'), now: 0 },
    { type: 'PLAY', move: move('U'), now: 1 },
  ])
  const first = reduce(two, { type: 'TURN_END', now: 2 })
  assert.deepEqual(first.stickers, applyMove(SOLVED, move('R')))
  assert.deepEqual(first.turning, { move: move('U'), kind: 'play' })
  const second = reduce(first, { type: 'TURN_END', now: 3 })
  assert.equal(second.turning, null)
  assert.equal(second.phase, 'idle')
})

test('undo and redo travel through the animation queue', () => {
  const played = run([
    { type: 'PLAY', move: move('R'), now: 0 },
    { type: 'TURN_END', now: 1 },
  ])
  const undone = reduce(played, { type: 'UNDO' })
  assert.deepEqual(undone.history, [])
  assert.deepEqual(undone.redo, [move('R')])
  assert.deepEqual(undone.turning, { move: move('R', true), kind: 'undo' })
  const settled = reduce(undone, { type: 'TURN_END', now: 2 })
  assert.deepEqual(settled.stickers, SOLVED)

  const redone = reduce(settled, { type: 'REDO' })
  assert.deepEqual(redone.history, [move('R')])
  assert.deepEqual(redone.redo, [])
  assert.deepEqual(redone.turning, { move: move('R'), kind: 'redo' })

  assert.equal(reduce(initialState, { type: 'UNDO' }), initialState)
  assert.equal(reduce(initialState, { type: 'REDO' }), initialState)
})

test('scramble arms the timer and the first armed turn starts it', () => {
  const armed = run([
    { type: 'SCRAMBLE', moves: [move('R'), move('U')] },
    { type: 'TURN_END', now: 1 },
    { type: 'TURN_END', now: 2 },
  ])
  assert.equal(armed.phase, 'idle')
  assert.equal(armed.armed, true)
  assert.equal(armed.timerStart, null)

  const ticking = reduce(armed, {
    type: 'PLAY',
    move: move('U', true),
    now: 1000,
  })
  assert.equal(ticking.timerStart, 1000)
})

test('returning to identity stops the clock with a result', () => {
  const finished = run([
    { type: 'SCRAMBLE', moves: [move('R')] },
    { type: 'TURN_END', now: 1 },
    { type: 'PLAY', move: move('R', true), now: 1000 },
    { type: 'TURN_END', now: 1600 },
  ])
  assert.deepEqual(finished.stickers, SOLVED)
  assert.equal(finished.resultMs, 600)
  assert.equal(finished.timerStart, null)
  assert.equal(finished.armed, false)
})

test('scrambling blocks player input until it settles', () => {
  const scrambling = reduce(initialState, {
    type: 'SCRAMBLE',
    moves: [move('R'), move('U')],
  })
  assert.equal(scrambling.phase, 'scrambling')
  const blockedPlay: GameEvent = { type: 'PLAY', move: move('F'), now: 5 }
  assert.equal(reduce(scrambling, blockedPlay), scrambling)
  const blockedScramble: GameEvent = { type: 'SCRAMBLE', moves: [move('F')] }
  assert.equal(reduce(scrambling, blockedScramble), scrambling)
  const half = reduce(scrambling, { type: 'TURN_END', now: 6 })
  // one queued turn left, so the phase holds
  assert.equal(half.phase, 'scrambling')
})

test('solve replays the compressed inverse of the history', () => {
  const played = run([
    { type: 'PLAY', move: move('R'), now: 0 },
    { type: 'TURN_END', now: 1 },
    { type: 'PLAY', move: move('U'), now: 2 },
    { type: 'TURN_END', now: 3 },
  ])
  const solving = reduce(played, { type: 'SOLVE' })
  assert.equal(solving.phase, 'solving')
  assert.deepEqual(solving.history, [])
  assert.deepEqual(solving.turning, { move: move('U', true), kind: 'solve' })
  const steps: GameEvent[] = [
    { type: 'TURN_END', now: 4 },
    { type: 'TURN_END', now: 5 },
  ]
  const done = steps.reduce(reduce, solving)
  assert.deepEqual(done.stickers, SOLVED)
  assert.equal(done.phase, 'idle')

  assert.equal(reduce(initialState, { type: 'SOLVE' }), initialState)
})

test('reset returns the initial state', () => {
  const messy = run([{ type: 'PLAY', move: move('R'), now: 0 }])
  assert.equal(reduce(messy, { type: 'RESET' }), initialState)
})
