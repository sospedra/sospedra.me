import { Reader, Writer } from './encode.ts'
import { hash } from './hash.ts'

export type HeadIdV1 = {
  sequence: bigint
  stateRoot: Uint8Array
  updateProgramId: Uint8Array
  queryProgramId: Uint8Array
  programChainHash: Uint8Array
}

function writeHeadId(w: Writer, head: HeadIdV1): void {
  w.u64(head.sequence)
  w.fixed(head.stateRoot, 32)
  w.fixed(head.updateProgramId, 32)
  w.fixed(head.queryProgramId, 32)
  w.fixed(head.programChainHash, 32)
}

function readHeadId(r: Reader): HeadIdV1 {
  const sequence = r.u64()
  const stateRoot = r.fixed(32)
  const updateProgramId = r.fixed(32)
  const queryProgramId = r.fixed(32)
  const programChainHash = r.fixed(32)
  return {
    sequence,
    stateRoot,
    updateProgramId,
    queryProgramId,
    programChainHash,
  }
}

export function encodeHeadId(head: HeadIdV1): Uint8Array {
  const w = new Writer()
  writeHeadId(w, head)
  return w.done()
}

export function decodeHeadId(buf: Uint8Array): HeadIdV1 {
  const r = new Reader(buf)
  const head = readHeadId(r)
  r.finish()
  return head
}

export type LatestHeadV1 = {
  head: HeadIdV1
  latestAsOfMs: bigint
  headKeyId: Uint8Array
}

export function encodeLatestHead(latestHead: LatestHeadV1): Uint8Array {
  const w = new Writer()
  writeHeadId(w, latestHead.head)
  w.u64(latestHead.latestAsOfMs)
  w.fixed(latestHead.headKeyId, 32)
  return w.done()
}

export function decodeLatestHead(buf: Uint8Array): LatestHeadV1 {
  const r = new Reader(buf)
  const head = readHeadId(r)
  const latestAsOfMs = r.u64()
  const headKeyId = r.fixed(32)
  r.finish()
  return { head, latestAsOfMs, headKeyId }
}

export function headSigningInput(headBytes: Uint8Array): Uint8Array {
  return hash('latest-head', headBytes)
}

export type FreshnessPolicy = { maxHeadAgeMs: bigint; clockSkewMs: bigint }

export type FreshnessResult = 'ok' | 'STALE_HEAD' | 'FUTURE_HEAD'

export function checkFreshness(
  head: LatestHeadV1,
  nowMs: bigint,
  policy: FreshnessPolicy,
): FreshnessResult {
  if (head.latestAsOfMs > nowMs + policy.clockSkewMs) return 'FUTURE_HEAD'
  if (head.latestAsOfMs + policy.maxHeadAgeMs < nowMs) return 'STALE_HEAD'
  return 'ok'
}
