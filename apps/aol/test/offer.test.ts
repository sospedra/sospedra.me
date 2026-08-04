import assert from 'node:assert/strict'
import { test } from 'node:test'
import { randomBytes, toHex } from '../src/mesh/bytes.ts'
import { identityFromSeed } from '../src/mesh/keys.ts'
import {
  buildOfferEnvelope,
  parseOfferEnvelope,
  verifyOfferEnvelope,
} from '../src/mesh/offer.ts'

const NOW_SEC = 1_800_000_000

const makeIdentity = () => identityFromSeed(randomBytes(32), 'PRF')

const makeEnvelope = (identity = makeIdentity()) =>
  buildOfferEnvelope({
    identity,
    role: 'offer',
    sdp: 'v=0 fake-sdp',
    ephPub: toHex(randomBytes(32)),
    createdAt: NOW_SEC,
  })

const context = (overrides: object = {}) => ({
  nowSec: NOW_SEC + 5,
  selfPeerId: 'ff'.repeat(32),
  isEjected: () => false,
  roomFull: false,
  ...overrides,
})

test('a fresh signed envelope verifies', () => {
  const result = verifyOfferEnvelope(makeEnvelope(), context())
  assert.deepEqual(result, { ok: true })
})

test('a tampered sdp fails the signature', () => {
  const envelope = { ...makeEnvelope(), sdp: 'v=0 evil-sdp' }
  const result = verifyOfferEnvelope(envelope, context())
  assert.deepEqual(result, { ok: false, reason: 'bad-sig' })
})

test('a signature from another identity fails', () => {
  const honest = makeEnvelope()
  const forged = { ...makeEnvelope(), sig: honest.sig }
  const result = verifyOfferEnvelope(forged, context())
  assert.deepEqual(result, { ok: false, reason: 'bad-sig' })
})

test('an envelope older than the refresh window is stale', () => {
  const identity = makeIdentity()
  const envelope = buildOfferEnvelope({
    identity,
    role: 'offer',
    sdp: 'v=0 fake-sdp',
    ephPub: toHex(randomBytes(32)),
    createdAt: NOW_SEC - 121,
  })
  const result = verifyOfferEnvelope(envelope, context())
  assert.deepEqual(result, { ok: false, reason: 'stale' })
})

test('an envelope from the future beyond skew is rejected', () => {
  const identity = makeIdentity()
  const envelope = buildOfferEnvelope({
    identity,
    role: 'offer',
    sdp: 'v=0 fake-sdp',
    ephPub: toHex(randomBytes(32)),
    createdAt: NOW_SEC + 130,
  })
  const result = verifyOfferEnvelope(envelope, context())
  assert.deepEqual(result, { ok: false, reason: 'future' })
})

test('an envelope from my own peer id is rejected', () => {
  const identity = makeIdentity()
  const envelope = makeEnvelope(identity)
  const result = verifyOfferEnvelope(
    envelope,
    context({ selfPeerId: identity.peerIdHex }),
  )
  assert.deepEqual(result, { ok: false, reason: 'self' })
})

test('an envelope from an ejected peer is rejected', () => {
  const envelope = makeEnvelope()
  const result = verifyOfferEnvelope(
    envelope,
    context({ isEjected: (hex: string) => hex === envelope.peerId }),
  )
  assert.deepEqual(result, { ok: false, reason: 'ejected' })
})

test('a full room rejects the envelope', () => {
  const result = verifyOfferEnvelope(
    makeEnvelope(),
    context({ roomFull: true }),
  )
  assert.deepEqual(result, { ok: false, reason: 'room-full' })
})

test('parse accepts its own wire form', () => {
  const envelope = makeEnvelope()
  const parsed = parseOfferEnvelope(JSON.parse(JSON.stringify(envelope)))
  assert.deepEqual(parsed, envelope)
})

test('parse rejects malformed input', () => {
  assert.equal(parseOfferEnvelope(null), null)
  assert.equal(parseOfferEnvelope('nope'), null)
  assert.equal(parseOfferEnvelope({ role: 'offer' }), null)
  const missingSig = { ...makeEnvelope(), sig: undefined }
  assert.equal(parseOfferEnvelope(missingSig), null)
  const shortEph = { ...makeEnvelope(), ephPub: 'abcd' }
  assert.equal(parseOfferEnvelope(shortEph), null)
})
