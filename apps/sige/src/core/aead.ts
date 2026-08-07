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
  const nonce = randomBytes(24)
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
