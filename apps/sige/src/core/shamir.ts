import { bls12_381 } from '@noble/curves/bls12-381.js'
import { bytesEqual, bytesToBigInt, randomBytes } from './bytes.ts'

// Feldman VSS over BLS12-381 G1 (SIGE spec section 5.5A wants a SNARK-friendly
// inner curve for cheap in-circuit multiplication; G1 substitutes here).

const G1 = bls12_381.G1.Point
const Fr = bls12_381.fields.Fr
const G1_COMPRESSED_BYTES = G1.BASE.toBytes(true).length

export type Poly = { coefficients: bigint[] }
export type Share = { index: number; value: bigint }
export type FeldmanCommitments = { a: Uint8Array[] }
type G1Point = typeof G1.BASE

// Spec 5.8: reject a non-canonical field encoding rather than let noble
// reduce it mod p, which would let two distinct byte strings decode to one point.
function decodeValidG1(bytes: Uint8Array, label: string): G1Point {
  if (bytes.length !== G1_COMPRESSED_BYTES) {
    throw new Error(
      `${label} must be ${G1_COMPRESSED_BYTES} bytes, got ${bytes.length}`,
    )
  }
  let point: G1Point
  try {
    point = G1.fromBytes(bytes)
  } catch (error) {
    throw new Error(
      `${label} is not a valid point: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
  if (point.is0()) throw new Error(`${label} must not be the identity point`)
  if (!bytesEqual(point.toBytes(true), bytes)) {
    throw new Error(`${label} is not a canonical point encoding`)
  }
  return point
}

function assertNonzeroIndex(index: number): void {
  if (index === 0) throw new Error('index 0 is the secret, not a share')
}

function assertNonzeroIndices(indices: number[]): void {
  if (indices.some((i) => i === 0)) {
    throw new Error('index 0 is the secret, not a share')
  }
}

function assertValidScalar(scalar: bigint, label: string): void {
  if (scalar <= 0n || scalar >= Fr.ORDER) {
    throw new Error(`${label} must be in the range (0, r)`)
  }
}

function randomFr(): bigint {
  const value = Fr.create(bytesToBigInt(randomBytes(48)))
  return value === 0n ? Fr.ONE : value
}

export function randomPoly(secret: bigint, threshold: number): Poly {
  assertValidScalar(secret, 'secret')
  if (threshold < 1) throw new Error('threshold must be at least 1')
  const tail = Array.from({ length: threshold - 1 }, randomFr)
  return { coefficients: [secret, ...tail] }
}

export function shareAt(poly: Poly, index: number): Share {
  assertNonzeroIndex(index)
  const x = Fr.create(BigInt(index))
  const value = poly.coefficients.reduce(
    (acc, coefficient, j) =>
      Fr.add(acc, Fr.mul(coefficient, Fr.pow(x, BigInt(j)))),
    Fr.ZERO,
  )
  return { index, value }
}

export function scalarCommitment(scalar: bigint): Uint8Array {
  assertValidScalar(scalar, 'scalar')
  return G1.BASE.multiply(scalar).toBytes(true)
}

export function commitPoly(poly: Poly): FeldmanCommitments {
  return { a: poly.coefficients.map(scalarCommitment) }
}

export function commitmentFor(
  commitments: FeldmanCommitments,
  index: number,
): Uint8Array {
  assertNonzeroIndex(index)
  const x = Fr.create(BigInt(index))
  const terms = commitments.a.map((point, j) =>
    decodeValidG1(point, `commitment[${j}]`).multiply(Fr.pow(x, BigInt(j))),
  )
  const sum = terms.reduce((acc, term) => acc.add(term), G1.ZERO)
  return sum.toBytes(true)
}

// Every commitment decodes and validates unconditionally; only the multiply
// is skipped for a zero coefficient, since noble throws on a zero scalar.
export function commitmentForCombination(
  commitments: FeldmanCommitments,
  indices: number[],
  weights: bigint[],
): Uint8Array {
  if (indices.length === 0) throw new Error('need at least one index')
  if (indices.length !== weights.length) {
    throw new Error('indices and weights must have the same length')
  }
  assertNonzeroIndices(indices)
  const xs = indices.map((i) => Fr.create(BigInt(i)))
  const coefficientScalars = commitments.a.map((_, j) =>
    xs.reduce(
      (acc, x, i) => Fr.add(acc, Fr.mul(weights[i], Fr.pow(x, BigInt(j)))),
      Fr.ZERO,
    ),
  )
  const points = commitments.a.map((point, j) =>
    decodeValidG1(point, `commitment[${j}]`),
  )
  const nonzeroTerms = points
    .map((point, j) => [point, coefficientScalars[j]] as const)
    .filter(([, scalar]) => scalar !== 0n)
  const sum = nonzeroTerms.reduce(
    (acc, [point, scalar]) => acc.add(point.multiply(scalar)),
    G1.ZERO,
  )
  return sum.toBytes(true)
}

function invertOrZero(x: bigint): bigint {
  return x === 0n ? 0n : Fr.inv(x)
}

// A repeated index makes (xi - xj) = 0; treating its inverse as 0 zeroes that
// share's weight instead of throwing, so a duplicate yields a wrong value.
function rawLagrangeCoefficients(xs: bigint[]): bigint[] {
  return xs.map((xi, i) => {
    const others = xs.filter((_, j) => j !== i)
    return others.reduce((acc, xj) => {
      const factor = Fr.mul(Fr.neg(xj), invertOrZero(Fr.sub(xi, xj)))
      return Fr.mul(acc, factor)
    }, Fr.ONE)
  })
}

export function lagrangeCoefficients(indices: number[]): bigint[] {
  if (indices.length === 0) throw new Error('need at least one index')
  if (new Set(indices).size !== indices.length) {
    throw new Error('indices must be distinct')
  }
  assertNonzeroIndices(indices)
  return rawLagrangeCoefficients(indices.map((i) => Fr.create(BigInt(i))))
}

export function reconstruct(shares: Share[]): bigint {
  if (shares.length === 0) {
    throw new Error('reconstruct needs at least one share')
  }
  assertNonzeroIndices(shares.map((s) => s.index))
  const xs = shares.map((s) => Fr.create(BigInt(s.index)))
  const lambdas = rawLagrangeCoefficients(xs)
  const terms = shares.map((s, i) => Fr.mul(lambdas[i], Fr.create(s.value)))
  return terms.reduce((acc, term) => Fr.add(acc, term), Fr.ZERO)
}
