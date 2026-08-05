import {
  bytesToHex,
  concatBytes,
  hexToBytes,
  utf8ToBytes,
} from '@noble/hashes/utils.js'

export const concat = (...parts: Uint8Array[]): Uint8Array =>
  concatBytes(...parts)

export const u16be = (n: number): Uint8Array => {
  if (!Number.isInteger(n) || n < 0 || n > 0xffff) {
    throw new RangeError(`u16be: ${n} is not a valid uint16`)
  }
  const out = new Uint8Array(2)
  new DataView(out.buffer).setUint16(0, n)
  return out
}

export const u32be = (n: number): Uint8Array => {
  if (!Number.isInteger(n) || n < 0 || n > 0xffffffff) {
    throw new RangeError(`u32be: ${n} is not a valid uint32`)
  }
  const out = new Uint8Array(4)
  new DataView(out.buffer).setUint32(0, n)
  return out
}

export const u64be = (n: bigint): Uint8Array => {
  if (n < 0n || n >= 2n ** 64n) {
    throw new RangeError(`u64be: ${n} is not a valid uint64`)
  }
  const out = new Uint8Array(8)
  new DataView(out.buffer).setBigUint64(0, n)
  return out
}

export const hex = (b: Uint8Array): string => bytesToHex(b)

export const unhex = (s: string): Uint8Array => hexToBytes(s)

export const bytesEqual = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) return false
  return a.every((byte, index) => byte === b[index])
}

export const ascii = (s: string): Uint8Array => utf8ToBytes(s)
