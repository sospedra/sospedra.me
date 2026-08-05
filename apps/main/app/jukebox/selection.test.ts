import assert from 'node:assert/strict'
import test from 'node:test'
import { RECORDS } from './records.ts'
import { keyToEvent, recordAt, reduce } from './selection.ts'

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

test('pick plays a pressed record and rejects a test pressing', () => {
  const pressed = RECORDS.find((record) => record.status === 'pressed')
  const dud = RECORDS.find((record) => record.status === 'test-pressing')
  assert.ok(pressed)
  assert.ok(dud)
  assert.deepEqual(
    reduce({ phase: 'idle' }, { type: 'PICK', record: pressed }),
    { phase: 'playing', record: pressed },
  )
  assert.deepEqual(reduce({ phase: 'idle' }, { type: 'PICK', record: dud }), {
    phase: 'idle',
  })
})

test('playing is terminal for letter, cancel and pick', () => {
  const pressed = RECORDS.find((record) => record.status === 'pressed')
  assert.ok(pressed)
  const playing = { phase: 'playing', record: pressed } as const
  assert.equal(reduce(playing, { type: 'LETTER', letter: 'A' }), playing)
  assert.equal(reduce(playing, { type: 'CANCEL' }), playing)
  assert.equal(reduce(playing, { type: 'PICK', record: pressed }), playing)
})

test('reset returns idle from armed and from playing', () => {
  assert.deepEqual(reduce({ phase: 'armed', letter: 'A' }, { type: 'RESET' }), {
    phase: 'idle',
  })
  const pressed = RECORDS.find((record) => record.status === 'pressed')
  assert.ok(pressed)
  assert.deepEqual(
    reduce({ phase: 'playing', record: pressed }, { type: 'RESET' }),
    { phase: 'idle' },
  )
})

test('keyToEvent maps keys to selection events', () => {
  assert.deepEqual(keyToEvent('a'), { type: 'LETTER', letter: 'A' })
  assert.deepEqual(keyToEvent('B'), { type: 'LETTER', letter: 'B' })
  assert.deepEqual(keyToEvent('4'), { type: 'NUMBER', digit: 4 })
  assert.deepEqual(keyToEvent('Escape'), { type: 'CANCEL' })
  assert.equal(keyToEvent('7'), null)
  assert.equal(keyToEvent('0'), null)
  assert.equal(keyToEvent('F5'), null)
  assert.equal(keyToEvent('Shift'), null)
})
