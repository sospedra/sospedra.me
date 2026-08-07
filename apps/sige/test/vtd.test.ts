import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bls12_381 } from '@noble/curves/bls12-381.js'
import { bytesEqual } from '../src/core/bytes.ts'
import {
  createPuzzle,
  type LhtlpParams,
  type LhtlpPuzzle,
  randomBlinding,
  setupParams,
} from '../src/core/lhtlp.ts'
import {
  commitPoly,
  type FeldmanCommitments,
  type Poly,
  randomPoly,
  reconstruct,
  scalarCommitment,
  shareAt,
} from '../src/core/shamir.ts'
import {
  coefficientsDeriveFromSecret,
  internalDeriveIndexChallenge,
  internalDeriveIndexSet,
  proveVtd,
  solveVtd,
  soundnessBits,
  type VtdExpectations,
  type VtdProfile,
  type VtdProof,
  verifyVtd,
  worstCaseSolves,
} from '../src/core/vtd.ts'

const PROFILE = { n: 24, k: 7, o: 6 }
const SECRET = 123456789n

// primeBits=256 (lhtlp.test.ts's speed profile) is too small for k=7's fold
// bound (513 bits needed); 320 clears it with margin and stays fast (~9ms).
function fixture() {
  const { params } = setupParams(320, 64)
  const proof = proveVtd(params, SECRET, PROFILE)
  const hS = scalarCommitment(SECRET)
  return { params, proof, hS, expectations: { hS, profile: PROFILE } }
}

type PuzzleOverride = (
  index: number,
  value: bigint,
  blinding: bigint,
) => LhtlpPuzzle | undefined

type ManualProofOptions = {
  poly: Poly
  nonce: Uint8Array
  commitments: FeldmanCommitments
  profile: VtdProfile
  puzzleOverride?: PuzzleOverride
}

// Builds a proof from a chosen polynomial and commitments, bypassing proveVtd,
// for a shape it can never produce (a puzzle corrupted independently of it).
function buildManualProof(
  params: LhtlpParams,
  options: ManualProofOptions,
): { proof: VtdProof; openedIndices: number[] } {
  const { poly, nonce, commitments, profile, puzzleOverride } = options
  const indices = Array.from({ length: profile.n }, (_, i) => i + 1)
  const shares = indices.map((i) => shareAt(poly, i))
  const blindings = indices.map(() => randomBlinding(params))
  const puzzles = shares.map((share, i) => {
    const override = puzzleOverride?.(i + 1, share.value, blindings[i])
    return override ?? createPuzzle(params, share.value, blindings[i])
  })
  const challenge = internalDeriveIndexChallenge(params, {
    profile,
    nonce,
    commitments,
    puzzles,
  })
  const openedIndices = internalDeriveIndexSet(challenge, profile.n, profile.o)
  const opened = openedIndices.map((i) => ({
    index: i,
    share: shares[i - 1].value,
    blinding: blindings[i - 1],
  }))
  return {
    proof: { profile, nonce, commitments, puzzles, opened },
    openedIndices,
  }
}

type AvoidingProofOptions = {
  secret: bigint
  profile: VtdProfile
  avoidIndices: number[]
  puzzleOverride: PuzzleOverride
}

function randomNonce(): Uint8Array {
  const nonce = new Uint8Array(32)
  globalThis.crypto.getRandomValues(nonce)
  return nonce
}

// Grinds fresh randomness (a real forgery needed 1-2 attempts) until none of
// avoidIndices lands in the derived opening, so an overridden puzzle stays unopened.
function buildProofAvoidingIndices(
  params: LhtlpParams,
  options: AvoidingProofOptions,
): VtdProof {
  const { secret, profile, avoidIndices, puzzleOverride } = options
  for (let attempt = 0; attempt < 200; attempt++) {
    const poly = randomPoly(secret, profile.k)
    const { proof, openedIndices } = buildManualProof(params, {
      poly,
      nonce: randomNonce(),
      commitments: commitPoly(poly),
      profile,
      puzzleOverride,
    })
    if (avoidIndices.every((i) => !openedIndices.includes(i))) return proof
  }
  throw new Error('grinding did not avoid the target indices in time')
}

test('an honest proof verifies and solves to the committed scalar', async () => {
  const { params, proof, expectations } = fixture()
  assert.equal(verifyVtd(params, proof, expectations), null)
  assert.equal(await solveVtd(params, proof), SECRET)
})

