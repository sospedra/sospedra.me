import assert from 'node:assert/strict'
import { test } from 'node:test'
import { randomBytes, utf8 } from '../src/mesh/bytes.ts'
import { identityFromSeed, verifySig } from '../src/mesh/keys.ts'

const seed = () => randomBytes(32)

test('identity exposes a 32 byte peer id and its hex form', () => {
  const identity = identityFromSeed(seed())
  assert.equal(identity.peerId.length, 32)
  assert.equal(identity.peerIdHex.length, 64)
})

test('same seed derives the same peer id', () => {
  const shared = seed()
  const a = identityFromSeed(shared)
  const b = identityFromSeed(shared)
  assert.equal(a.peerIdHex, b.peerIdHex)
})

test('sign and verify roundtrip', () => {
  const identity = identityFromSeed(seed())
  const message = utf8('hello mesh')
  const sig = identity.sign(message)
  assert.equal(sig.length, 64)
  assert.equal(verifySig(message, sig, identity.peerId), true)
})

test('verify fails on a tampered message', () => {
  const identity = identityFromSeed(seed())
  const sig = identity.sign(utf8('original'))
  assert.equal(verifySig(utf8('tampered'), sig, identity.peerId), false)
})

test('verify fails against another peer id', () => {
  const signer = identityFromSeed(seed())
  const other = identityFromSeed(seed())
  const message = utf8('hello')
  const sig = signer.sign(message)
  assert.equal(verifySig(message, sig, other.peerId), false)
})
