import { ed25519 } from '@noble/curves/ed25519.js'
import { toHex } from './bytes.ts'

export type Tier = 'PRF' | 'STORED'

export type Identity = {
  tier: Tier
  peerId: Uint8Array
  peerIdHex: string
  sign(message: Uint8Array): Uint8Array
}

export const identityFromSeed = (seed: Uint8Array, tier: Tier): Identity => {
  const peerId = ed25519.getPublicKey(seed)
  return {
    tier,
    peerId,
    peerIdHex: toHex(peerId),
    sign: (message) => ed25519.sign(message, seed),
  }
}

export const verifySig = (
  message: Uint8Array,
  sig: Uint8Array,
  peerId: Uint8Array,
): boolean => {
  try {
    return ed25519.verify(sig, message, peerId)
  } catch {
    return false
  }
}
