import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildPuzzle,
  type CrosswordEdition,
  editionFromChallenge,
  puzzleForDate,
} from './crossword-data.ts'

/* 3×3 fixture:  C A T   across: CAT, RAT
                 A # A   down:   CAR, TAT */
const crossed = buildPuzzle({
  locale: 'en',
  publicationDate: '2026-07-27',
  solution: ['CAT', 'A#A', 'RAT'],
  clues: {
    across: { CAT: 'Purrs', RAT: 'Squeals' },
    down: { CAR: 'Drives', TAT: 'Inks' },
  },
})

test('buildPuzzle numbers starts in row-major order, across before down', () => {
  assert.deepEqual(
    crossed.entries.map((entry) => entry.id),
    ['1-across', '1-down', '2-down', '3-across'],
  )
  assert.deepEqual(
    crossed.entries.map((entry) => entry.gridAnswer),
    ['CAT', 'CAR', 'TAT', 'RAT'],
  )
  assert.equal(crossed.cells[0]?.number, 1)
  assert.equal(crossed.cells[2]?.number, 2)
  assert.equal(crossed.cells[6]?.number, 3)
  assert.equal(crossed.cells[1]?.number, undefined)
})

test('buildPuzzle lists every entry crossing a cell', () => {
  assert.deepEqual(crossed.cells[0]?.entryIds, ['1-across', '1-down'])
  assert.deepEqual(crossed.cells[6]?.entryIds, ['1-down', '3-across'])
  assert.deepEqual(crossed.cells[4]?.entryIds, [])
  assert.deepEqual(crossed.entries[0]?.cells, [0, 1, 2])
  assert.deepEqual(crossed.entries[1]?.cells, [0, 3, 6])
})

test('buildPuzzle attaches clues by grid answer', () => {
  assert.equal(crossed.entries[0]?.clue, 'Purrs')
  assert.equal(crossed.entries[2]?.clue, 'Inks')
})

test('one-cell islands get no number and no entry', () => {
  const islands = buildPuzzle({
    locale: 'en',
    publicationDate: '2026-07-27',
    solution: ['A#B', '###', 'C#D'],
  })
  assert.deepEqual(islands.entries, [])
  assert.ok(islands.cells.every((cell) => cell.number === undefined))
})

test('edge-column words stop at the grid border instead of wrapping', () => {
  const tight = buildPuzzle({
    locale: 'en',
    publicationDate: '2026-07-27',
    solution: ['AB', 'CD'],
  })
  assert.deepEqual(
    tight.entries.map((entry) => entry.id),
    ['1-across', '1-down', '2-down', '3-across'],
  )
  assert.deepEqual(tight.entries[0]?.cells, [0, 1])
  assert.deepEqual(tight.entries[3]?.cells, [2, 3])
  assert.deepEqual(tight.entries[2]?.cells, [1, 3])
})

/* Known limitation: the clue book keys by answer, so a repeated answer
   shares one clue across both entries. */
test('two entries sharing an answer receive the same clue', () => {
  const doubled = buildPuzzle({
    locale: 'en',
    publicationDate: '2026-07-27',
    solution: ['AB', '##', 'AB'],
    clues: { across: { AB: 'Twice over' }, down: {} },
  })
  assert.deepEqual(
    doubled.entries.map((entry) => entry.gridAnswer),
    ['AB', 'AB'],
  )
  assert.equal(doubled.entries[0]?.clue, 'Twice over')
  assert.equal(doubled.entries[1]?.clue, 'Twice over')
})

test('puzzleForDate returns null on an empty edition list', () => {
  assert.equal(puzzleForDate([], '2026-07-27'), null)
})

test('puzzleForDate serves the newest published edition, oldest as fallback', () => {
  const edition = (publicationDate: string): CrosswordEdition =>
    editionFromChallenge({
      publicationDate,
      puzzles: { en: { solution: ['AB', 'CD'] } },
    })
  const editions = [edition('2026-07-27'), edition('2026-07-29')]
  assert.equal(
    puzzleForDate(editions, '2026-07-28')?.en.publicationDate,
    '2026-07-27',
  )
  assert.equal(
    puzzleForDate(editions, '2026-07-26')?.en.publicationDate,
    '2026-07-27',
  )
  assert.equal(
    puzzleForDate(editions, '2026-08-01')?.en.publicationDate,
    '2026-07-29',
  )
})