test('the proof leaks nothing: opened shares stay below the threshold', () => {
  const { proof } = fixture()
  assert.equal(proof.opened.length, PROFILE.o)
  assert.ok(
    PROFILE.o <= PROFILE.k - 1,
    'opened count is below the reconstruction threshold',
  )
  assert.ok(
    PROFILE.n - PROFILE.o >= PROFILE.k,
    'enough unopened shares remain to fold',
  )
})

test('verification refuses a proof bound to the wrong commitment', () => {
  const { params, proof } = fixture()
  const expectations = { hS: scalarCommitment(SECRET + 1n), profile: PROFILE }
  const reason = verifyVtd(params, proof, expectations)
  assert.match(String(reason), /commit/i)
})

test('verification refuses a tampered opened share', () => {
  const { params, proof, expectations } = fixture()
  const bad = {
    ...proof,
    opened: proof.opened.map((x, i) =>
      i === 0 ? { ...x, share: x.share + 1n } : x,
    ),
  }
  assert.notEqual(verifyVtd(params, bad, expectations), null)
})

test('verification refuses a tampered puzzle', () => {
  const { params, proof, expectations } = fixture()
  const puzzles = proof.puzzles.slice()
  const target = proof.opened[0].index - 1
  puzzles[target] = { ...puzzles[target], v: puzzles[target].v + 1n }
  assert.notEqual(verifyVtd(params, { ...proof, puzzles }, expectations), null)
})

test('verification refuses a re-chosen challenge set', () => {
  const { params, proof, expectations } = fixture()
  const shifted = {
    ...proof,
    opened: proof.opened.slice(1).concat(proof.opened.slice(0, 1)),
  }
  const swapped = {
    ...shifted,
    opened: shifted.opened.map((x) => ({
      ...x,
      index: (x.index % PROFILE.n) + 1,
    })),
  }
  assert.notEqual(verifyVtd(params, swapped, expectations), null)
})

test('verification refuses a swapped nonce', () => {
  const { params, proof, expectations } = fixture()
  const other = proveVtd(params, SECRET, PROFILE)
  const swapped = { ...proof, nonce: other.nonce }
  assert.notEqual(verifyVtd(params, swapped, expectations), null)
})

test('verification refuses a proof whose profile does not match what the verifier expects', () => {
  const { params } = setupParams(320, 64)
  const tinyProfile = { n: 3, k: 2, o: 1 }
  const proof = proveVtd(params, SECRET, tinyProfile)
  const expectations = { hS: scalarCommitment(SECRET), profile: PROFILE }
  const reason = verifyVtd(params, proof, expectations)
  assert.match(String(reason), /profile/i)
})

test('verification is cheap: it never pays the delay', () => {
  const { params, proof, expectations } = fixture()
  const t0 = performance.now()
  assert.equal(verifyVtd(params, proof, expectations), null)
  assert.ok(
    performance.now() - t0 < 2000,
    'a verifier recomputes challenged puzzles, never solves them',
  )
})

test('soundness error is a published number', () => {
  assert.ok(soundnessBits(PROFILE) > 0)
  assert.ok(
    soundnessBits({ n: 120, k: 31, o: 30 }) > soundnessBits(PROFILE),
    'more instances, better soundness',
  )
})

test('verification refuses a proof with a duplicate opened index', () => {
  const { params, proof, expectations } = fixture()
  const duplicated = {
    ...proof,
    opened: proof.opened.map((x, i) => (i === 0 ? { ...proof.opened[1] } : x)),
  }
  assert.notEqual(verifyVtd(params, duplicated, expectations), null)
})

test('soundness matches the published formula: n=4,k=2,o=1 gives exactly 1 bit', () => {
  assert.ok(Math.abs(soundnessBits({ n: 4, k: 2, o: 1 }) - 1) < 1e-9)
})

test('soundnessBits never returns Infinity, even at degenerate profiles', () => {
  assert.ok(Number.isFinite(soundnessBits({ n: 10, k: 9, o: 8 })))
  assert.ok(Number.isFinite(soundnessBits({ n: 4, k: 2, o: 1 })))
})

test('proveVtd refuses to build a proof when k*q^2 would not fit the modulus', () => {
  const { params } = setupParams(256, 64)
  assert.throws(() => proveVtd(params, 42n, PROFILE), /overflow/i)
})

test('verification refuses when k*q^2 would not fit the modulus', () => {
  const { proof, expectations } = fixture()
  const { params: unsafeParams } = setupParams(256, 64)
  const reason = verifyVtd(unsafeParams, proof, expectations)
  assert.match(String(reason), /overflow/i)
})

