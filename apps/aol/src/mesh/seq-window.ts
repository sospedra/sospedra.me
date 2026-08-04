import { SEQ_IDLE_MS, SEQ_WINDOW_AHEAD, SEQ_WINDOW_BACK } from './constants.ts'

type WindowState = {
  last: number
  seen: Set<number>
  touchedAt: number
}

export class SeqWindows {
  private readonly sources = new Map<string, WindowState>()

  get size(): number {
    return this.sources.size
  }

  check(srcHex: string, seq: number): boolean {
    return this.evaluate(srcHex, seq) === 'fresh'
  }

  evaluate(srcHex: string, seq: number): 'fresh' | 'dup' | 'out-of-range' {
    const state = this.sources.get(srcHex)
    if (state === undefined) return 'fresh'
    if (seq < state.last - SEQ_WINDOW_BACK) return 'out-of-range'
    if (seq > state.last + SEQ_WINDOW_AHEAD) return 'out-of-range'
    return state.seen.has(seq) ? 'dup' : 'fresh'
  }

  commit(srcHex: string, seq: number, nowMs: number): void {
    const state = this.sources.get(srcHex) ?? {
      last: seq,
      seen: new Set<number>(),
      touchedAt: nowMs,
    }
    state.seen.add(seq)
    state.last = Math.max(state.last, seq)
    state.touchedAt = nowMs
    const floor = state.last - SEQ_WINDOW_BACK
    for (const old of state.seen) {
      if (old < floor) state.seen.delete(old)
    }
    this.sources.set(srcHex, state)
  }

  prune(nowMs: number): void {
    for (const [srcHex, state] of this.sources) {
      if (nowMs - state.touchedAt > SEQ_IDLE_MS) this.sources.delete(srcHex)
    }
  }
}
