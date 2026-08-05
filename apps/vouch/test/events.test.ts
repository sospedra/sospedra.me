import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hex } from '../src/protocol/bytes.ts'
import { ZERO32 } from '../src/protocol/constants.ts'
import {
  decodeAuthorEvent,
  decodeGlobalEventRecord,
  decodeWriteAck,
  encodeGlobalEventRecord,
  encodeWriteAck,
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

test('GlobalEventRecordV1 roundtrip with 64-byte signature', () => {
  const sig64 = new Uint8Array(64).fill(0xab)
  const record = {
    globalSequence: 42n,
    eventHash: new Uint8Array(32).fill(0x12),
    authorEvent: new Uint8Array(256).fill(0x34),
    authorSignature: sig64,
  }
  const encoded = encodeGlobalEventRecord(record)
  const decoded = decodeGlobalEventRecord(encoded)
  assert.deepEqual(decoded, record)
})

test('GlobalEventRecordV1 rejects signature length != 64', () => {
  const sig63 = new Uint8Array(63).fill(0xab)
  const record = {
    globalSequence: 42n,
    eventHash: new Uint8Array(32).fill(0x12),
    authorEvent: new Uint8Array(256).fill(0x34),
    authorSignature: sig63,
  }
  assert.throws(() => encodeGlobalEventRecord(record))
})

test('WriteAckV1 roundtrip', () => {
  const ack = {
    eventHash: new Uint8Array(32).fill(0x56),
    acceptedAtMs: 123456789n,
    acceptedAgainstSequence: 99n,
    mustLandBySequence: 199n,
    receiptKeyId: new Uint8Array(32).fill(0x78),
  }
  const encoded = encodeWriteAck(ack)
  const decoded = decodeWriteAck(encoded)
  assert.deepEqual(decoded, ack)
})
