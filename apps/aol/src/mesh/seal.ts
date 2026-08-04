import { xchacha20poly1305 } from '@noble/ciphers/chacha.js'
import { hkdf } from '@noble/hashes/hkdf.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { readU32be, u32be, utf8 } from './bytes.ts'
import { APP_ID, PAD_BUCKETS } from './constants.ts'

const TAG_LENGTH = 16
const LENGTH_PREFIX = 4

// Placeholder group key until MLS (spec 13.1) replaces the delivery of it.
export const deriveGroupKey = (topicSecret: string): Uint8Array =>
  hkdf(sha256, utf8(topicSecret), utf8(APP_ID), utf8('group-key/v0'), 32)

const bucketFor = (innerLength: number): number => {
  const bucket = PAD_BUCKETS.find((size) => innerLength + TAG_LENGTH <= size)
  if (bucket === undefined) throw new Error('plaintext over the largest bucket')
  return bucket
}

export const seal = (
  key: Uint8Array,
  nonce: Uint8Array,
  plaintext: Uint8Array,
): Uint8Array => {
  const innerLength = LENGTH_PREFIX + plaintext.length
  const padded = new Uint8Array(bucketFor(innerLength) - TAG_LENGTH)
  padded.set(u32be(plaintext.length), 0)
  padded.set(plaintext, LENGTH_PREFIX)
  return xchacha20poly1305(key, nonce).encrypt(padded)
}

export const open = (
  key: Uint8Array,
  nonce: Uint8Array,
  sealed: Uint8Array,
): Uint8Array | null => {
  const padded = decrypt(key, nonce, sealed)
  if (padded === null || padded.length < LENGTH_PREFIX) return null
  const length = readU32be(padded, 0)
  if (length > padded.length - LENGTH_PREFIX) return null
  return padded.slice(LENGTH_PREFIX, LENGTH_PREFIX + length)
}

const decrypt = (
  key: Uint8Array,
  nonce: Uint8Array,
  sealed: Uint8Array,
): Uint8Array | null => {
  try {
    return xchacha20poly1305(key, nonce).decrypt(sealed)
  } catch {
    return null
  }
}

export const sealedPlaintextMax = (): number =>
  PAD_BUCKETS[PAD_BUCKETS.length - 1] - TAG_LENGTH - LENGTH_PREFIX
