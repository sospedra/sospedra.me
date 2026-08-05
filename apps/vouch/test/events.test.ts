import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hex } from '../src/protocol/bytes.ts'
import { ZERO32 } from '../src/protocol/constants.ts'
import {
  decodeAuthorEvent,
  eventHash,
  makeSignedEvent,
  signingInput,
} from '../src/protocol/events.ts'
import { keypairFromLabel, verifySig } from '../src/protocol/keys.ts'
import { encodeTransfer, OP } from '../src/protocol/ops.ts'

test('author event roundtrip and identity', () => {
  const kp = keypairFromLabel('author-alice')
  const payload = encodeTransfer({ from: 'alice', to: 'bob', amount: 100n })
  const s = makeSignedEvent(kp, 1n, ZERO32, OP.TRANSFER, payload)
  const decoded = decodeAuthorEvent(s.eventBytes)
  assert.equal(decoded.authorSequence, 1n)
  assert.ok(verifySig(signingInput(s.eventBytes), s.signature, kp.publicKey))
  assert.equal(hex(s.eventHash), hex(eventHash(s.eventBytes, s.signature)))
})

test('tampered payload breaks the signature', () => {
  const kp = keypairFromLabel('author-alice')
  const payload = encodeTransfer({ from: 'alice', to: 'bob', amount: 100n })
  const s = makeSignedEvent(kp, 1n, ZERO32, OP.TRANSFER, payload)
  const tampered = s.eventBytes.slice()
  tampered[tampered.length - 1] ^= 1
  assert.ok(!verifySig(signingInput(tampered), s.signature, kp.publicKey))
})

test('transfer payload rejects uppercase account id', () => {
  assert.throws(() => encodeTransfer({ from: 'Alice', to: 'bob', amount: 1n }))
})