test('solveVtd independently refuses to fold when k*q^2 would not fit the modulus', async () => {
  const { proof } = fixture()
  const { params: unsafeParams } = setupParams(256, 64)
  await assert.rejects(() => solveVtd(unsafeParams, proof), /overflow/i)
})

test('coefficientsDeriveFromSecret accepts an honestly bound proof', () => {
  const { proof } = fixture()
  assert.equal(coefficientsDeriveFromSecret(SECRET, proof), null)
})

test('coefficientsDeriveFromSecret refuses independently sampled coefficients', () => {
  const { params } = setupParams(320, 64)
  const proof = proveVtd(params, SECRET, PROFILE)
  const commitments = commitPoly(randomPoly(SECRET, PROFILE.k))
  const reason = coefficientsDeriveFromSecret(SECRET, { ...proof, commitments })
  assert.notEqual(reason, null)
})

test('coefficientsDeriveFromSecret returns a reason, never throws, on an out-of-range secret', () => {
  const { proof } = fixture()
  const order = bls12_381.fields.Fr.ORDER
  for (const bad of [0n, -1n, order, order + 1n]) {
    assert.doesNotThrow(() => coefficientsDeriveFromSecret(bad, proof))
    assert.notEqual(coefficientsDeriveFromSecret(bad, proof), null)
  }
})

test('coefficientsDeriveFromSecret refuses a forged oversized k before deriving anything', () => {
  const commitments = { a: [new Uint8Array(48)] }
  for (const k of [10_000, 50_000, 1_000_000_000]) {
    const witness = {
      profile: { n: 24, k, o: 6 },
      nonce: randomNonce(),
      commitments,
    }
    const t0 = performance.now()
    const reason = coefficientsDeriveFromSecret(SECRET, witness)
    const elapsedMs = performance.now() - t0
    assert.match(String(reason), /commitment count/i)
    assert.ok(
      elapsedMs < 50,
      `k=${k} must cost nothing: a 92-byte witness bought ${elapsedMs.toFixed(1)}ms of derivation`,
    )
  }
})

test('both predicates refuse a wrong-length nonce', () => {
  const { params, proof, expectations } = fixture()
  for (const length of [0, 1, 31, 64]) {
    const nonce = new Uint8Array(length).fill(9)
    const tampered = { ...proof, nonce }
    assert.match(String(verifyVtd(params, tampered, expectations)), /nonce/i)
    assert.match(
      String(coefficientsDeriveFromSecret(SECRET, tampered)),
      /nonce/i,
    )
  }
})

test('both predicates refuse an all-zero nonce, the unfilled-buffer producer bug', () => {
  const { params, proof, expectations } = fixture()
  const tampered = { ...proof, nonce: new Uint8Array(32) }
  assert.match(String(verifyVtd(params, tampered, expectations)), /nonce/i)
  assert.match(String(coefficientsDeriveFromSecret(SECRET, tampered)), /nonce/i)
})

test('two proofs of the same secret do not let their opened shares pool into a reconstruction', () => {
  const { params } = setupParams(320, 64)
  const proof1 = proveVtd(params, SECRET, PROFILE)
  const proof2 = proveVtd(params, SECRET, PROFILE)
  assert.ok(!bytesEqual(proof1.nonce, proof2.nonce), 'fresh nonces must differ')
  assert.ok(
    !bytesEqual(proof1.commitments.a[1], proof2.commitments.a[1]),
    'nonce-bound coefficients must differ between proofs of the same secret',
  )
  const pooledByIndex = new Map<number, bigint>()
  for (const entry of [...proof1.opened, ...proof2.opened]) {
    if (!pooledByIndex.has(entry.index))
      pooledByIndex.set(entry.index, entry.share)
  }
  const pooled = [...pooledByIndex.entries()].map(([index, value]) => ({
    index,
    value,
  }))
  assert.ok(
    pooled.length >= PROFILE.k,
    'the union must reach the threshold for the historical attack to even apply',
  )
  assert.notEqual(reconstruct(pooled.slice(0, PROFILE.k)), SECRET)
})

test('solveVtd advances past a throwing unopened puzzle instead of aborting', async () => {
  const { params } = setupParams(320, 64)
  const corruptIndex = 1
  const proof = buildProofAvoidingIndices(params, {
    secret: SECRET,
    profile: PROFILE,
    avoidIndices: [corruptIndex],
    puzzleOverride: (index) =>
      index === corruptIndex ? { u: 0n, v: 0n } : undefined,
  })
  const expectations = { hS: scalarCommitment(SECRET), profile: PROFILE }
  assert.equal(verifyVtd(params, proof, expectations), null)
  assert.equal(await solveVtd(params, proof), SECRET)
})

