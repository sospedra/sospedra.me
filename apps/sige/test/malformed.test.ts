import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bls12_381 } from '@noble/curves/bls12-381.js'
import {
  bigIntToBytes,
  bytesToBigInt,
  concatBytes,
  randomBytes,
  toHex,
} from '../src/core/bytes.ts'
import {
  checkEncapsulationPoint,
  deriveContribution,
  gateIdentity,
  genEpoch,
} from '../src/core/kem.ts'
import { createPuzzle, randomBlinding, setupParams } from '../src/core/lhtlp.ts'
import {
  commitmentFor,
  commitmentForCombination,
  commitPoly,
  randomPoly,
  scalarCommitment,
  shareAt,
} from '../src/core/shamir.ts'
import {
  internalDeriveIndexChallenge,
  internalDeriveIndexSet,
  type VtdProof,
  verifyVtd,
} from '../src/core/vtd.ts'

// Reproduces Task B3 review's non-canonical-encoding attack plus the other
// three spec-5.8 checks. Every case is refused by name, never by a throw.

const G1 = bls12_381.G1.Point
const G2 = bls12_381.G2.Point
const Fp = bls12_381.fields.Fp
const G1_LEN = G1.BASE.toBytes(true).length
const G2_LEN = G2.BASE.toBytes(true).length

function toFixedLimb(value: bigint, length: number): Uint8Array {
  const raw = bigIntToBytes(value)
  const out = new Uint8Array(length)
  out.set(raw, length - raw.length)
  return out
}

function flaggedLimb(value: bigint, length: number): Uint8Array {
  const bytes = toFixedLimb(value, length)
  bytes[0] |= 0x80
  return bytes
}

function g2Bytes(c1: bigint, c0: bigint): Uint8Array {
  return concatBytes(flaggedLimb(c1, G1_LEN), toFixedLimb(c0, G1_LEN))
}

const OFF_CURVE_G1 = flaggedLimb(7n, G1_LEN)
const OFF_CURVE_G2 = g2Bytes(0n, 6n)
const WRONG_SUBGROUP_G1 = flaggedLimb(4n, G1_LEN)
const WRONG_SUBGROUP_G2 = g2Bytes(0n, 2n)

const IDENTITY_G1 = G1.ZERO.toBytes(true)
const IDENTITY_G2 = G2.ZERO.toBytes(true)

function nonCanonicalG2(canonical: Uint8Array): Uint8Array {
  const c0 = bytesToBigInt(canonical.subarray(G1_LEN))
  const bumped = toFixedLimb(c0 + Fp.ORDER, G1_LEN)
  return concatBytes(canonical.subarray(0, G1_LEN), bumped)
}

// G1's x shares byte 0 with the flag bits, so this only stays clear of them
// for a small enough x: the caller picks a small scalar multiple of BASE.
function nonCanonicalG1(canonical: Uint8Array): Uint8Array {
  const flag = (canonical[0] ?? 0) & 0b1110_0000
  const x = bytesToBigInt(canonical) & ((1n << 381n) - 1n)
  const bumped = toFixedLimb(x + Fp.ORDER, G1_LEN)
  bumped[0] = ((bumped[0] ?? 0) & 0b0001_1111) | flag
  return bumped
}

function kemFixture() {
  const epoch = genEpoch(1)
  const id = gateIdentity(
    'warrant',
    new Uint8Array([1]),
    new Uint8Array([2]),
    new Uint8Array([3]),
    1,
  )
  return { epoch, id }
}

const VTD_PROFILE = { n: 24, k: 7, o: 6 }
const VTD_SECRET = 42n

