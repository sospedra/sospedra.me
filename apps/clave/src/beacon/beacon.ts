// The timelock beacon. Paper Section 3.8 step 3.
//
// The escrow network seals a disclosure to a future round. When the beacon
// reaches that round it publishes the value that opens it, whether or not the
// platform cooperates. That is the whole point: the platform cannot extend
// secrecy by doing nothing.
//
// The mock advances rounds on demand so a test can reach the future without
// waiting ninety days. A drand backing would replace round() with the real
// beacon's signature; the interface is the same either way.

import { open, seal } from '../core/aead.ts'
import { concatBytes, randomBytes, u32be, utf8 } from '../core/bytes.ts'
import { kdf, sha256 } from '../core/hash.ts'

export type Capsule = {
  readonly round: number
  readonly nonce: Uint8Array
  readonly ciphertext: Uint8Array
}

export type Beacon = {
  readonly kind: 'mock' | 'drand'
  currentRound(): number
  /** Seal a payload so it opens at the given round and not before. */
  sealUntil(round: number, payload: Uint8Array): Capsule
  /** Returns null while the round is still in the future. */
  tryOpen(capsule: Capsule): Uint8Array | null
}

export class MockBeacon implements Beacon {
  readonly kind = 'mock' as const
  private round = 0
  private readonly seed: Uint8Array

  constructor(seed: Uint8Array = randomBytes(32)) {
    this.seed = seed
  }

  currentRound(): number {
    return this.round
  }

  /** Advance to a future round, as time would. */
  advanceTo(round: number): void {
    if (round > this.round) this.round = round
  }

  // The value the beacon will publish at that round. A real beacon produces a
  // threshold signature nobody can compute early. Here it is a hash of a seed
  // the holder of the capsule does not have, which reproduces the property
  // that matters for the protocol: unavailable before the round, public after.
  private roundValue(round: number): Uint8Array {
    return sha256(concatBytes(utf8('CLAVE/beacon/v1'), this.seed, u32be(round)))
  }

  sealUntil(round: number, payload: Uint8Array): Capsule {
    const key = kdf(
      this.roundValue(round),
      utf8('CLAVE/timelock/v1'),
      u32be(round),
    )
    const sealed = seal(key, payload, u32be(round))
    return { round, nonce: sealed.nonce, ciphertext: sealed.ciphertext }
  }

  tryOpen(capsule: Capsule): Uint8Array | null {
    if (this.round < capsule.round) return null
    const key = kdf(
      this.roundValue(capsule.round),
      utf8('CLAVE/timelock/v1'),
      u32be(capsule.round),
    )
    return open(key, capsule.nonce, capsule.ciphertext, u32be(capsule.round))
  }
}
