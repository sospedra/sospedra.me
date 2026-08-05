import { Reader, Writer } from './encode.ts'
import { hash } from './hash.ts'
import type { Keypair } from './keys.ts'
import { sign } from './keys.ts'
import { LIMITS } from './limits.ts'

export type AuthorEventV1 = {
  authorKeyId: Uint8Array
  authorSequence: bigint
  authorPreviousHash: Uint8Array
  operation: number
  payload: Uint8Array
}

export function encodeAuthorEvent(event: AuthorEventV1): Uint8Array {
  const w = new Writer()
  w.fixed(event.authorKeyId, 32)
  w.u64(event.authorSequence)
  w.fixed(event.authorPreviousHash, 32)
  w.u32(event.operation)
  w.bytes(event.payload, LIMITS.payload)
  return w.done()
}

export function decodeAuthorEvent(buf: Uint8Array): AuthorEventV1 {
  const r = new Reader(buf)
  const authorKeyId = r.fixed(32)
  const authorSequence = r.u64()
  const authorPreviousHash = r.fixed(32)
  const operation = r.u32()
  const payload = r.bytes(LIMITS.payload)
  r.finish()
  return {
    authorKeyId,
    authorSequence,
    authorPreviousHash,
    operation,
    payload,
  }
}

export function signingInput(eventBytes: Uint8Array): Uint8Array {
  return hash('author-signing', eventBytes)
}

export function eventHash(eventBytes: Uint8Array, sig: Uint8Array): Uint8Array {
  return hash('author-event', eventBytes, sig)
}

export type GlobalEventRecordV1 = {
  globalSequence: bigint
  eventHash: Uint8Array
  authorEvent: Uint8Array
  authorSignature: Uint8Array
}

export function encodeGlobalEventRecord(
  record: GlobalEventRecordV1,
): Uint8Array {
  const w = new Writer()
  w.u64(record.globalSequence)
  w.fixed(record.eventHash, 32)
  w.bytes(record.authorEvent, LIMITS.payload + 128)
  w.bytes(record.authorSignature, 64)
  return w.done()
}

export function decodeGlobalEventRecord(buf: Uint8Array): GlobalEventRecordV1 {
  const r = new Reader(buf)
  const globalSequence = r.u64()
  const eventHash = r.fixed(32)
  const authorEvent = r.bytes(LIMITS.payload + 128)
  const authorSignature = r.bytes(64)
  r.finish()
  return {
    globalSequence,
    eventHash,
    authorEvent,
    authorSignature,
  }
}

export type WriteAckV1 = {
  eventHash: Uint8Array
  acceptedAtMs: bigint
  acceptedAgainstSequence: bigint
  mustLandBySequence: bigint
  receiptKeyId: Uint8Array
}

export function encodeWriteAck(ack: WriteAckV1): Uint8Array {
  const w = new Writer()
  w.fixed(ack.eventHash, 32)
  w.u64(ack.acceptedAtMs)
  w.u64(ack.acceptedAgainstSequence)
  w.u64(ack.mustLandBySequence)
  w.fixed(ack.receiptKeyId, 32)
  return w.done()
}

export function decodeWriteAck(buf: Uint8Array): WriteAckV1 {
  const r = new Reader(buf)
  const eventHash = r.fixed(32)
  const acceptedAtMs = r.u64()
  const acceptedAgainstSequence = r.u64()
  const mustLandBySequence = r.u64()
  const receiptKeyId = r.fixed(32)
  r.finish()
  return {
    eventHash,
    acceptedAtMs,
    acceptedAgainstSequence,
    mustLandBySequence,
    receiptKeyId,
  }
}

export function ackSigningInput(ackBytes: Uint8Array): Uint8Array {
  return hash('write-ack', ackBytes)
}

export function makeSignedEvent(
  kp: Keypair,
  authorSequence: bigint,
  previousTip: Uint8Array,
  operation: number,
  payload: Uint8Array,
): {
  event: AuthorEventV1
  eventBytes: Uint8Array
  signature: Uint8Array
  eventHash: Uint8Array
} {
  const event: AuthorEventV1 = {
    authorKeyId: kp.publicKey,
    authorSequence,
    authorPreviousHash: previousTip,
    operation,
    payload,
  }
  const eventBytes = encodeAuthorEvent(event)
  const signingDigest = signingInput(eventBytes)
  const signature = sign(signingDigest, kp)
  const hash_out = eventHash(eventBytes, signature)
  return {
    event,
    eventBytes,
    signature,
    eventHash: hash_out,
  }
}
