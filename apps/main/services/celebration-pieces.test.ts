import assert from 'node:assert/strict'
import test from 'node:test'
import { CELEBRATION_TONES, confettiPieces } from './celebration-pieces.ts'

test('the burst is 26 pieces with unique ids', () => {
  const pieces = confettiPieces()
  assert.equal(pieces.length, 26)
  assert.equal(new Set(pieces.map((piece) => piece.id)).size, 26)
})

test('the scatter is deterministic across calls', () => {
  assert.deepEqual(confettiPieces(), confettiPieces())
})

test('tones cycle through the provided palette', () => {
  const pieces = confettiPieces(['#111', '#222'])
  assert.equal(pieces[0].tone, '#111')
  assert.equal(pieces[1].tone, '#222')
  assert.equal(pieces[2].tone, '#111')
})

test('the default palette is the celebration set', () => {
  const pieces = confettiPieces()
  assert.equal(pieces[0].tone, CELEBRATION_TONES[0])
})

test('timings stay inside the animation budget', () => {
  for (const piece of confettiPieces()) {
    assert.ok(piece.delay >= 0 && piece.delay < 340)
    assert.ok(piece.duration >= 1500 && piece.duration < 2200)
  }
})
