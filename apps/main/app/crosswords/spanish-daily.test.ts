import assert from 'node:assert/strict'
import test from 'node:test'
import type { CrosswordChallengeFile } from './crossword-data.ts'
import {
  spanishChallengeFromPayload,
  withSpanishPuzzle,
} from './spanish-daily.ts'

/* 3×3 fixture mirroring the smartgames JSON:API envelope.
   Board:  AÑO      across: AÑO, ASA
           M#E      down:   AMA, OEA
           AsA  (lowercase s proves board uppercasing) */
const BOARD = 'AÑO\r\nM#E\r\nAsA'

const ENTRIES = {
  across: {
    '1': { col: 0, row: 0, clue: 'Doce meses.', answer: 'AÑO' },
    '4': { col: 0, row: 2, clue: '  Se agarra por ella.  ', answer: 'asa' },
  },
  down: {
    '1': { col: 0, row: 0, clue: 'Cuida y cría.', answer: 'AMA' },
    '3': { col: 2, row: 0, clue: 'Bloque americano.', answer: 'OÉA' },
  },
}

type Overrides = {
  board?: string
  entries?: unknown
  publicationDate?: string
}

const payload = (overrides: Overrides = {}) => ({
  data: {
    id: 6623,
    attributes: {
      publicationDate: overrides.publicationDate ?? '2026-07-29',
      config: {
        board: overrides.board ?? BOARD,
        entries: overrides.entries ?? ENTRIES,
      },
    },
  },
})

test('maps the payload into an uppercase accentless solution', () => {
  const challenge = spanishChallengeFromPayload(payload())
  assert.equal(challenge?.publicationDate, '2026-07-29')
  assert.deepEqual(challenge?.puzzle.solution, ['AÑO', 'M#E', 'ASA'])
})

test('keys clues by normalized answer', () => {
  const clues = spanishChallengeFromPayload(payload())?.puzzle.clues
  assert.equal(clues?.across.AÑO, 'Doce meses.')
  assert.equal(clues?.across.ASA, 'Se agarra por ella.')
  assert.equal(clues?.down.OEA, 'Bloque americano.')
})

test('accepts bare-newline boards', () => {
  const challenge = spanishChallengeFromPayload(
    payload({ board: BOARD.replaceAll('\r\n', '\n') }),
  )
  assert.deepEqual(challenge?.puzzle.solution, ['AÑO', 'M#E', 'ASA'])
})

test('rejects a ragged board', () => {
  assert.equal(
    spanishChallengeFromPayload(payload({ board: 'AÑO\r\nM#\r\nASA' })),
    null,
  )
})

test('rejects letters outside A-Z, Ñ and blocks', () => {
  assert.equal(
    spanishChallengeFromPayload(payload({ board: 'AÑO\r\nM#E\r\nA4A' })),
    null,
  )
})

test('rejects a board smaller than three rows', () => {
  const entries = {
    across: { '1': { clue: 'Doce meses.', answer: 'AÑO' } },
    down: {},
  }
  assert.equal(
    spanishChallengeFromPayload(payload({ board: 'AÑO', entries })),
    null,
  )
})

test('rejects a board word with no clue', () => {
  const entries = {
    ...ENTRIES,
    across: { '1': ENTRIES.across['1'] },
  }
  assert.equal(spanishChallengeFromPayload(payload({ entries })), null)
})

test('rejects an empty clue', () => {
  const entries = {
    ...ENTRIES,
    across: {
      '1': ENTRIES.across['1'],
      '4': { ...ENTRIES.across['4'], clue: '   ' },
    },
  }
  assert.equal(spanishChallengeFromPayload(payload({ entries })), null)
})

test('rejects a malformed publication date', () => {
  assert.equal(
    spanishChallengeFromPayload(payload({ publicationDate: '29/07/2026' })),
    null,
  )
})

test('rejects envelopes without a config', () => {
  assert.equal(spanishChallengeFromPayload(null), null)
  assert.equal(spanishChallengeFromPayload({}), null)
  assert.equal(spanishChallengeFromPayload({ data: { attributes: {} } }), null)
})

const challengeFile = (publicationDate: string): CrosswordChallengeFile => ({
  publicationDate,
  puzzles: { en: { solution: ['AB', 'CD'] } },
})

test('attaches the Spanish puzzle to the matching edition only', () => {
  const challenges = [challengeFile('2026-07-29'), challengeFile('2026-07-30')]
  const spanish = spanishChallengeFromPayload(payload())
  assert.ok(spanish)

  const merged = withSpanishPuzzle(challenges, spanish)
  assert.deepEqual(merged[0].puzzles.es, spanish.puzzle)
  assert.equal(merged[1].puzzles.es, undefined)
  assert.equal(challenges[0].puzzles.es, undefined)
})

test('returns the editions untouched when no date matches', () => {
  const challenges = [challengeFile('2026-07-30')]
  const spanish = spanishChallengeFromPayload(payload())
  assert.ok(spanish)
  assert.deepEqual(withSpanishPuzzle(challenges, spanish), challenges)
})
