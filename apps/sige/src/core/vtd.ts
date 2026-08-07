import { bls12_381 } from '@noble/curves/bls12-381.js'
import { hkdf } from '@noble/hashes/hkdf.js'
import { sha256 } from '@noble/hashes/sha2.js'
import {
  bigIntToBytes,
  bytesEqual,
  bytesToBigInt,
  concatBytes,
  randomBytes,
  u32be,
  utf8,
} from './bytes.ts'
import { dhash } from './hash.ts'
import {
  addPuzzles,
  createPuzzle,
  type LhtlpParams,
  type LhtlpPuzzle,
  randomBlinding,
  scalePuzzle,
  solvePuzzle,
} from './lhtlp.ts'
import {
  commitmentFor,
  commitmentForCombination,
  commitPoly,
  type FeldmanCommitments,
  lagrangeCoefficients,
  type Poly,
  reconstruct,
  type Share,
  shareAt,
} from './shamir.ts'

const G1 = bls12_381.G1.Point
const Fr = bls12_381.fields.Fr
const IDENTITY = G1.ZERO.toBytes(true)

export type VtdProfile = { n: number; k: number; o: number }
export type VtdOpened = { index: number; share: bigint; blinding: bigint }
export type VtdProof = {
  profile: VtdProfile
  nonce: Uint8Array
  commitments: FeldmanCommitments
  puzzles: LhtlpPuzzle[]
  opened: VtdOpened[]
}
export type VtdExpectations = { hS: Uint8Array; profile: VtdProfile }

type ProofTranscript = Pick<
  VtdProof,
  'profile' | 'nonce' | 'commitments' | 'puzzles'
>
type WitnessedProof = Pick<VtdProof, 'profile' | 'nonce' | 'commitments'>

const NONCE_BYTES = 32

function oneToN(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i + 1)
}

// Fold sums k products of two sub-q Fr elements; unchecked, a sum >= n wraps
// mod n silently (addPuzzles/scalePuzzle cannot see the hidden plaintext).
function foldOverflowsModulus(
  params: LhtlpParams,
  profile: VtdProfile,
): boolean {
  return BigInt(profile.k) * Fr.ORDER * Fr.ORDER >= params.n
}

const FOLD_OVERFLOW_REASON =
  'profile k is too large for this modulus: the homomorphic fold could overflow n'

function assertFoldFitsModulus(params: LhtlpParams, profile: VtdProfile): void {
  if (foldOverflowsModulus(params, profile))
    throw new Error(FOLD_OVERFLOW_REASON)
}

function checkFoldBound(
  params: LhtlpParams,
  profile: VtdProfile,
): string | null {
  return foldOverflowsModulus(params, profile) ? FOLD_OVERFLOW_REASON : null
}

function encodeParams(params: LhtlpParams): Uint8Array[] {
  return [
    bigIntToBytes(params.n),
    bigIntToBytes(params.nSquared),
    u32be(params.t),
    bigIntToBytes(params.g),
    bigIntToBytes(params.h),
  ]
}

function encodePuzzles(puzzles: LhtlpPuzzle[]): Uint8Array[] {
  return puzzles.flatMap((p) => [bigIntToBytes(p.u), bigIntToBytes(p.v)])
}

export function internalDeriveIndexChallenge(
  params: LhtlpParams,
  transcript: ProofTranscript,
): Uint8Array {
  const { commitments, puzzles, profile, nonce } = transcript
  return dhash(
    'sige-vtd/index',
    ...encodeParams(params),
    nonce,
    ...commitments.a,
    ...encodePuzzles(puzzles),
    u32be(profile.n),
    u32be(profile.k),
    u32be(profile.o),
  )
}

function drawIndex(seed: Uint8Array, counter: number, n: number): number {
  const digest = dhash('sige-vtd/index-expand', seed, u32be(counter))
  return Number(bytesToBigInt(digest) % BigInt(n)) + 1
}

export function internalDeriveIndexSet(
  seed: Uint8Array,
  n: number,
  o: number,
): number[] {
  const maxAttempts = Math.max(1000, n * 20)
  const selected = new Set<number>()
  for (let counter = 0; counter < maxAttempts; counter++) {
    if (selected.size >= o) break
    selected.add(drawIndex(seed, counter, n))
  }
  if (selected.size < o) {
    throw new Error('challenge did not yield enough distinct indices')
  }
  return [...selected].toSorted((a, b) => a - b)
}

function checkNonce(nonce: Uint8Array): string | null {
  if (nonce.length !== NONCE_BYTES) {
    return `nonce must be exactly ${NONCE_BYTES} bytes`
  }
  if (nonce.every((b) => b === 0)) return 'nonce must not be all zero bytes'
  return null
}

