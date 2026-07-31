import assert from 'node:assert/strict'
import test from 'node:test'
import type { CrosswordCell, CrosswordPuzzle } from './crossword-data.ts'
import {
  type CrosswordAction,
  type CrosswordState,
  createCrosswordState,
  crosswordReducer,
  formatTime,
  restoreCrosswordState,
  serializeCrosswordState,
  shareCard,
} from './crossword-engine.ts'

/* 2×2 fixture: cell 0 is a block, cells 1..3 hold A B C */
const cellAt = (index: number, solution: string | null): CrosswordCell => ({
  index,
  row: Math.floor(index / 2),
  column: index % 2,
  solution,
  entryIds: [],
})

const puzzle: CrosswordPuzzle = {
  id: 'en:2026-07-29',
  locale: 'en',
  publicationDate: '2026-07-29',
  width: 2,
  height: 2,
  cells: [cellAt(0, null), cellAt(1, 'A'), cellAt(2, 'B'), cellAt(3, 'C')],
  entries: [],
}

const initial = createCrosswordState(puzzle)

type WriteSpec = {
  index: number
  value: string
  next: number
  now?: number
  incorrect?: boolean
  checked?: boolean
}

const write = (spec: WriteSpec): CrosswordAction => ({
  type: 'WRITE',
  index: spec.index,
  value: spec.value,
  nextIndex: spec.next,
  incorrect: spec.incorrect ?? false,
  checked: spec.checked ?? false,
  now: spec.now ?? 0,
})

const apply = (
  state: CrosswordState,
  actions: readonly CrosswordAction[],
): CrosswordState => actions.reduce(crosswordReducer, state)

test('createCrosswordState selects the first letter cell', () => {
  assert.equal(initial.selectedCell, 1)
  assert.equal(initial.status, 'not-started')
  assert.equal(initial.direction, 'across')
  assert.deepEqual(initial.guesses, ['', '', '', ''])
})

test('write stores the letter, advances the caret and starts the clock', () => {
  const s = crosswordReducer(
    initial,
    write({ index: 1, value: 'A', next: 2, now: 500 }),
  )
  assert.equal(s.guesses[1], 'A')
  assert.equal(s.selectedCell, 2)
  assert.equal(s.status, 'playing')
  assert.equal(s.runStartedAt, 500)
  assert.equal(s.undoStack.length, 1)
})

test('write respects pencil mode and revealed cells', () => {
  const pencil = apply(initial, [
    { type: 'TOGGLE_PENCIL' },
    write({ index: 1, value: 'A', next: 2 }),
  ])
  assert.equal(pencil.pencilMode, true)
  assert.equal(pencil.pencilCells[1], true)

  const revealed = crosswordReducer(initial, {
    type: 'REVEAL',
    indices: [1],
    solutions: { 1: 'A' },
    now: 0,
  })
  const blocked = write({ index: 1, value: 'Z', next: 2 })
  assert.equal(crosswordReducer(revealed, blocked), revealed)
})

test('writing while paused never restarts the clock', () => {
  const paused = apply(initial, [
    { type: 'START', now: 0 },
    { type: 'PAUSE', now: 10, automatic: false },
  ])
  const s = crosswordReducer(
    paused,
    write({ index: 1, value: 'A', next: 2, now: 20 }),
  )
  assert.equal(s.status, 'paused')
  assert.equal(s.runStartedAt, null)
  assert.equal(s.guesses[1], 'A')
})

test('clear wipes a cell and its flags', () => {
  const filled = crosswordReducer(
    initial,
    write({ index: 1, value: 'A', next: 2, checked: true }),
  )
  const cleared = crosswordReducer(filled, {
    type: 'CLEAR',
    index: 1,
    nextIndex: 1,
    now: 10,
  })
  assert.equal(cleared.guesses[1], '')
  assert.equal(cleared.checkedCells[1], false)
})

test('clear on an empty cell going nowhere is a no-op', () => {
  const still: CrosswordAction = {
    type: 'CLEAR',
    index: 1,
    nextIndex: 1,
    now: 0,
  }
  assert.equal(crosswordReducer(initial, still), initial)
  const moving: CrosswordAction = {
    type: 'CLEAR',
    index: 2,
    nextIndex: 1,
    now: 0,
  }
  assert.equal(crosswordReducer(initial, moving).selectedCell, 1)
})

