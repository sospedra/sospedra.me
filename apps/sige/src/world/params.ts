import type { VtdProfile } from '../core/vtd.ts'

// SIGE_FAST=1 shrinks delay parameters for CI. Real parameters are the
// honest default: the delay is the headline claim, so the demo pays it.
export const FAST: boolean =
  typeof process !== 'undefined' && process.env?.SIGE_FAST === '1'

export function tunedWith(fast: boolean, value: number): number {
  return fast ? Math.max(8, Math.floor(value / 100)) : value
}

export function tuned(value: number): number {
  return tunedWith(FAST, value)
}

export const VTD_PROFILE: VtdProfile = FAST
  ? { n: 24, k: 7, o: 6 }
  : { n: 130, k: 27, o: 26 }

// 256 bits (the fast fixture size elsewhere) is too small for k=7's fold
// bound (513 bits needed, vtd.test.ts); 320 clears it and stays fast.
export function lhtlpPrimeBitsFor(fast: boolean): number {
  return fast ? 320 : 1024
}

export const LHTLP_PRIME_BITS: number = lhtlpPrimeBitsFor(FAST)
export const DELAY_T = 1_100_000
export const CONGESTION_FLOOR = 600_000
