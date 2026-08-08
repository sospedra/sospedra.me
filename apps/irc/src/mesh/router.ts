import { toHex } from './bytes.ts'
import {
  HOP_CAP,
  RATE_LIMIT_FRAMES,
  RATE_LIMIT_WINDOW_MS,
} from './constants.ts'
import { decodeFrame, type Frame, verifyFrame } from './frame.ts'
import { TokenBuckets } from './rate-limit.ts'
import { SeqWindows } from './seq-window.ts'

export type DropReason =
  | 'malformed'
  | 'bad-sig'
  | 'ejected'
  | 'own'
  | 'dup'
  | 'seq'
  | 'hop'
  | 'rate'

export type DropRecord = {
  reason: DropReason
  offender: string | null
}

export type RouterResult =
  | { kind: 'drop'; reason: DropReason }
  | { kind: 'accept'; frame: Frame; deliver: boolean; forward: boolean }

type RouterDeps = {
  selfHex: string
  isEjected(peerIdHex: string): boolean
  onDrop(record: DropRecord): void
}

const WILDCARD_HEX = '00'.repeat(32)

export class Router {
  private readonly deps: RouterDeps
  private readonly windows = new SeqWindows()
  private readonly buckets = new TokenBuckets({
    capacity: RATE_LIMIT_FRAMES,
    windowMs: RATE_LIMIT_WINDOW_MS,
  })

  constructor(deps: RouterDeps) {
    this.deps = deps
  }

  accept(raw: Uint8Array, fromHex: string, nowMs: number): RouterResult {
    const frame = decodeFrame(raw)
    if (frame === null) return this.drop('malformed', fromHex)
    if (!verifyFrame(frame)) return this.drop('bad-sig', fromHex)
    const srcHex = toHex(frame.src)
    if (this.deps.isEjected(srcHex)) return this.drop('ejected', null)
    if (srcHex === this.deps.selfHex) return this.drop('own', null)
    const seqVerdict = this.windows.evaluate(srcHex, frame.seq)
    if (seqVerdict === 'dup') return this.drop('dup', null)
    if (seqVerdict === 'out-of-range') return this.drop('seq', srcHex)
    if (frame.hop >= HOP_CAP) return this.drop('hop', fromHex)
    if (!this.buckets.take(srcHex, nowMs)) return this.drop('rate', srcHex)
    this.windows.commit(srcHex, frame.seq, nowMs)
    const dstHex = toHex(frame.dst)
    const hop = frame.hop + 1
    return {
      kind: 'accept',
      frame: { ...frame, hop },
      deliver: dstHex === WILDCARD_HEX || dstHex === this.deps.selfHex,
      forward: hop < HOP_CAP,
    }
  }

  prune(nowMs: number): void {
    this.windows.prune(nowMs)
  }

  private drop(reason: DropReason, offender: string | null): RouterResult {
    this.deps.onDrop({ reason, offender })
    return { kind: 'drop', reason }
  }
}
