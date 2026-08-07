import assert from 'node:assert/strict'
import { test } from 'node:test'
import { open, seal } from '../src/core/aead.ts'
import {
  bigIntToBytes,
  bytesEqual,
  bytesToBigInt,
  randomBytes,
  toHex,
  u32be,
  utf8,
} from '../src/core/bytes.ts'
import { dhash, kdf } from '../src/core/hash.ts'
import { setupParams } from '../src/core/lhtlp.ts'
import { lhtlpPrimeBitsFor, tunedWith } from '../src/world/params.ts'
import { ES, GENERIC, PROFILES } from '../src/world/profile.ts'

test('bytes round-trips', () => {
  const x = 123456789012345678901234567890n
  assert.equal(bytesToBigInt(bigIntToBytes(x)), x)
  assert.deepEqual(Array.from(u32be(258)), [0, 0, 1, 2])
  assert.equal(toHex(utf8('a')), '61')
  const r = randomBytes(32)
  assert.ok(bytesEqual(r, r))
  assert.ok(!bytesEqual(r, randomBytes(32)))
})

test('bigIntToBytes rejects negative input and never collides across a byte-width boundary sweep', () => {
  assert.throws(() => bigIntToBytes(-1n), RangeError)
  assert.throws(() => bigIntToBytes(-255n), RangeError)
  const boundaries = [0n, 255n, 256n, 65535n, 65536n, 2n ** 32n]
  const values = [
    ...new Set(boundaries.flatMap((b) => [b - 1n, b, b + 1n])),
  ].filter((x) => x >= 0n)
  const encodings = new Set(values.map((x) => toHex(bigIntToBytes(x))))
  assert.equal(encodings.size, values.length)
})

test('dhash separates domains and frames lengths', () => {
  const a = dhash('one', utf8('xy'))
  const b = dhash('two', utf8('xy'))
  const c = dhash('one', utf8('x'), utf8('y'))
  assert.notDeepEqual(a, b)
  assert.notDeepEqual(a, c)
  assert.equal(kdf(a, b, c).length, 32)
})

test('aead round-trips and fails closed', () => {
  const key = randomBytes(32)
  const ad = utf8('context')
  const sealed = seal(key, utf8('payload'), ad)
  assert.deepEqual(
    open(key, sealed.nonce, sealed.ciphertext, ad),
    utf8('payload'),
  )
  const tampered = sealed.ciphertext.slice()
  tampered[0] ^= 1
  assert.equal(open(key, sealed.nonce, tampered, ad), null)
  assert.equal(open(key, sealed.nonce, sealed.ciphertext, utf8('other')), null)
  assert.equal(open(randomBytes(32), sealed.nonce, sealed.ciphertext, ad), null)
})

test('tuned scales down only in fast mode, with a floor', () => {
  assert.equal(tunedWith(false, 60000), 60000)
  assert.equal(tunedWith(true, 60000), 600)
  assert.equal(tunedWith(true, 100), 8)
})

test('real mode sizes LHTLP primes to a ~2048-bit modulus', () => {
  const { params } = setupParams(lhtlpPrimeBitsFor(false), 2)
  const bits = params.n.toString(2).length
  assert.ok(bits > 2000, `expected a ~2048-bit modulus, got ${bits} bits`)
})

test('profiles are internally consistent', () => {
  for (const p of [GENERIC, ES]) {
    assert.ok(p.acceptedRoles.every((r) => p.roles.includes(r)))
    assert.ok(
      p.acceptedRoles.length < p.roles.length,
      'at least one role must be refused',
    )
    assert.ok(p.recordHorizonBlocks > 0)
    assert.equal(PROFILES[p.id], p)
  }
  assert.deepEqual(GENERIC.acceptedRoles, ['court', 'oversight'])
  assert.deepEqual(ES.acceptedRoles, ['judge', 'prosecutor'])
})
