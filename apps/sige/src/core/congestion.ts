import { bytesEqual, concatBytes, utf8 } from './bytes.ts'
import { dhash, sha256 } from './hash.ts'

// Congestion escalation D2: chained sequential work (SIGE spec section 5.5D).
// Demo profile: sha256 chain with O(D) verification. Production uses a VDF.

export type CongestionPolicy = {
  dFloor: number
  baseline: number
  cap: number
  windowBlocks: number
}

// L is the count of unseals inside the trailing window W, so difficulty
// falls back to the floor once a burst ages out.
export function windowCount(
  policy: CongestionPolicy,
  anchorHeights: readonly number[],
  tipHeight: number,
): number {
  return anchorHeights.filter((h) => tipHeight - h < policy.windowBlocks).length
}

export function requiredDifficulty(
  policy: CongestionPolicy,
  windowedUnseals: number,
): number {
  const exp = Math.min(
    Math.max(windowedUnseals - policy.baseline, 0),
    policy.cap,
  )
  return policy.dFloor * 2 ** exp
}

// The first stamp in a log chains from this. It is PUBLIC by design: it gives
// nobody a right to be first, it only fixes where the chain starts so an
// auditor can walk it. Being first is decided by the log's append order.
export const STAMP_GENESIS = dhash('stamp-genesis')

export type WorkStamp = {
  output: Uint8Array
  difficulty: number
}

// Chaining forces serialization: stamp n cannot start before stamp n-1 ends.
export function chainedWork(
  prevOutput: Uint8Array,
  leafHash: Uint8Array,
  difficulty: number,
): WorkStamp {
  if (!Number.isSafeInteger(difficulty) || difficulty < 0) {
    throw new RangeError(`chainedWork: difficulty ${difficulty} is not a count`)
  }
  let h = sha256(concatBytes(utf8('SIGE-DEMO-UWC'), prevOutput, leafHash))
  for (let i = 0; i < difficulty; i++) h = sha256(h)
  return { output: h, difficulty }
}

// A difficulty the caller supplies drives the loop in chainedWork, so it must
// be a real count before anything else touches it. `NaN < required` is false,
// which clears the floor, and `i < NaN` is false, which skips the work
// entirely. `Infinity` clears the floor and then never terminates.
const MAX_DIFFICULTY = 2 ** 32

export function verifyWork(
  stamp: WorkStamp,
  prevOutput: Uint8Array,
  leafHash: Uint8Array,
  required: number,
): boolean {
  if (!Number.isSafeInteger(stamp.difficulty)) return false
  if (stamp.difficulty < 0 || stamp.difficulty > MAX_DIFFICULTY) return false
  if (stamp.difficulty < required) return false
  const again = chainedWork(prevOutput, leafHash, stamp.difficulty)
  return bytesEqual(again.output, stamp.output)
}
