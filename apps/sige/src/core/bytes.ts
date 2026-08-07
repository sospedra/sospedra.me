export function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let off = 0
  for (const p of parts) {
    out.set(p, off)
    off += p.length
  }
  return out
}

export function toHex(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
}

export function shortHex(b: Uint8Array): string {
  return toHex(b).slice(0, 16)
}

export function randomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n)
  globalThis.crypto.getRandomValues(b)
  return b
}

export function u32be(n: number): Uint8Array {
  if (!Number.isInteger(n) || n < 0 || n > 0xffffffff) {
    throw new RangeError(
      `u32be: ${n} does not fit in an unsigned 32-bit integer`,
    )
  }
  const b = new Uint8Array(4)
  new DataView(b.buffer).setUint32(0, n)
  return b
}

export function u64be(n: number): Uint8Array {
  if (!Number.isInteger(n) || n < 0 || n > Number.MAX_SAFE_INTEGER) {
    throw new RangeError(
      `u64be: ${n} does not fit in an unsigned 64-bit integer`,
    )
  }
  const b = new Uint8Array(8)
  new DataView(b.buffer).setBigUint64(0, BigInt(n))
  return b
}

export function bytesToBigInt(b: Uint8Array): bigint {
  let x = 0n
  for (const byte of b) x = (x << 8n) | BigInt(byte)
  return x
}

export function bigIntToBytes(x: bigint): Uint8Array {
  if (x < 0n) {
    throw new RangeError(
      `bigIntToBytes: ${x} does not fit in an unsigned encoding`,
    )
  }
  if (x === 0n) return new Uint8Array([0])
  const h = x.toString(16)
  const padded = h.length % 2 ? `0${h}` : h
  const out = new Uint8Array(padded.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(padded.slice(2 * i, 2 * i + 2), 16)
  }
  return out
}

export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    const aVal = a[i]
    const bVal = b[i]
    // A missing byte sets bit 8: no XOR of two real bytes (0-255) can reach it.
    diff |= aVal !== undefined && bVal !== undefined ? aVal ^ bVal : 0x100
  }
  return diff === 0
}

// Injective over EVERY number, and never throws. safeU32be folded anything at
// or above 2^32 to four zero bytes, so epoch 0 and epoch 2^32 hashed alike.
// The tag byte keeps the in-range and out-of-range spaces disjoint.
export function injectiveNumber(n: number): Uint8Array {
  if (Number.isInteger(n) && n >= 0 && n <= Number.MAX_SAFE_INTEGER) {
    return concatBytes(Uint8Array.of(0), u64be(n))
  }
  return concatBytes(Uint8Array.of(1), utf8(String(n)))
}

export function safeBigIntToBytes(x: bigint): Uint8Array {
  return x < 0n ? new Uint8Array(0) : bigIntToBytes(x)
}
