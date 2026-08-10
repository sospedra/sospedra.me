import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bytesEqual, randomBytes, utf8 } from './bytes.ts'
import { PAD_BUCKETS } from './constants.ts'
import { deriveGroupKey, open, seal } from './seal.ts'

const key = deriveGroupKey('topic-secret')

const sealedSize = (plainLength: number) => {
  const nonce = randomBytes(24)
  return seal(key, nonce, new Uint8Array(plainLength)).length
}

test('group key is deterministic per secret', () => {
  assert.equal(deriveGroupKey('a').length, 32)
  assert.equal(bytesEqual(deriveGroupKey('a'), deriveGroupKey('a')), true)
  assert.equal(bytesEqual(deriveGroupKey('a'), deriveGroupKey('b')), false)
})

test('seal and open roundtrip', () => {
  const nonce = randomBytes(24)
  const sealed = seal(key, nonce, utf8('hello mesh'))
  const opened = open(key, nonce, sealed)
  assert.ok(opened)
  assert.equal(bytesEqual(opened, utf8('hello mesh')), true)
})

test('sealed payloads land exactly on pad buckets', () => {
  assert.equal(sealedSize(10), 256)
  assert.equal(sealedSize(236), 256)
  assert.equal(sealedSize(237), 1024)
  assert.equal(sealedSize(300), 1024)
  assert.equal(sealedSize(4000), 4096)
  assert.equal(sealedSize(16_000), 16_384)
})

test('same-bucket messages are size-indistinguishable', () => {
  const nonce = randomBytes(24)
  const short = seal(key, nonce, utf8('hi'))
  const longer = seal(key, nonce, utf8('a much longer message body'))
  assert.equal(short.length, longer.length)
  assert.ok(PAD_BUCKETS.includes(short.length as 256))
})

test('open fails with the wrong key', () => {
  const nonce = randomBytes(24)
  const sealed = seal(key, nonce, utf8('secret'))
  assert.equal(open(deriveGroupKey('other'), nonce, sealed), null)
})

test('open fails on a flipped ciphertext byte', () => {
  const nonce = randomBytes(24)
  const sealed = seal(key, nonce, utf8('secret'))
  sealed[8] ^= 0x01
  assert.equal(open(key, nonce, sealed), null)
})

test('seal refuses plaintext beyond the largest bucket', () => {
  const nonce = randomBytes(24)
  assert.throws(() => seal(key, nonce, new Uint8Array(16_365)))
})
