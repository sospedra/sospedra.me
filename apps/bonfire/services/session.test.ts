import assert from 'node:assert/strict'
import { test } from 'node:test'
import { deriveGroupKey } from './mesh/seal.ts'
import {
  createSessionLink,
  decodePayload,
  encodePayload,
  INITIAL_SNAPSHOT,
  parseSessionHash,
  type SessionPayload,
  sessionHash,
  snapshotTarget,
} from './session.ts'

const key = deriveGroupKey('secret')

test('session link roundtrips through the hash', () => {
  const link = createSessionLink()
  assert.equal(link.sessionId.length, 16)
  assert.equal(link.secret.length, 32)
  assert.deepEqual(parseSessionHash(sessionHash(link)), link)
})

test('parseSessionHash rejects foreign hashes', () => {
  assert.equal(parseSessionHash(''), null)
  assert.equal(parseSessionHash('#other'), null)
  assert.equal(parseSessionHash('#s=only-id'), null)
  assert.equal(parseSessionHash('#s=.only-secret'), null)
})

test('payload codec roundtrips every type', () => {
  const payloads: SessionPayload[] = [
    { type: 'state', ...INITIAL_SNAPSHOT, plan: 'long', seq: 7 },
    { type: 'presence', nick: 'keeper' },
    { type: 'bye' },
  ]
  for (const payload of payloads) {
    assert.deepEqual(decodePayload(key, encodePayload(key, payload)), payload)
  }
})

test('decodePayload rejects the wrong key, tampering and junk', () => {
  const content = encodePayload(key, { type: 'bye' })
  assert.equal(decodePayload(deriveGroupKey('other'), content), null)
  const tampered = `${content.slice(0, -2)}00`
  assert.equal(decodePayload(key, tampered), null)
  assert.equal(decodePayload(key, 'not-hex'), null)
  assert.equal(decodePayload(key, ''), null)
})

test('decodePayload rejects sealed junk shapes', () => {
  const junk = encodePayload(key, {
    type: 'presence',
    nick: '',
  } as SessionPayload)
  assert.equal(decodePayload(key, junk), null)
  const long = encodePayload(key, {
    type: 'presence',
    nick: 'x'.repeat(25),
  } as SessionPayload)
  assert.equal(decodePayload(key, long), null)
})

test('snapshotTarget projects position only while playing', () => {
  const base = { ...INITIAL_SNAPSHOT, positionMs: 10_000, positionEpoch: 1_000 }
  assert.equal(snapshotTarget({ ...base, playing: true }, 4_000), 13_000)
  assert.equal(snapshotTarget({ ...base, playing: false }, 4_000), 10_000)
})
