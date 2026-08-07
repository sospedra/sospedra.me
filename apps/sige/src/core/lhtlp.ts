import { bytesToBigInt, randomBytes } from './bytes.ts'
import { modPow, randomPrime } from './puzzle.ts'

// LHTLP (Malavolta-Thyagarajan 2019) replaces plain RSW: publishing h = g^(2^T)
// makes puzzle creation and challenged-puzzle recomputation cheap, unlike RSW.

export type LhtlpParams = {
  n: bigint
  nSquared: bigint
  t: number
  g: bigint
  h: bigint
}

export type LhtlpPuzzle = { u: bigint; v: bigint }

function gcd(a: bigint, b: bigint): bigint {
  let x = a
  let y = b
  while (y !== 0n) {
    ;[x, y] = [y, x % y]
  }
  return x < 0n ? -x : x
}

function assertUnit(x: bigint, n: bigint, label: string): void {
  if (gcd(x, n) !== 1n) throw new Error(`${label} is not a unit mod n`)
}

function modInverse(a: bigint, mod: bigint): bigint {
  let oldR = a % mod
  let r = mod
  let oldS = 1n
  let s = 0n
  while (r !== 0n) {
    const quotient = oldR / r
    ;[oldR, r] = [r, oldR - quotient * r]
    ;[oldS, s] = [s, oldS - quotient * s]
  }
  return ((oldS % mod) + mod) % mod
}

function randomBelow(bound: bigint): bigint {
  const byteLength = Math.ceil(bound.toString(2).length / 8)
  return bytesToBigInt(randomBytes(byteLength)) % bound
}

function randomSquareUnit(n: bigint): bigint {
  for (;;) {
    const y = randomBelow(n)
    if (gcd(y, n) === 1n) return (y * y) % n
  }
}

// (x mod n)^n mod n^2 equals x^n mod n^2 by the binomial theorem: cross terms
// carry an extra factor of n and vanish. Avoids a full-width exponent.
function raiseToN(residueModN: bigint, n: bigint, nSquared: bigint): bigint {
  return modPow(residueModN, n, nSquared)
}

export function setupParams(
  primeBits: number,
  t: number,
): { params: LhtlpParams; trapdoor: bigint } {
  const p = randomPrime(primeBits)
  const q = randomPrime(primeBits)
  const n = p * q
  const nSquared = n * n
  const phi = (p - 1n) * (q - 1n)
  const g = randomSquareUnit(n)
  const h = modPow(g, modPow(2n, BigInt(t), phi), n)
  return { params: { n, nSquared, t, g, h }, trapdoor: phi }
}

export function createPuzzle(
  params: LhtlpParams,
  secret: bigint,
  r: bigint,
): LhtlpPuzzle {
  assertUnit(params.g, params.n, 'g')
  if (secret < 0n || secret >= params.n) {
    throw new Error('secret must be in [0, n)')
  }
  if (r < 0n) throw new Error('r must be non-negative')
  const { n, nSquared, h, g } = params
  const u = modPow(g, r, n)
  const hrN = raiseToN(modPow(h, r, n), n, nSquared)
  const onePlusNs = (1n + secret * n) % nSquared
  const v = (hrN * onePlusNs) % nSquared
  return { u, v }
}

export async function solvePuzzle(
  params: LhtlpParams,
  puzzle: LhtlpPuzzle,
  onProgress?: (done: number, total: number) => void,
): Promise<bigint> {
  assertUnit(puzzle.u, params.n, 'u')
  const { n, nSquared, t } = params
  let w = puzzle.u % n
  for (let i = 0; i < t; i++) {
    w = (w * w) % n
    if (i > 0 && i % 10000 === 0) {
      onProgress?.(i, t)
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }
  const m =
    (puzzle.v * modInverse(raiseToN(w, n, nSquared), nSquared)) % nSquared
  const numerator = m - 1n
  if (numerator % n !== 0n)
    throw new Error('puzzle does not decode to a scalar')
  return numerator / n
}

// Exactness needs the opened sum below n; s is hidden here, so callers must
// bound it (Task A3: k*q^2 well under n for k shares of a ~2^255 field).
export function addPuzzles(
  params: LhtlpParams,
  a: LhtlpPuzzle,
  b: LhtlpPuzzle,
): LhtlpPuzzle {
  assertUnit(a.u, params.n, 'u')
  assertUnit(b.u, params.n, 'u')
  return {
    u: (a.u * b.u) % params.n,
    v: (a.v * b.v) % params.nSquared,
  }
}

export function scalePuzzle(
  params: LhtlpParams,
  p: LhtlpPuzzle,
  scalar: bigint,
): LhtlpPuzzle {
  assertUnit(p.u, params.n, 'u')
  if (scalar < 0n || scalar >= params.n) {
    throw new Error('scalar must be in [0, n)')
  }
  return {
    u: modPow(p.u, scalar, params.n),
    v: modPow(p.v, scalar, params.nSquared),
  }
}

export function randomBlinding(params: LhtlpParams): bigint {
  return randomBelow(params.n)
}
