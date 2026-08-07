import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bls12_381 } from '@noble/curves/bls12-381.js'
import { bytesEqual } from '../src/core/bytes.ts'
import {
  commitmentFor,
  commitmentForCombination,
  commitPoly,
  lagrangeCoefficients,
  randomPoly,
  reconstruct,
  scalarCommitment,
  shareAt,
} from '../src/core/shamir.ts'

const G1 = bls12_381.G1.Point

test('any threshold subset reconstructs, fewer does not', () => {
  const secret = 7777777n
  const poly = randomPoly(secret, 5)
  const shares = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => shareAt(poly, i))
  assert.equal(reconstruct(shares.slice(0, 5)), secret)
  assert.equal(
    reconstruct([shares[1], shares[3], shares[5], shares[6], shares[7]]),
    secret,
  )
  assert.notEqual(
    reconstruct(shares.slice(0, 4).concat(shares.slice(0, 1))),
    secret,
  )
})

test('feldman commitments bind every share to the published coefficients', () => {
  const poly = randomPoly(31337n, 4)
  const commitments = commitPoly(poly)
  assert.ok(
    bytesEqual(commitments.a[0], scalarCommitment(31337n)),
    'a[0] commits the secret',
  )
  for (const i of [1, 2, 9, 40]) {
    const share = shareAt(poly, i)
    assert.ok(
      bytesEqual(commitmentFor(commitments, i), scalarCommitment(share.value)),
    )
  }
})

test('a tampered share fails its commitment check', () => {
  const poly = randomPoly(5n, 3)
  const commitments = commitPoly(poly)
  const share = shareAt(poly, 2)
  assert.ok(
    !bytesEqual(
      commitmentFor(commitments, 2),
      scalarCommitment(share.value + 1n),
    ),
  )
})

test('lagrange coefficients interpolate to the secret in the exponent', () => {
  const secret = 4242n
  const poly = randomPoly(secret, 3)
  const indices = [4, 8, 15]
  const shares = indices.map((i) => shareAt(poly, i))
  const lambdas = lagrangeCoefficients(indices)
  const folded = shares.reduce((acc, s, j) => acc + lambdas[j] * s.value, 0n)
  assert.equal(reconstruct(shares), secret)
  assert.ok(
    folded > 0n,
    'the integer fold is the value the puzzle homomorphism will carry',
  )
})

test('reconstruct rejects a lone share at index 0', () => {
  assert.throws(() => reconstruct([{ index: 0, value: 123n }]))
})

test('an index-0 share cannot override two genuine shares in reconstruct', () => {
  const poly = randomPoly(555n, 3)
  const genuine = [shareAt(poly, 2), shareAt(poly, 5)]
  assert.throws(() => reconstruct([{ index: 0, value: 123n }, ...genuine]))
})

test('randomPoly and lagrangeCoefficients reject invalid inputs early', () => {
  assert.throws(() => randomPoly(0n, 3))
  assert.throws(() => lagrangeCoefficients([0, 1, 2]))
})

test('commitmentForCombination agrees with the naive weighted sum of commitmentFor', () => {
  const poly = randomPoly(9001n, 4)
  const commitments = commitPoly(poly)
  const indices = [3, 7, 12, 19]
  const weights = lagrangeCoefficients(indices)
  const naive = indices.reduce(
    (acc, idx, i) =>
      acc.add(
        G1.fromBytes(commitmentFor(commitments, idx)).multiply(weights[i]),
      ),
    G1.ZERO,
  )
  assert.ok(
    bytesEqual(
      commitmentForCombination(commitments, indices, weights),
      naive.toBytes(true),
    ),
  )
})

test('commitmentForCombination catches a tampered share via the reconstructed scalar', () => {
  const poly = randomPoly(9001n, 4)
  const commitments = commitPoly(poly)
  const indices = [3, 7, 12, 19]
  const weights = lagrangeCoefficients(indices)
  const shares = indices.map((i) => shareAt(poly, i))
  const tampered = shares.map((s, i) =>
    i === 0 ? { ...s, value: s.value + 1n } : s,
  )
  const combined = commitmentForCombination(commitments, indices, weights)
  const reconstructedScalar = reconstruct(tampered)
  const expected =
    reconstructedScalar === 0n
      ? G1.ZERO.toBytes(true)
      : G1.BASE.multiply(reconstructedScalar).toBytes(true)
  assert.ok(!bytesEqual(combined, expected))
})

test('commitmentForCombination rejects mismatched lengths, empty input, and index 0', () => {
  const poly = randomPoly(42n, 3)
  const commitments = commitPoly(poly)
  assert.throws(() => commitmentForCombination(commitments, [], []))
  assert.throws(() => commitmentForCombination(commitments, [1, 2], [1n]))
  assert.throws(() => commitmentForCombination(commitments, [0, 1], [1n, 1n]))
})
