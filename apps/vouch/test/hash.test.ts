import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import { ascii, concat, hex, u16be, u32be } from '../src/protocol/bytes.ts'
import { hash } from '../src/protocol/hash.ts'

test('hash matches independent preimage construction', () => {
  const part = ascii('hello')
  const preimage = concat(
    ascii('VOUCH'),
    u16be(1),
    u16be(9),
    ascii('state-key'),
    u32be(5),
    part,
  )
  const expected = createHash('sha256').update(preimage).digest('hex')
  assert.equal(hex(hash('state-key', part)), expected)
})

test('domains separate', () => {
  const p = ascii('x')
  assert.notEqual(hex(hash('state-key', p)), hex(hash('state-value', p)))
})

test('part boundaries separate', () => {
  const a = hash('state-key', ascii('ab'), ascii('c'))
  const b = hash('state-key', ascii('a'), ascii('bc'))
  assert.notEqual(hex(a), hex(b))
})