test('check flags only written cells', () => {
  const s = apply(initial, [
    write({ index: 1, value: 'A', next: 2 }),
    write({ index: 2, value: 'X', next: 3 }),
    {
      type: 'CHECK',
      indices: [1, 2, 3],
      solutions: { 1: 'A', 2: 'B', 3: 'C' },
    },
  ])
  assert.equal(s.checkedCells[1], true)
  assert.equal(s.incorrectCells[1], false)
  assert.equal(s.checkedCells[2], true)
  assert.equal(s.incorrectCells[2], true)
  assert.equal(s.checkedCells[3], false)
})

test('reveal writes the solution and clears pencil and error flags', () => {
  const s = apply(initial, [
    { type: 'TOGGLE_PENCIL' },
    write({ index: 2, value: 'X', next: 3, incorrect: true, checked: true }),
    { type: 'REVEAL', indices: [2, 3], solutions: { 2: 'B' }, now: 20 },
  ])
  assert.equal(s.guesses[2], 'B')
  assert.equal(s.revealedCells[2], true)
  assert.equal(s.pencilCells[2], false)
  assert.equal(s.incorrectCells[2], false)
  // index 3 had no solution in the payload, so it stays untouched
  assert.equal(s.revealedCells[3], false)
})

test('the clock accumulates across pause and resume', () => {
  const s = apply(initial, [
    { type: 'START', now: 0 },
    { type: 'PAUSE', now: 1000, automatic: true },
    { type: 'RESUME', now: 5000 },
    { type: 'COMPLETE', now: 7000 },
  ])
  assert.equal(s.status, 'complete')
  assert.equal(s.elapsedMs, 3000)
  assert.equal(s.runStartedAt, null)
})

test('clock transitions guard their source status', () => {
  const started = crosswordReducer(initial, { type: 'START', now: 1 })
  assert.equal(crosswordReducer(started, { type: 'START', now: 2 }), started)
  const pause: CrosswordAction = { type: 'PAUSE', now: 2, automatic: false }
  assert.equal(crosswordReducer(initial, pause), initial)
  assert.equal(crosswordReducer(initial, { type: 'RESUME', now: 2 }), initial)
  const paused = crosswordReducer(started, {
    type: 'PAUSE',
    now: 3,
    automatic: true,
  })
  assert.equal(paused.autoPaused, true)
  const complete = crosswordReducer(paused, { type: 'COMPLETE', now: 4 })
  assert.equal(
    crosswordReducer(complete, { type: 'COMPLETE', now: 5 }),
    complete,
  )
})

test('undo and redo walk the snapshot stacks', () => {
  const two = apply(initial, [
    write({ index: 1, value: 'A', next: 2 }),
    write({ index: 2, value: 'B', next: 3 }),
  ])
  const undone = crosswordReducer(two, { type: 'UNDO' })
  assert.equal(undone.guesses[1], 'A')
  assert.equal(undone.guesses[2], '')
  assert.equal(undone.selectedCell, 2)
  assert.equal(undone.redoStack.length, 1)

  const redone = crosswordReducer(undone, { type: 'REDO' })
  assert.equal(redone.guesses[2], 'B')
  assert.equal(redone.selectedCell, 3)

  const rewritten = crosswordReducer(
    undone,
    write({ index: 2, value: 'C', next: 3 }),
  )
  assert.deepEqual(rewritten.redoStack, [])

  assert.equal(crosswordReducer(initial, { type: 'UNDO' }), initial)
  assert.equal(crosswordReducer(initial, { type: 'REDO' }), initial)
  const done = crosswordReducer(two, { type: 'COMPLETE', now: 9 })
  assert.equal(crosswordReducer(done, { type: 'UNDO' }), done)
})

test('the undo stack caps at eighty snapshots', () => {
  const spam = Array.from({ length: 85 }, (_, i) =>
    write({ index: 1, value: i % 2 === 0 ? 'A' : 'B', next: 1 }),
  )
  assert.equal(apply(initial, spam).undoStack.length, 80)
})

test('serialize and restore round-trip a paused game', () => {
  const played = apply(initial, [
    { type: 'TOGGLE_PENCIL' },
    write({ index: 1, value: 'A', next: 2, now: 100 }),
    { type: 'TOGGLE_PENCIL' },
    write({ index: 2, value: 'X', next: 3, incorrect: true, checked: true }),
    { type: 'REVEAL', indices: [3], solutions: { 3: 'C' }, now: 300 },
    { type: 'PAUSE', now: 1100, automatic: false },
  ])
  const persisted = serializeCrosswordState(played, puzzle.id)
  assert.deepEqual(persisted.pencilCells, [1])
  assert.deepEqual(persisted.checkedCells, [2])
  assert.deepEqual(persisted.revealedCells, [3])

  const restored = restoreCrosswordState(persisted, puzzle)
  assert.ok(restored)
  assert.deepEqual(restored.guesses, played.guesses)
  assert.deepEqual(restored.pencilCells, played.pencilCells)
  assert.deepEqual(restored.revealedCells, played.revealedCells)
  assert.deepEqual(restored.incorrectCells, played.incorrectCells)
  assert.equal(restored.selectedCell, played.selectedCell)
  assert.equal(restored.status, 'paused')
  assert.equal(restored.elapsedMs, played.elapsedMs)
  assert.equal(restored.runStartedAt, null)
})

