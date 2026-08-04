import { concat, randomBytes, readU32be, u32be } from './bytes.ts'
import { PAYLOAD_MAX } from './constants.ts'
import { type Identity, verifySig } from './keys.ts'

export const WILDCARD: Uint8Array = new Uint8Array(32)

export type Frame = {
  src: Uint8Array
  dst: Uint8Array
  hop: number
  seq: number
  nonce: Uint8Array
  payload: Uint8Array
  sig: Uint8Array
}

const VERSION = 0x01
const HEADER_LENGTH = 1 + 32 + 32 + 1 + 4 + 24 + 4
const SIG_LENGTH = 64

const frameSignBytes = (frame: Omit<Frame, 'hop' | 'sig'>): Uint8Array =>
  concat(frame.src, frame.dst, u32be(frame.seq), frame.nonce, frame.payload)

export const buildFrame = (input: {
  identity: Identity
  dst: Uint8Array
  seq: number
  payload: Uint8Array
  hop?: number
  nonce?: Uint8Array
}): Frame => {
  if (input.payload.length > PAYLOAD_MAX) {
    throw new Error(`payload over ${PAYLOAD_MAX} bytes`)
  }
  const unsigned = {
    src: input.identity.peerId,
    dst: input.dst,
    seq: input.seq,
    nonce: input.nonce ?? randomBytes(24),
    payload: input.payload,
  }
  return {
    ...unsigned,
    hop: input.hop ?? 0,
    sig: input.identity.sign(frameSignBytes(unsigned)),
  }
}

export const verifyFrame = (frame: Frame): boolean =>
  verifySig(frameSignBytes(frame), frame.sig, frame.src)

export const encodeFrame = (frame: Frame): Uint8Array =>
  concat(
    Uint8Array.of(VERSION),
    frame.src,
    frame.dst,
    Uint8Array.of(frame.hop),
    u32be(frame.seq),
    frame.nonce,
    u32be(frame.payload.length),
    frame.payload,
    frame.sig,
  )

export const decodeFrame = (bytes: Uint8Array): Frame | null => {
  if (bytes.length < HEADER_LENGTH + SIG_LENGTH) return null
  if (bytes[0] !== VERSION) return null
  const payloadLength = readU32be(bytes, HEADER_LENGTH - 4)
  if (payloadLength > PAYLOAD_MAX) return null
  if (bytes.length !== HEADER_LENGTH + payloadLength + SIG_LENGTH) return null
  return {
    src: bytes.slice(1, 33),
    dst: bytes.slice(33, 65),
    hop: bytes[65] as number,
    seq: readU32be(bytes, 66),
    nonce: bytes.slice(70, 94),
    payload: bytes.slice(HEADER_LENGTH, HEADER_LENGTH + payloadLength),
    sig: bytes.slice(HEADER_LENGTH + payloadLength),
  }
}
