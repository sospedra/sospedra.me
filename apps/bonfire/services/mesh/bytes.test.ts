import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  bytesEqual,
  concat,
  fromHex,
  randomBytes,
  readU32be,
  toHex,
  u32be,
  u64be,
  utf8,
} from './bytes.ts'

test('hex roundtrip', () => {
  const bytes = fromHex('cafe0123')
  assert.deepEqual(Array.from(bytes), [0xca, 0xfe, 0x01, 0x23])
  assert.equal(toHex(bytes), 'cafe0123')
})

test('u32be encodes big-endian', () => {
  assert.deepEqual(Array.from(u32be(0x01020304)), [1, 2, 3, 4])
  assert.deepEqual(Array.from(u32be(0)), [0, 0, 0, 0])
  assert.equal(readU32be(u32be(0xdeadbeef), 0), 0xdeadbeef)
})

test('u64be carries a unix timestamp in the low words', () => {
  const seconds = 1_722_718_800
  const bytes = u64be(seconds)
  assert.equal(bytes.length, 8)
  assert.equal(readU32be(bytes, 4), seconds)
  assert.deepEqual(Array.from(bytes.slice(0, 4)), [0, 0, 0, 0])
})

test('concat joins buffers in order', () => {
  const joined = concat(Uint8Array.of(1, 2), Uint8Array.of(3), Uint8Array.of())
  assert.deepEqual(Array.from(joined), [1, 2, 3])
})

test('utf8 encodes text', () => {
  assert.deepEqual(Array.from(utf8('abc')), [97, 98, 99])
})

test('bytesEqual compares content', () => {
  assert.equal(bytesEqual(Uint8Array.of(1, 2), Uint8Array.of(1, 2)), true)
  assert.equal(bytesEqual(Uint8Array.of(1, 2), Uint8Array.of(1, 3)), false)
  assert.equal(bytesEqual(Uint8Array.of(1), Uint8Array.of(1, 0)), false)
})

test('randomBytes returns distinct buffers of the asked size', () => {
  const a = randomBytes(24)
  const b = randomBytes(24)
  assert.equal(a.length, 24)
  assert.equal(b.length, 24)
  assert.equal(bytesEqual(a, b), false)
})
