type BucketState = {
  tokens: number
  at: number
}

const refill = (
  state: BucketState,
  nowMs: number,
  capacity: number,
  perMs: number,
): number => Math.min(capacity, state.tokens + (nowMs - state.at) * perMs)

export class TokenBuckets {
  private readonly buckets = new Map<string, BucketState>()
  private readonly capacity: number
  private readonly perMs: number

  constructor(input: { capacity: number; windowMs: number }) {
    this.capacity = input.capacity
    this.perMs = input.capacity / input.windowMs
  }

  take(key: string, nowMs: number): boolean {
    const state = this.buckets.get(key) ?? { tokens: this.capacity, at: nowMs }
    const tokens = refill(state, nowMs, this.capacity, this.perMs)
    const allowed = tokens >= 1
    this.buckets.set(key, {
      tokens: allowed ? tokens - 1 : tokens,
      at: nowMs,
    })
    return allowed
  }
}

export class ByteBudget {
  private state: BucketState
  private readonly bytesPerSec: number

  constructor(bytesPerSec: number) {
    this.bytesPerSec = bytesPerSec
    this.state = { tokens: bytesPerSec, at: 0 }
  }

  take(bytes: number, nowMs: number): boolean {
    const tokens = refill(
      this.state,
      nowMs,
      this.bytesPerSec,
      this.bytesPerSec / 1000,
    )
    const allowed = tokens >= bytes
    this.state = { tokens: allowed ? tokens - bytes : tokens, at: nowMs }
    return allowed
  }
}

export class PeerScores {
  private readonly scores = new Map<string, number>()

  get(key: string): number {
    return this.scores.get(key) ?? 0
  }

  penalize(key: string): number {
    const next = this.get(key) - 1
    this.scores.set(key, next)
    return next
  }
}
