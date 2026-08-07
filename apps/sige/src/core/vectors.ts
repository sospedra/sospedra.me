import { bls12_381 } from '@noble/curves/bls12-381.js'
import { hkdf } from '@noble/hashes/hkdf.js'
import {
  bigIntToBytes,
  bytesToBigInt,
  concatBytes,
  u32be,
  utf8,
} from './bytes.ts'
import type { CborValue } from './cbor.ts'
import { sha256 } from './hash.ts'
import { createPuzzle, type LhtlpParams } from './lhtlp.ts'
import { modPow } from './puzzle.ts'
import { commitPoly, type Poly, shareAt } from './shamir.ts'
import {
  internalDeriveIndexChallenge,
  internalDeriveIndexSet,
  type VtdOpened,
  type VtdProfile,
  type VtdProof,
} from './vtd.ts'

const Fr = bls12_381.fields.Fr

export const SEED_DOMAIN = 'SIGE-VECTORS/v1'

// The envelope every vectors/*.json file shares, so a later category (the
// record catalog, consistency proofs) adds a file without reshaping this one.
export type VectorFile<TVector> = {
  readonly schemaVersion: number
  readonly category: string
  readonly description: string
  readonly seedDomain: string
  readonly vectors: readonly TVector[]
}

const SEED_BLOCK_BYTES = 32

function seedBlock(label: string, counter: number): Uint8Array {
  return sha256(
    concatBytes(utf8(SEED_DOMAIN), utf8('/'), utf8(label), u32be(counter)),
  )
}

export function seededBytes(label: string, length: number): Uint8Array {
  const blocks = Math.ceil(length / SEED_BLOCK_BYTES)
  const parts = Array.from({ length: blocks }, (_, i) => seedBlock(label, i))
  return concatBytes(...parts).slice(0, length)
}

const MAX_SCALAR_ATTEMPTS = 8

// Every quantity in these vectors that would otherwise come from
// crypto.getRandomValues instead reduces seededBytes under this label.
export function seededScalar(label: string, order: bigint): bigint {
  for (let attempt = 0; attempt < MAX_SCALAR_ATTEMPTS; attempt++) {
    const candidate =
      bytesToBigInt(seededBytes(`${label}#${attempt}`, 48)) % order
    if (candidate !== 0n) return candidate
  }
  throw new Error(`seededScalar: ${label} did not yield a nonzero value`)
}

function gcd(a: bigint, b: bigint): bigint {
  let x = a
  let y = b
  while (y !== 0n) {
    ;[x, y] = [y, x % y]
  }
  return x < 0n ? -x : x
}

export function seededSquareUnit(label: string, n: bigint): bigint {
  const y = seededScalar(label, n)
  if (gcd(y, n) !== 1n) {
    throw new Error(`seededSquareUnit: ${label} is not coprime to n`)
  }
  return (y * y) % n
}

export function lhtlpParamsFromPrimes(
  p: bigint,
  q: bigint,
  t: number,
  g: bigint,
): LhtlpParams {
  const n = p * q
  return { n, nSquared: n * n, t, g, h: modPow(g, 2n ** BigInt(t), n) }
}

const MAX_COEFFICIENT_ATTEMPTS = 100

// Mirrors vtd.ts's private, unexported coefficient derivation; the exported
// coefficientsDeriveFromSecret is this file's cross-check that the mirror is exact.
export function vtdCoefficient(
  secret: bigint,
  nonce: Uint8Array,
  j: number,
): bigint {
  for (let attempt = 0; attempt < MAX_COEFFICIENT_ATTEMPTS; attempt++) {
    const info = concatBytes(
      utf8('sige-vtd/coefficient'),
      nonce,
      u32be(j),
      u32be(attempt),
    )
    const digest = hkdf(
      sha256,
      bigIntToBytes(secret),
      new Uint8Array(0),
      info,
      48,
    )
    const value = Fr.create(bytesToBigInt(digest))
    if (value !== 0n) return value
  }
  throw new Error(
    `vtdCoefficient: coefficient ${j} did not yield a nonzero value`,
  )
}

export function vtdBoundPoly(
  secret: bigint,
  nonce: Uint8Array,
  k: number,
): Poly {
  const tail = Array.from({ length: k - 1 }, (_, i) =>
    vtdCoefficient(secret, nonce, i + 1),
  )
  return { coefficients: [secret, ...tail] }
}

export type VtdVectorInput = {
  readonly params: LhtlpParams
  readonly secret: bigint
  readonly nonce: Uint8Array
  readonly profile: VtdProfile
  readonly blindings: readonly bigint[]
}

export function buildVtdProof(input: VtdVectorInput): VtdProof {
  const { params, secret, nonce, profile, blindings } = input
  const poly = vtdBoundPoly(secret, nonce, profile.k)
  const commitments = commitPoly(poly)
  const indices = Array.from({ length: profile.n }, (_, i) => i + 1)
  const shares = indices.map((i) => shareAt(poly, i))
  const puzzles = shares.map((share, i) =>
    createPuzzle(params, share.value, blindings[i]),
  )
  const challenge = internalDeriveIndexChallenge(params, {
    profile,
    nonce,
    commitments,
    puzzles,
  })
  const openedIndices = internalDeriveIndexSet(challenge, profile.n, profile.o)
  const opened: VtdOpened[] = openedIndices.map((i) => ({
    index: i,
    share: shares[i - 1].value,
    blinding: blindings[i - 1],
  }))
  return { profile, nonce, commitments, puzzles, opened }
}

export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(2 * i, 2 * i + 2), 16)
  }
  return bytes
}

export type JsonCborValue =
  | { readonly type: 'int'; readonly value: string }
  | { readonly type: 'bytes'; readonly value: string }
  | { readonly type: 'text'; readonly value: string }
  | { readonly type: 'bool'; readonly value: boolean }
  | { readonly type: 'null' }
  | { readonly type: 'array'; readonly value: readonly JsonCborValue[] }
  | {
      readonly type: 'map'
      readonly value: readonly (readonly [string, JsonCborValue])[]
    }

export function cborValueFromJson(json: JsonCborValue): CborValue {
  switch (json.type) {
    case 'int':
      return BigInt(json.value)
    case 'bytes':
      return hexToBytes(json.value)
    case 'text':
      return json.value
    case 'bool':
      return json.value
    case 'null':
      return null
    case 'array':
      return json.value.map(cborValueFromJson)
    case 'map':
      return new Map(
        json.value.map(([key, value]) => [key, cborValueFromJson(value)]),
      )
  }
}
