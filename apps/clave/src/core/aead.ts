import { xchacha20poly1305 } from '@noble/ciphers/chacha.js'
import { randomBytes } from './bytes.ts'

export type Sealed = {
  nonce: Uint8Array
  ciphertext: Uint8Array
}

export function seal(
  key: Uint8Array,
  plaintext: Uint8Array,
  ad: Uint8Array,
): Sealed {
  return sealWith(key, randomBytes(24), plaintext, ad)
}

// Explicit nonce, so a verifier holding the witness can recompute the exact
// published bytes. The enrollment relation depends on this: without it the
// seal is unreproducible and the binding check can never pass.
export function sealWith(
  key: Uint8Array,
  nonce: Uint8Array,
  plaintext: Uint8Array,
  ad: Uint8Array,
): Sealed {
  if (nonce.length !== 24) {
    throw new Error(
      `refused: xchacha20 needs a 24-byte nonce, got ${nonce.length}`,
    )
  }
  return {
    nonce,
    ciphertext: xchacha20poly1305(key, nonce, ad).encrypt(plaintext),
  }
}

// Returns null on authentication failure. Callers fail closed.
export function open(
  key: Uint8Array,
  nonce: Uint8Array,
  ciphertext: Uint8Array,
  ad: Uint8Array,
): Uint8Array | null {
  try {
    return xchacha20poly1305(key, nonce, ad).decrypt(ciphertext)
  } catch {
    return null
  }
}
