import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hex, u64be } from '../src/protocol/bytes.ts'
import { DecodeError, Reader, Writer } from '../src/protocol/encode.ts'

test('u64be encodes big-endian', () => {
  assert.equal(hex(u64be(0x0102030405060708n)), '0102030405060708')
})

test('writer roundtrips through reader', () => {
  const w = new Writer()
  w.u16(7)
  w.u64(9007199254740993n) // above Number.MAX_SAFE_INTEGER
  w.bytes(new Uint8Array([1, 2, 3]), 16)
  const buf = w.done()
  const r = new Reader(buf)
  assert.equal(r.u16(), 7)
  assert.equal(r.u64(), 9007199254740993n)
  assert.deepEqual(r.bytes(16), new Uint8Array([1, 2, 3]))
  r.finish()
})

test('reader rejects trailing bytes', () => {
  const r = new Reader(new Uint8Array([0, 1, 0xff]))
  r.u16()
  assert.throws(() => r.finish(), DecodeError)
})

test('reader rejects over-limit length', () => {
  const w = new Writer()
  w.bytes(new Uint8Array(8), 8)
  const r = new Reader(w.done())
  assert.throws(() => r.bytes(4), DecodeError)
})

test('reader rejects truncated input', () => {
  assert.throws(() => new Reader(new Uint8Array([0])).u16(), DecodeError)
})

test('bool rejects 0x02', () => {
  assert.throws(() => new Reader(new Uint8Array([2])).bool(), DecodeError)
})

test('list rejects count over max', () => {
  const w = new Writer()
  w.list([1, 2, 3], 8, (x) => w.u16(x))
  const r = new Reader(w.done())
  assert.throws(() => r.list(2, () => r.u16()), DecodeError)
})
