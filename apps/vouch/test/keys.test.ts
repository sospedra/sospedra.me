import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hex } from '../src/protocol/bytes.ts'
import { hash } from '../src/protocol/hash.ts'
import { keypairFromLabel, sign, verifySig } from '../src/protocol/keys.ts'
import { Prng } from '../src/protocol/rand.ts'

test('keypair is deterministic per label', () => {
  const a = keypairFromLabel('author-alice')
  const b = keypairFromLabel('author-alice')
  assert.equal(hex(a.publicKey), hex(b.publicKey))
  assert.equal(a.publicKey.length, 32)
})

test('sign and verify roundtrip, tamper fails', () => {
  const kp = keypairFromLabel('author-alice')
  const digest = hash('author-signing', new Uint8Array([1]))
  const sig = sign(digest, kp)
  assert.equal(sig.length, 64)
  assert.ok(verifySig(digest, sig, kp.publicKey))
  const bad = sig.slice()
  bad[0] ^= 1
  assert.ok(!verifySig(digest, bad, kp.publicKey))
})

test('prng streams deterministically', () => {
  assert.equal(hex(new Prng('s1').bytes(16)), hex(new Prng('s1').bytes(16)))
  assert.notEqual(hex(new Prng('s1').bytes(16)), hex(new Prng('s2').bytes(16)))
})

test('sign rejects non-32-byte digest', () => {
  const kp = keypairFromLabel('author-alice')
  assert.throws(() => sign(new Uint8Array(10), kp), /digest must be 32 bytes/)
})

test('verifySig rejects non-32-byte digest', () => {
  const kp = keypairFromLabel('author-alice')
  const validDigest = hash('author-signing', new Uint8Array([1]))
  const sig = sign(validDigest, kp)
  assert.throws(
    () => verifySig(new Uint8Array(10), sig, kp.publicKey),
    /digest must be 32 bytes/,
  )
})
