import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bytesEqual, randomBytes, utf8 } from '../src/mesh/bytes.ts'
import { PAYLOAD_MAX } from '../src/mesh/constants.ts'
import {
  buildFrame,
  decodeFrame,
  encodeFrame,
  verifyFrame,
  WILDCARD,
} from '../src/mesh/frame.ts'
import { identityFromSeed } from '../src/mesh/keys.ts'

const alice = identityFromSeed(randomBytes(32))
const bob = identityFromSeed(randomBytes(32))

test('encode and decode roundtrip preserves every field', () => {
  const frame = buildFrame({
    identity: alice,
    dst: bob.peerId,
    seq: 7,
    payload: utf8('payload-bytes'),
    nonce: randomBytes(24),
  })
  const decoded = decodeFrame(encodeFrame(frame))
  assert.ok(decoded)
  assert.equal(bytesEqual(decoded.src, alice.peerId), true)
  assert.equal(bytesEqual(decoded.dst, bob.peerId), true)
  assert.equal(decoded.hop, 0)
  assert.equal(decoded.seq, 7)
  assert.equal(bytesEqual(decoded.nonce, frame.nonce), true)
  assert.equal(bytesEqual(decoded.payload, frame.payload), true)
  assert.equal(verifyFrame(decoded), true)
})

test('wildcard destination survives the roundtrip', () => {
  const frame = buildFrame({
    identity: alice,
    dst: WILDCARD,
    seq: 1,
    payload: utf8('to everyone'),
  })
  const decoded = decodeFrame(encodeFrame(frame))
  assert.ok(decoded)
  assert.equal(bytesEqual(decoded.dst, WILDCARD), true)
})

test('a tampered payload fails verification', () => {
  const frame = buildFrame({
    identity: alice,
    dst: WILDCARD,
    seq: 2,
    payload: utf8('honest'),
  })
  frame.payload[0] ^= 0xff
  assert.equal(verifyFrame(frame), false)
})

test('hop increments keep the signature valid', () => {
  const frame = buildFrame({
    identity: alice,
    dst: WILDCARD,
    seq: 3,
    payload: utf8('forwarded'),
  })
  frame.hop += 3
  assert.equal(verifyFrame(frame), true)
})

test('decode rejects garbage and truncated buffers', () => {
  assert.equal(decodeFrame(randomBytes(40)), null)
  const encoded = encodeFrame(
    buildFrame({ identity: alice, dst: WILDCARD, seq: 4, payload: utf8('x') }),
  )
  assert.equal(decodeFrame(encoded.slice(0, encoded.length - 10)), null)
  assert.equal(decodeFrame(new Uint8Array(0)), null)
})

test('encode refuses oversize payloads', () => {
  assert.throws(() =>
    buildFrame({
      identity: alice,
      dst: WILDCARD,
      seq: 5,
      payload: new Uint8Array(PAYLOAD_MAX + 1),
    }),
  )
})
