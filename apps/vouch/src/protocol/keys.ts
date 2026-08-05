import { ed25519 } from '@noble/curves/ed25519.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { ascii } from './bytes.ts'

export type Keypair = {
  publicKey: Uint8Array
  secretKey: Uint8Array
}

export function keypairFromLabel(label: string): Keypair {
  const seed = sha256(ascii(`vouch-seed:${label}`))
  const secretKey = seed
  const publicKey = ed25519.getPublicKey(seed)
  return { publicKey, secretKey }
}

export function sign(digest32: Uint8Array, kp: Keypair): Uint8Array {
  return ed25519.sign(digest32, kp.secretKey)
}

export function verifySig(
  digest32: Uint8Array,
  sig: Uint8Array,
  publicKey: Uint8Array,
): boolean {
  return ed25519.verify(sig, digest32, publicKey)
}