function checkProfileBounds(profile: VtdProfile): string | null {
  if (profile.k < 1 || profile.n < 1 || profile.o < 1) {
    return 'profile fields must be positive, with at least one opened share'
  }
  if (profile.o > profile.k - 1) {
    return 'opened count exceeds the reconstruction threshold'
  }
  if (profile.n - profile.o < profile.k) {
    return 'not enough unopened shares remain to fold'
  }
  return null
}

function checkCommitmentCount(proof: WitnessedProof): string | null {
  return proof.commitments.a.length === proof.profile.k
    ? null
    : 'commitment count does not match the threshold'
}

function checkProofShape(proof: VtdProof): string | null {
  const { profile, puzzles, opened } = proof
  if (puzzles.length !== profile.n) {
    return 'puzzle count does not match the share count'
  }
  if (opened.length !== profile.o) {
    return 'opened count does not match the profile'
  }
  if (new Set(opened.map((x) => x.index)).size !== opened.length) {
    return 'opened indices contain a duplicate'
  }
  return null
}

function checkStructure(proof: VtdProof): string | null {
  return (
    checkProfileBounds(proof.profile) ??
    checkCommitmentCount(proof) ??
    checkProofShape(proof)
  )
}

function deriveCoefficient(
  secret: bigint,
  nonce: Uint8Array,
  j: number,
): bigint {
  const maxAttempts = 100
  for (let counter = 0; counter < maxAttempts; counter++) {
    const info = concatBytes(
      utf8('sige-vtd/coefficient'),
      nonce,
      u32be(j),
      u32be(counter),
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
  throw new Error('coefficient derivation did not yield a nonzero value')
}

function deriveBoundPoly(secret: bigint, nonce: Uint8Array, k: number): Poly {
  const tail = Array.from({ length: k - 1 }, (_, i) =>
    deriveCoefficient(secret, nonce, i + 1),
  )
  return { coefficients: [secret, ...tail] }
}

function checkSecretRange(secret: bigint): string | null {
  return secret > 0n && secret < Fr.ORDER
    ? null
    : 'secret is out of range for the scalar field'
}

function coefficientsDeriveFromSecretChecks(
  secret: bigint,
  proof: WitnessedProof,
): string | null {
  const boundaryIssue =
    checkSecretRange(secret) ??
    checkNonce(proof.nonce) ??
    checkCommitmentCount(proof)
  if (boundaryIssue) return boundaryIssue
  const expected = commitPoly(
    deriveBoundPoly(secret, proof.nonce, proof.profile.k),
  )
  const matches =
    expected.a.length === proof.commitments.a.length &&
    expected.a.every((c, i) => bytesEqual(c, proof.commitments.a[i]))
  return matches ? null : 'commitments do not derive from the secret'
}

export function coefficientsDeriveFromSecret(
  secret: bigint,
  proof: WitnessedProof,
): string | null {
  try {
    return coefficientsDeriveFromSecretChecks(secret, proof)
  } catch (error) {
    return `witness is malformed: ${error instanceof Error ? error.message : String(error)}`
  }
}

export function proveVtd(
  params: LhtlpParams,
  secret: bigint,
  profile: VtdProfile,
): VtdProof {
  const boundsIssue = checkProfileBounds(profile)
  if (boundsIssue) throw new Error(boundsIssue)
  assertFoldFitsModulus(params, profile)
  const nonce = randomBytes(NONCE_BYTES)
  const poly = deriveBoundPoly(secret, nonce, profile.k)
  const commitments = commitPoly(poly)
  const indices = oneToN(profile.n)
  const shares = indices.map((i) => shareAt(poly, i))
  const blindings = indices.map(() => randomBlinding(params))
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
  const opened = openedIndices.map((i) => ({
    index: i,
    share: shares[i - 1].value,
    blinding: blindings[i - 1],
  }))
  return { profile, nonce, commitments, puzzles, opened }
}

function checkCommitment(proof: VtdProof, hS: Uint8Array): string | null {
  return bytesEqual(proof.commitments.a[0], hS)
    ? null
    : 'the polynomial constant-term commitment does not match the published H_s'
}

function checkOpenedIndices(
  proof: VtdProof,
  challenge: Uint8Array,
): string | null {
  const expected = internalDeriveIndexSet(
    challenge,
    proof.profile.n,
    proof.profile.o,
  )
  const actual = proof.opened.map((x) => x.index).toSorted((a, b) => a - b)
  const matches =
    expected.length === actual.length &&
    expected.every((v, i) => v === actual[i])
  return matches
    ? null
    : 'opened indices do not match the derived challenge set'
}

function recomputesPuzzle(
  params: LhtlpParams,
  entry: VtdOpened,
  published: LhtlpPuzzle,
): boolean {
  const outOfRange =
    entry.share < 0n ||
    entry.share >= params.n ||
    entry.blinding < 0n ||
    entry.blinding >= params.n
  if (outOfRange) return false
  const recomputed = createPuzzle(params, entry.share, entry.blinding)
  return recomputed.u === published.u && recomputed.v === published.v
}

function checkPuzzleRecomputation(
  params: LhtlpParams,
  proof: VtdProof,
): string | null {
  const bad = proof.opened.find(
    (entry) => !recomputesPuzzle(params, entry, proof.puzzles[entry.index - 1]),
  )
  return bad
    ? `opened index ${bad.index} does not recompute its published puzzle`
    : null
}

function drawWeight(seed: Uint8Array, counter: number): bigint {
  const digest = dhash('sige-vtd/weights-expand', seed, u32be(counter))
  const value = Fr.create(bytesToBigInt(digest))
  return value === 0n ? Fr.ONE : value
}

function deriveWeights(seed: Uint8Array, count: number): bigint[] {
  return Array.from({ length: count }, (_, i) => drawWeight(seed, i))
}

// Weights must derive from a transcript that includes the revealed shares:
// from the index challenge alone, a forged reveal would pass the batched check.
function deriveWeightsChallenge(
  challenge: Uint8Array,
  opened: VtdOpened[],
): Uint8Array {
  const sorted = opened.toSorted((a, b) => a.index - b.index)
  const parts = sorted.flatMap((entry) => [
    u32be(entry.index),
    bigIntToBytes(entry.share),
    bigIntToBytes(entry.blinding),
  ])
  return dhash('sige-vtd/weights', challenge, ...parts)
}

function basePointCommitment(scalar: bigint): Uint8Array {
  return scalar === 0n ? IDENTITY : G1.BASE.multiply(scalar).toBytes(true)
}

function checkBatchedFeldman(
  proof: VtdProof,
  challenge: Uint8Array,
): string | null {
  const weightsChallenge = deriveWeightsChallenge(challenge, proof.opened)
  const sorted = proof.opened.toSorted((a, b) => a.index - b.index)
  const weights = deriveWeights(weightsChallenge, sorted.length)
  const lhsScalar = sorted.reduce(
    (acc, entry, i) => Fr.add(acc, Fr.mul(weights[i], Fr.create(entry.share))),
    Fr.ZERO,
  )
  const lhs = basePointCommitment(lhsScalar)
  const rhs = commitmentForCombination(
    proof.commitments,
    sorted.map((x) => x.index),
    weights,
  )
  return bytesEqual(lhs, rhs)
    ? null
    : 'batched Feldman check failed for the opened shares'
}

function profilesMatch(a: VtdProfile, b: VtdProfile): boolean {
  return a.n === b.n && a.k === b.k && a.o === b.o
}

function checkExpectedProfile(
  proof: VtdProof,
  expected: VtdProfile,
): string | null {
  return profilesMatch(proof.profile, expected)
    ? null
    : 'proof profile does not match the expected profile'
}

function verifyVtdChecks(
  params: LhtlpParams,
  proof: VtdProof,
  expectations: VtdExpectations,
): string | null {
  const structuralIssue =
    checkExpectedProfile(proof, expectations.profile) ??
    checkNonce(proof.nonce) ??
    checkStructure(proof) ??
    checkCommitment(proof, expectations.hS) ??
    checkFoldBound(params, proof.profile)
  if (structuralIssue) return structuralIssue
  const challenge = internalDeriveIndexChallenge(params, proof)
  return (
    checkOpenedIndices(proof, challenge) ??
    checkPuzzleRecomputation(params, proof) ??
    checkBatchedFeldman(proof, challenge)
  )
}

export function verifyVtd(
  params: LhtlpParams,
  proof: VtdProof,
  expectations: VtdExpectations,
): string | null {
  try {
    return verifyVtdChecks(params, proof, expectations)
  } catch (error) {
    return `proof is malformed: ${error instanceof Error ? error.message : String(error)}`
  }
}

function unopenedIndices(proof: VtdProof): number[] {
  const opened = new Set(proof.opened.map((x) => x.index))
  return oneToN(proof.profile.n).filter((i) => !opened.has(i))
}

function foldSubset(
  params: LhtlpParams,
  proof: VtdProof,
  subset: number[],
): LhtlpPuzzle {
  const lambdas = lagrangeCoefficients(subset)
  const scaled = subset.map((index, i) =>
    scalePuzzle(params, proof.puzzles[index - 1], lambdas[i]),
  )
  return scaled.reduce((acc, p) => addPuzzles(params, acc, p))
}

type SolveContext = {
  params: LhtlpParams
  proof: VtdProof
  onProgress?: (done: number, total: number) => void
}

function matchesRoot(ctx: SolveContext, secret: bigint): boolean {
  return bytesEqual(basePointCommitment(secret), ctx.proof.commitments.a[0])
}

function isMalformedPuzzleError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return (
    error.message.includes('is not a unit mod n') ||
    error.message.includes('does not decode to a scalar')
  )
}

async function tryFastPath(
  ctx: SolveContext,
  subset: number[],
): Promise<bigint | null> {
  try {
    const folded = foldSubset(ctx.params, ctx.proof, subset)
    const value = await solvePuzzle(ctx.params, folded, ctx.onProgress)
    const secret = Fr.create(value)
    return matchesRoot(ctx, secret) ? secret : null
  } catch (error) {
    if (isMalformedPuzzleError(error)) return null
    throw error
  }
}

async function recoverVerifiedShare(
  ctx: SolveContext,
  index: number,
): Promise<Share | null> {
  try {
    const puzzle = ctx.proof.puzzles[index - 1]
    const value = await solvePuzzle(ctx.params, puzzle, ctx.onProgress)
    const share = Fr.create(value)
    const verified = bytesEqual(
      commitmentFor(ctx.proof.commitments, index),
      basePointCommitment(share),
    )
    return verified ? { index, value: share } : null
  } catch (error) {
    if (isMalformedPuzzleError(error)) return null
    throw error
  }
}

function scopedProgress(
  ctx: SolveContext,
  slotIndex: number,
  totalSlots: number,
): ((done: number, total: number) => void) | undefined {
  const { onProgress, params } = ctx
  if (!onProgress) return undefined
  const total = totalSlots * params.t
  return (done: number) => onProgress(slotIndex * params.t + done, total)
}

async function solveByIndividualVerification(
  ctx: SolveContext,
  unopened: number[],
  totalSlots: number,
): Promise<bigint> {
  const verified: Share[] = []
  for (let i = 0; i < unopened.length; i++) {
    const puzzleCtx = {
      ...ctx,
      onProgress: scopedProgress(ctx, i + 1, totalSlots),
    }
    const share = await recoverVerifiedShare(puzzleCtx, unopened[i])
    if (share) verified.push(share)
  }
  if (verified.length < ctx.proof.profile.k) {
    throw new Error(
      'fewer than k unopened shares are Feldman-verified: no valid opening exists',
    )
  }
  const secret = reconstruct(verified.slice(0, ctx.proof.profile.k))
  if (!matchesRoot(ctx, secret)) {
    throw new Error(
      'reconstruction from verified shares did not match the published commitment',
    )
  }
  return secret
}

export async function solveVtd(
  params: LhtlpParams,
  proof: VtdProof,
  onProgress?: (done: number, total: number) => void,
): Promise<bigint> {
  assertFoldFitsModulus(params, proof.profile)
  const unopened = unopenedIndices(proof)
  const totalSlots = unopened.length + 1
  const ctx: SolveContext = { params, proof, onProgress }
  const fastPathCtx = { ...ctx, onProgress: scopedProgress(ctx, 0, totalSlots) }
  const fastPath = await tryFastPath(
    fastPathCtx,
    unopened.slice(0, proof.profile.k),
  )
  if (fastPath !== null) return fastPath
  return solveByIndividualVerification(ctx, unopened, totalSlots)
}

function logFactorial(m: number): number {
  let sum = 0
  for (let i = 2; i <= m; i++) sum += Math.log(i)
  return sum
}

function logChoose(n: number, k: number): number {
  return logFactorial(n) - logFactorial(k) - logFactorial(n - k)
}

// b=n-o-k+1 bad unopened shares escape the o-sized opening with chance
// C(n-b,o)/C(n,o); the two-stage solver (worstCaseSolves) achieves this bound.
export function soundnessBits(profile: VtdProfile): number {
  const { n, k, o } = profile
  const b = n - o - k + 1
  if (b <= 0) return 0
  const bits = (logChoose(n, o) - logChoose(n - b, o)) / Math.LN2
  return Number.isFinite(bits) ? Math.max(0, bits) : 0
}

export function worstCaseSolves(profile: VtdProfile): number {
  return profile.n - profile.o + 1
}
