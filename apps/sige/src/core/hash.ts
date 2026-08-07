import { hkdf } from '@noble/hashes/hkdf.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { concatBytes, u32be, utf8 } from './bytes.ts'

// Domain-separated, length-framed hash (SIGE spec section 6.1, demo profile).
export function dhash(domain: string, ...parts: Uint8Array[]): Uint8Array {
  const framed = [utf8('SIGE-DEMO/v1'), u32be(domain.length), utf8(domain)]
  for (const p of parts) framed.push(u32be(p.length), p)
  return sha256(concatBytes(...framed))
}

export function kdf(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
): Uint8Array {
  return hkdf(sha256, ikm, salt, info, 32)
}

export { sha256 }