test('restore rejects other puzzles, schemas and shapes', () => {
  const persisted = serializeCrosswordState(initial, puzzle.id)
  assert.equal(restoreCrosswordState(null, puzzle), null)
  assert.equal(restoreCrosswordState('nope', puzzle), null)
  const foreign = { ...persisted, puzzleId: 'es:1999-01-01' }
  assert.equal(restoreCrosswordState(foreign, puzzle), null)
  const future = { ...persisted, schemaVersion: 2 }
  assert.equal(restoreCrosswordState(future, puzzle), null)
  const short = { ...persisted, guesses: ['A'] }
  assert.equal(restoreCrosswordState(short, puzzle), null)
})

test('restore scrubs hostile payload fields', () => {
  const hostile = {
    schemaVersion: 1,
    puzzleId: puzzle.id,
    guesses: ['Z', 'a', 'BB', 'Ñ'],
    pencilCells: [1, 99, -1],
    checkedCells: 'nope',
    revealedCells: [3],
    incorrectCells: [1.5],
    selectedCell: 0,
    direction: 'diagonal',
    status: 'winning',
    elapsedMs: -5,
    runStartedAt: -100,
  }
  const restored = restoreCrosswordState(hostile, puzzle)
  assert.ok(restored)
  assert.deepEqual(restored.guesses, ['', '', '', 'Ñ'])
  assert.deepEqual(restored.pencilCells, [false, true, false, false])
  assert.deepEqual(restored.checkedCells, [false, false, false, false])
  assert.deepEqual(restored.revealedCells, [false, false, false, true])
  assert.deepEqual(restored.incorrectCells, [false, false, false, false])
  // the block cell falls back to the first letter cell
  assert.equal(restored.selectedCell, 1)
  assert.equal(restored.direction, 'across')
  assert.equal(restored.status, 'not-started')
  assert.equal(restored.elapsedMs, 0)
  assert.equal(restored.runStartedAt, null)
})

test('a playing save keeps a valid clock and restarts a broken one', () => {
  const persisted = serializeCrosswordState(initial, puzzle.id)
  const kept = restoreCrosswordState(
    { ...persisted, status: 'playing', runStartedAt: 12_345 },
    puzzle,
  )
  assert.equal(kept?.runStartedAt, 12_345)

  const before = Date.now()
  const repaired = restoreCrosswordState(
    { ...persisted, status: 'playing', runStartedAt: null },
    puzzle,
  )
  assert.ok(repaired)
  assert.equal(repaired.status, 'playing')
  assert.ok((repaired.runStartedAt ?? 0) >= before)
})

test('formatTime renders minutes and grows an hour part on demand', () => {
  assert.equal(formatTime(0), '0:00')
  assert.equal(formatTime(754_000), '12:34')
  assert.equal(formatTime(3_661_000), '1:01:01')
})

test('shareCard prints a clean solve as all-green rows', () => {
  const state: CrosswordState = { ...initial, elapsedMs: 754_000 }
  assert.equal(
    shareCard(puzzle, state),
    [
      'CROSSWORDS 2026-07-29 🗞️',
      '🟩🟩',
      '⏱️ 12:34 · sospedra.me/crosswords',
    ].join('\n'),
  )
})

test('shareCard marks checked rows yellow and revealed rows red', () => {
  const state: CrosswordState = {
    ...initial,
    checkedCells: [false, true, false, false],
    revealedCells: [false, false, false, true],
  }
  assert.equal(shareCard(puzzle, state).split('\n')[1], '🟨🟥')
})

test('shareCard lets a reveal outrank a check in the same row', () => {
  const state: CrosswordState = {
    ...initial,
    checkedCells: [false, false, true, false],
    revealedCells: [false, false, false, true],
  }
  assert.equal(shareCard(puzzle, state).split('\n')[1], '🟩🟥')
})

test('shareCard brands the spanish edition as crucigrama', () => {
  const spanish = { ...puzzle, locale: 'es' as const }
  assert.equal(
    shareCard(spanish, initial).split('\n')[0],
    'CRUCIGRAMA 2026-07-29 🗞️',
  )
})