// Swaps commitments.a[1] for `bad` before deriving the challenge, so the
// opened-index set stays consistent and the failure reaches Feldman decode.
function vtdProofWithTamperedCommitment(bad: Uint8Array): {
  params: ReturnType<typeof setupParams>['params']
  proof: VtdProof
  expectations: { hS: Uint8Array; profile: typeof VTD_PROFILE }
} {
  const { params } = setupParams(320, 64)
  const poly = randomPoly(VTD_SECRET, VTD_PROFILE.k)
  const honest = commitPoly(poly)
  const commitments = { a: honest.a.map((c, j) => (j === 1 ? bad : c)) }
  const nonce = randomBytes(32)
  const indices = Array.from({ length: VTD_PROFILE.n }, (_, i) => i + 1)
  const shares = indices.map((i) => shareAt(poly, i))
  const blindings = indices.map(() => randomBlinding(params))
  const puzzles = shares.map((share, i) =>
    createPuzzle(params, share.value, blindings[i]),
  )
  const challenge = internalDeriveIndexChallenge(params, {
    profile: VTD_PROFILE,
    nonce,
    commitments,
    puzzles,
  })
  const openedIndices = internalDeriveIndexSet(
    challenge,
    VTD_PROFILE.n,
    VTD_PROFILE.o,
  )
  const opened = openedIndices.map((i) => ({
    index: i,
    share: shares[i - 1].value,
    blinding: blindings[i - 1],
  }))
  const proof: VtdProof = {
    profile: VTD_PROFILE,
    nonce,
    commitments,
    puzzles,
    opened,
  }
  const expectations = {
    hS: scalarCommitment(VTD_SECRET),
    profile: VTD_PROFILE,
  }
  return { params, proof, expectations }
}

type Case = {
  g2: Uint8Array
  g1: Uint8Array
  reason: RegExp
}

function checkCase({ g2, g1, reason }: Case): void {
  const g2Issue = checkEncapsulationPoint(g2)
  assert.notEqual(g2Issue, null, 'checkEncapsulationPoint must refuse')
  assert.match(String(g2Issue), reason)

  const { epoch, id } = kemFixture()
  assert.throws(
    () => deriveContribution('warrant', id, epoch.xA, g2),
    reason,
    'deriveContribution must throw with a specific reason',
  )

  assert.throws(
    () => commitmentFor({ a: [g1] }, 1),
    reason,
    'commitmentFor must throw with a specific reason',
  )
  assert.throws(
    () =>
      commitmentForCombination(
        { a: [scalarCommitment(1n), g1] },
        [1, 2],
        [1n, 0n],
      ),
    reason,
    'a zero-weighted commitment must still be validated, not skipped undecoded',
  )

  const { params, proof, expectations } = vtdProofWithTamperedCommitment(g1)
  let vtdReason: string | null = null
  assert.doesNotThrow(() => {
    vtdReason = verifyVtd(params, proof, expectations)
  }, 'verifyVtd must never throw a raw deserialization error')
  assert.notEqual(vtdReason, null)
  assert.match(String(vtdReason), reason)
}

test('the identity point is refused at every boundary', () => {
  checkCase({ g2: IDENTITY_G2, g1: IDENTITY_G1, reason: /identity/i })
})

test('an off-curve point is refused at every boundary', () => {
  checkCase({ g2: OFF_CURVE_G2, g1: OFF_CURVE_G1, reason: /square root/i })
})

test('a wrong-subgroup point is refused at every boundary', () => {
  checkCase({
    g2: WRONG_SUBGROUP_G2,
    g1: WRONG_SUBGROUP_G1,
    reason: /subgroup/i,
  })
})

test('a wrong-length input is refused at every boundary', () => {
  for (const delta of [-1, 1]) {
    const g2 = new Uint8Array(G2_LEN + delta)
    const g1 = new Uint8Array(G1_LEN + delta)
    checkCase({ g2, g1, reason: /bytes/i })
  }
})

test('the demonstrated non-canonical encoding is refused at every boundary', () => {
  const r = 999999999999999999999999999999n % bls12_381.fields.Fr.ORDER
  const canonicalU = G2.BASE.multiply(r).toBytes(true)
  const mauledU = nonCanonicalG2(canonicalU)
  assert.notEqual(toHex(canonicalU), toHex(mauledU), 'byte strings must differ')
  assert.ok(
    G2.fromBytes(canonicalU).equals(G2.fromBytes(mauledU)),
    'both must still decode to the same point (noble is unpatched)',
  )

  const canonicalCommitment = G1.BASE.multiply(2n).toBytes(true)
  const mauledCommitment = nonCanonicalG1(canonicalCommitment)
  assert.notEqual(
    toHex(canonicalCommitment),
    toHex(mauledCommitment),
    'byte strings must differ',
  )
  assert.ok(
    G1.fromBytes(canonicalCommitment).equals(G1.fromBytes(mauledCommitment)),
    'both must still decode to the same point (noble is unpatched)',
  )

  checkCase({ g2: mauledU, g1: mauledCommitment, reason: /canonical/i })
})
