import {
  bytesToHex,
  concatBytes,
  hexToBytes,
  utf8ToBytes,
} from '@noble/hashes/utils.js'

export const toHex = (bytes: Uint8Array): string => bytesToHex(bytes)

export const fromHex = (hex: string): Uint8Array => hexToBytes(hex)

export const utf8 = (text: string): Uint8Array => utf8ToBytes(text)

export const concat = (...arrays: Uint8Array[]): Uint8Array =>
  concatBytes(...arrays)

export const u32be = (value: number): Uint8Array => {
  const bytes = new Uint8Array(4)
  new DataView(bytes.buffer).setUint32(0, value)
  return bytes
}

export const readU32be = (bytes: Uint8Array, offset: number): number =>
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(
    offset,
  )

export const u64be = (value: number): Uint8Array => {
  const bytes = new Uint8Array(8)
  new DataView(bytes.buffer).setBigUint64(0, BigInt(value))
  return bytes
}

export const randomBytes = (length: number): Uint8Array<ArrayBuffer> => {
  const bytes = new Uint8Array(length)
  globalThis.crypto.getRandomValues(bytes)
  return bytes
}

export const bytesEqual = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) return false
  return a.every((byte, index) => byte === b[index])
}

export const isHexOfBytes = (
  value: unknown,
  bytes: number,
): value is string => {
  if (typeof value !== 'string' || value.length !== bytes * 2) return false
  try {
    hexToBytes(value)
    return true
  } catch {
    return false
  }
}
