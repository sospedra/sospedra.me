import { Prng } from '../protocol/rand.ts'
import {
  type ClientTrustStateV1,
  encodeClientTrustState,
} from '../protocol/trust.ts'
import { type VerifyResult, verifyBundle } from '../protocol/verify.ts'

export const NONCE_LENGTH = 16

export type VerifyOutcome = VerifyResult

type PendingRequest = { requestBytes: Uint8Array; nonce: Uint8Array }

export class Client {
  trust: ClientTrustStateV1
  store: { committed: Uint8Array | null }
  prng: Prng
  private pending: PendingRequest | null

  constructor(trust: ClientTrustStateV1, label: string) {
    this.trust = trust
    this.store = { committed: null }
    this.prng = new Prng(label)
    this.pending = null
  }

  request(requestBytes: Uint8Array): { nonce: Uint8Array } {
    const nonce = this.prng.bytes(NONCE_LENGTH)
    this.pending = { requestBytes, nonce }
    return { nonce }
  }

  acceptBundle(
    bundleBytes: Uint8Array,
    nowMs: bigint,
    requireFreshHead = true,
  ): VerifyOutcome {
    if (!this.pending) {
      throw new RangeError('client: acceptBundle called before request')
    }
    const result = verifyBundle({
      expectedRequest: this.pending.requestBytes,
      expectedNonce: this.pending.nonce,
      bundleBytes,
      trust: this.trust,
      nowMs,
      requireFreshHead,
    })
    if (result.ok) {
      this.store.committed = encodeClientTrustState(result.next)
      this.trust = result.next
    }
    return result
  }

  highest(): bigint {
    return this.trust.highestSequence
  }
}
