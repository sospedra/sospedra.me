import { schnorr } from '@noble/curves/secp256k1.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { fromHex, isHexOfBytes, toHex, utf8 } from './bytes.ts'

export type NostrEvent = {
  id: string
  pubkey: string
  created_at: number
  kind: number
  tags: string[][]
  content: string
  sig: string
}

const eventId = (event: Omit<NostrEvent, 'id' | 'sig'>): string =>
  toHex(
    sha256(
      utf8(
        JSON.stringify([
          0,
          event.pubkey,
          event.created_at,
          event.kind,
          event.tags,
          event.content,
        ]),
      ),
    ),
  )

export const buildEvent = (input: {
  secret: Uint8Array
  kind: number
  tags: string[][]
  content: string
  createdAtSec: number
}): NostrEvent => {
  const unsigned = {
    pubkey: toHex(schnorr.getPublicKey(input.secret)),
    created_at: input.createdAtSec,
    kind: input.kind,
    tags: input.tags,
    content: input.content,
  }
  const id = eventId(unsigned)
  return {
    ...unsigned,
    id,
    sig: toHex(schnorr.sign(fromHex(id), input.secret)),
  }
}

const isEventShape = (value: unknown): value is NostrEvent => {
  if (typeof value !== 'object' || value === null) return false
  const raw = value as Record<string, unknown>
  return (
    isHexOfBytes(raw.id, 32) &&
    isHexOfBytes(raw.pubkey, 32) &&
    typeof raw.created_at === 'number' &&
    Number.isFinite(raw.created_at) &&
    typeof raw.kind === 'number' &&
    Array.isArray(raw.tags) &&
    raw.tags.every(
      (tag) =>
        Array.isArray(tag) && tag.every((entry) => typeof entry === 'string'),
    ) &&
    typeof raw.content === 'string' &&
    isHexOfBytes(raw.sig, 64)
  )
}

export const verifyEvent = (value: unknown): NostrEvent | null => {
  if (!isEventShape(value)) return null
  if (eventId(value) !== value.id) return null
  return schnorrVerifies(value) ? value : null
}

const schnorrVerifies = (event: NostrEvent): boolean => {
  try {
    return schnorr.verify(
      fromHex(event.sig),
      fromHex(event.id),
      fromHex(event.pubkey),
    )
  } catch {
    return false
  }
}

export const topicOf = (event: NostrEvent): string | null =>
  event.tags.find((tag) => tag[0] === 't')?.[1] ?? null