test('solveVtd opens a proof despite several corrupted unopened puzzles', async () => {
  const { params } = setupParams(320, 64)
  const corruptIndices = [1, 2, 3]
  const proof = buildProofAvoidingIndices(params, {
    secret: SECRET,
    profile: PROFILE,
    avoidIndices: corruptIndices,
    puzzleOverride: (index, value, blinding) => {
      if (index === 1) return { u: 0n, v: 0n }
      if (corruptIndices.includes(index)) {
        return createPuzzle(params, value + 1000n, blinding)
      }
      return undefined
    },
  })
  const expectations = { hS: scalarCommitment(SECRET), profile: PROFILE }
  assert.equal(verifyVtd(params, proof, expectations), null)
  assert.equal(await solveVtd(params, proof), SECRET)
})

test('progress is monotonic across the stage-1 to stage-2 handoff', async () => {
  const { params } = setupParams(320, 20000)
  const corruptIndex = 1
  const proof = buildProofAvoidingIndices(params, {
    secret: SECRET,
    profile: PROFILE,
    avoidIndices: [corruptIndex],
    puzzleOverride: (index) =>
      index === corruptIndex ? { u: 0n, v: 0n } : undefined,
  })
  const reports: number[] = []
  await solveVtd(params, proof, (done) => reports.push(done))
  assert.ok(
    reports.length > 0,
    'progress should have been reported at least once',
  )
  for (let i = 1; i < reports.length; i++) {
    assert.ok(
      reports[i] >= reports[i - 1],
      `progress went backwards: ${reports[i - 1]} then ${reports[i]}`,
    )
  }
})

test('worstCaseSolves counts one fast-path solve plus every unopened share, and is not the soundnessBits probability', () => {
  assert.equal(worstCaseSolves(PROFILE), PROFILE.n - PROFILE.o + 1)
  assert.equal(worstCaseSolves({ n: 130, k: 27, o: 26 }), 105)
})

test('verification refuses an oversized published blinding', () => {
  const { params, proof, expectations } = fixture()
  const bad = {
    ...proof,
    opened: proof.opened.map((x, i) =>
      i === 0 ? { ...x, blinding: params.n } : x,
    ),
  }
  assert.notEqual(verifyVtd(params, bad, expectations), null)
})

test('verification stays cheap even when a published blinding is astronomically large', () => {
  const { params, proof, expectations } = fixture()
  const bad = {
    ...proof,
    opened: proof.opened.map((x, i) =>
      i === 0 ? { ...x, blinding: 2n ** 200000n } : x,
    ),
  }
  const t0 = performance.now()
  assert.notEqual(verifyVtd(params, bad, expectations), null)
  assert.ok(
    performance.now() - t0 < 2000,
    'the range guard rejects before any expensive modPow',
  )
})

test('verification cost does not depend on t: a verifier never pays the delay', async () => {
  const smallT = 20000
  const bigT = 200000
  const { params: paramsSmallT } = setupParams(1024, smallT)
  const { params: paramsBigT } = setupParams(1024, bigT)
  const proofSmallT = proveVtd(paramsSmallT, SECRET, PROFILE)
  const proofBigT = proveVtd(paramsBigT, SECRET, PROFILE)
  const expectations: VtdExpectations = {
    hS: scalarCommitment(SECRET),
    profile: PROFILE,
  }

  const verifyStart1 = performance.now()
  assert.equal(verifyVtd(paramsSmallT, proofSmallT, expectations), null)
  const verifySmallTMs = performance.now() - verifyStart1

  const verifyStart2 = performance.now()
  assert.equal(verifyVtd(paramsBigT, proofBigT, expectations), null)
  const verifyBigTMs = performance.now() - verifyStart2

  const solveStart1 = performance.now()
  await solveVtd(paramsSmallT, proofSmallT)
  const solveSmallTMs = performance.now() - solveStart1

  const solveStart2 = performance.now()
  await solveVtd(paramsBigT, proofBigT)
  const solveBigTMs = performance.now() - solveStart2

  assert.ok(
    solveBigTMs > solveSmallTMs * 3,
    `solving must scale with t: ${solveSmallTMs}ms at t=${smallT} vs ${solveBigTMs}ms at t=${bigT}`,
  )
  assert.ok(
    verifyBigTMs - verifySmallTMs < (solveBigTMs - solveSmallTMs) / 10,
    `verify must not track t's delay: verify delta ${(verifyBigTMs - verifySmallTMs).toFixed(1)}ms against a solve delta of ${(solveBigTMs - solveSmallTMs).toFixed(1)}ms`,
  )
})
