import assert from 'node:assert/strict'
import test from 'node:test'
import { RECORDS } from './records.ts'
import { recordAt, reduce } from './selection.ts'

test('recordAt maps letter and digit to the records grid', () => {
  assert.equal(recordAt('A', 1), RECORDS[0])
  assert.equal(recordAt('A', 6), RECORDS[5])
  assert.equal(recordAt('B', 5), RECORDS[10])
})

test('recordAt rejects out-of-range slots', () => {
  assert.equal(recordAt('B', 6), null)
  assert.equal(recordAt('C', 1), null)
  assert.equal(recordAt('A', 9), null)
})

test('a letter arms the machine', () => {
  assert.deepEqual(reduce({ phase: 'idle' }, { type: 'LETTER', letter: 'B' }), {
    phase: 'armed',
    letter: 'B',
  })
})

test('a digit without an armed letter changes nothing', () => {
  assert.deepEqual(reduce({ phase: 'idle' }, { type: 'NUMBER', digit: 4 }), {
    phase: 'idle',
  })
})

test('letter then digit picks a pressed record or resets', () => {
  const armed = { phase: 'armed', letter: 'A' } as const
  const picked = reduce(armed, { type: 'NUMBER', digit: 4 })
  const target = recordAt('A', 4)
  assert.ok(target)
  if (target.status === 'pressed') {
    assert.deepEqual(picked, { phase: 'playing', record: target })
  } else {
    assert.deepEqual(picked, { phase: 'idle' })
  }
})

test('cancel returns to idle from any phase', () => {
  assert.deepEqual(
    reduce({ phase: 'armed', letter: 'A' }, { type: 'CANCEL' }),
    { phase: 'idle' },
  )
})
