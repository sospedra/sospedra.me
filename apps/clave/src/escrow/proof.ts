// The verifiable escrow proof. Paper Section 3.6 and Equations 8 to 12.
//
// Proves to a verifier that n published ciphertexts encrypt shares of a secret
// committed by hS, and that the secret is recoverable at threshold k, without
// revealing the secret.
//
// Everything here is a direct transcription of the paper. Where a line
// implements a numbered equation, the comment says which one, so a reviewer can
// check the code against the text rather than against its own comments.

import { bls12_381 } from '@noble/curves/bls12-381.js'
import {
  bytesEqual,
  bytesToBigInt,
  concatBytes,
  randomBytes,
  u32be,
  utf8,
} from '../core/bytes.ts'
import { sha256 } from '../core/hash.ts'
import {
  type AccountKey,
  type Ciphertext,
  decrypt,
  encrypt,
} from '../core/ibe.ts'
import {
  commitmentFor,
  commitPoly,
  type FeldmanCommitments,
  lagrangeCoefficients,
  randomPoly,
  scalarCommitment,
  shareAt,
} from '../core/shamir.ts'

const Fr = bls12_381.fields.Fr

export type Profile = {
  readonly n: number
  readonly k: number
  readonly o: number
}

// Paper Table 1, last row.
export const REFERENCE_PROFILE: Profile = { n: 130, k: 27, o: 26 }

export type Opening = {
  readonly index: number
  readonly share: bigint
  readonly coins: Uint8Array
}

export type EscrowProof = {
  readonly profile: Profile
  readonly accountId: string
  readonly hS: Uint8Array
  readonly commitments: FeldmanCommitments
  readonly ciphertexts: readonly Ciphertext[]
  readonly openings: readonly Opening[]
}

// Equation 2: b = n - o - k + 1.
export function corruptionFloor(p: Profile): number {
  return p.n - p.o - p.k + 1
}

function logBinomial(n: number, k: number): number {
  if (k < 0 || k > n) return Number.NEGATIVE_INFINITY
  let acc = 0
  for (let i = 0; i < k; i++) acc += Math.log2(n - i) - Math.log2(i + 1)
  return acc
}

// Equation 4: lambda = log2 C(n,o) - log2 C(n-b,o).
export function soundnessBits(p: Profile): number {
  const b = corruptionFloor(p)
  return logBinomial(p.n, p.o) - logBinomial(p.n - b, p.o)
}

// Equation 3: Pr[pass] = C(n-b,o) / C(n,o).
export function passProbability(p: Profile, b: number): number {
  return 2 ** (logBinomial(p.n - b, p.o) - logBinomial(p.n, p.o))
}

export function worstCaseDecryptions(p: Profile): number {
  return p.n - p.o + 1
}

function profileFault(p: Profile): string | null {
  if (!Number.isSafeInteger(p.n) || p.n < 2) return 'n must be at least 2'
  if (!Number.isSafeInteger(p.k) || p.k < 1) return 'k must be at least 1'
  if (!Number.isSafeInteger(p.o) || p.o < 1) return 'o must be at least 1'
  if (p.o >= p.k) return 'o must be below k, or the openings leak the secret'
  if (p.n - p.o < p.k) return 'unopened shares must still reach the threshold'
  return null
}

// Equation 9. Hashes the COMPLETE statement, then selects o distinct indices.
// The openings cannot influence this, because none exist yet when it runs.
function selectIndices(
  accountId: string,
  hS: Uint8Array,
  commitments: FeldmanCommitments,
  ciphertexts: readonly Ciphertext[],
  p: Profile,
): number[] {
  const statement = concatBytes(
    utf8('CLAVE/escrow-challenge/v1'),
    utf8(accountId),
    hS,
    ...commitments.a,
    ...ciphertexts.flatMap((c) => [c.u, c.v]),
    u32be(p.n),
    u32be(p.k),
    u32be(p.o),
  )
  const chosen: number[] = []
  const seen = new Set<number>()
  for (let counter = 0; chosen.length < p.o; counter++) {
    const digest = sha256(concatBytes(statement, u32be(counter)))
    const index = Number(bytesToBigInt(digest.subarray(0, 8)) % BigInt(p.n)) + 1
    if (seen.has(index)) continue
    seen.add(index)
    chosen.push(index)
  }
  return chosen.sort((a, b) => a - b)
}

function coinsFor(seed: Uint8Array, index: number): Uint8Array {
  return sha256(concatBytes(utf8('CLAVE/escrow-coins/v1'), seed, u32be(index)))
}

function shareBytes(value: bigint): Uint8Array {
  const out = new Uint8Array(32)
  let v = value
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(v & 0xffn)
    v >>= 8n
  }
  return out
}

export function prove(
  mpk: Uint8Array,
  accountId: string,
  secret: bigint,
  profile: Profile = REFERENCE_PROFILE,
): EscrowProof {
  const fault = profileFault(profile)
  if (fault) throw new Error(`refused: ${fault}`)

  // A FRESH polynomial every call. Reusing one across attempts lets the opened
  // subsets accumulate across retries and cross the threshold. Paper Section 6,
  // decision 6.
  const poly = randomPoly(secret, profile.k)
  const commitments = commitPoly(poly)
  const hS = scalarCommitment(secret)

  const seed = randomBytes(32)
  const shares = Array.from({ length: profile.n }, (_, i) =>
    shareAt(poly, i + 1),
  )
  const ciphertexts = shares.map((share) =>
    encrypt(
      mpk,
      accountId,
      shareBytes(share.value),
      coinsFor(seed, share.index),
    ),
  )

  const selected = selectIndices(
    accountId,
    hS,
    commitments,
    ciphertexts,
    profile,
  )
  const openings = selected.map((index) => ({
    index,
    share: shares[index - 1]?.value ?? 0n,
    coins: coinsFor(seed, index),
  }))

  return { profile, accountId, hS, commitments, ciphertexts, openings }
}

// One opened index. Extracted so verify() stays inside the complexity budget
// and so each equation has a place a reviewer can point at.
function checkOpening(
  mpk: Uint8Array,
  proof: EscrowProof,
  opening: Opening,
): string | null {
  const { index } = opening
  if (index < 1 || index > proof.profile.n) return 'opening index out of range'

  // Equation 10: the share lies on the committed polynomial.
  const onPolynomial = commitmentFor(proof.commitments, index)
  if (!bytesEqual(scalarCommitment(opening.share), onPolynomial)) {
    return `opening ${index} does not match its Feldman commitment`
  }

  // Equation 11: the published bytes ARE the encryption of that share under
  // the revealed coins. Omitting this is the failure the paper calls most
  // likely, because Equation 10 looks sufficient on its own and is not.
  const recomputed = encrypt(
    mpk,
    proof.accountId,
    shareBytes(opening.share),
    opening.coins,
  )
  const published = proof.ciphertexts[index - 1]
  if (!published) return `opening ${index} has no published ciphertext`
  if (
    !bytesEqual(recomputed.u, published.u) ||
    !bytesEqual(recomputed.v, published.v)
  ) {
    return `opening ${index} does not recompute the published ciphertext`
  }
  return null
}

function checkShape(proof: EscrowProof, expectedHS: Uint8Array): string | null {
  const p = proof.profile
  const fault = profileFault(p)
  if (fault) return `refused: ${fault}`
  if (proof.ciphertexts.length !== p.n) return 'wrong ciphertext count'
  if (proof.openings.length !== p.o) return 'wrong opening count'
  if (proof.commitments.a.length !== p.k) return 'wrong commitment count'

  // The join back to the enrollment relation. Paper Section 3.6: C_0 = hS.
  const c0 = proof.commitments.a[0]
  if (!c0 || !bytesEqual(c0, proof.hS)) {
    return 'commitment zero is not the published hS'
  }
  if (!bytesEqual(proof.hS, expectedHS)) {
    return 'hS does not match the value the credential proof committed to'
  }
  return null
}

function checkChallenge(proof: EscrowProof): string | null {
  const expected = selectIndices(
    proof.accountId,
    proof.hS,
    proof.commitments,
    proof.ciphertexts,
    proof.profile,
  )
  const got = proof.openings.map((o) => o.index)
  if (expected.length !== got.length) return 'opening set size mismatch'
  const same = expected.every((index, i) => index === got[i])
  return same ? null : 'openings do not match the challenge'
}

export function verify(
  mpk: Uint8Array,
  proof: EscrowProof,
  expectedHS: Uint8Array,
): string | null {
  const shape = checkShape(proof, expectedHS)
  if (shape) return shape

  // Recompute the challenge before looking at any opening, so a prover cannot
  // choose which indices it reveals. Equation 9.
  const challenge = checkChallenge(proof)
  if (challenge) return challenge

  for (const opening of proof.openings) {
    const fault = checkOpening(mpk, proof, opening)
    if (fault) return fault
  }
  return null
}

export type RecoveryResult =
  | { readonly ok: true; readonly secret: bigint; readonly decryptions: number }
  | {
      readonly ok: false
      readonly reason: string
      readonly decryptions: number
    }

// Equation 12. Decrypt candidates, discard failures, check EVERY result against
// the commitments, collect any k, interpolate, and verify against hS. Taking
// the first k decryptions without checking is unsafe, because cut-and-choose
// never promises that every unopened ciphertext is well formed.
// Decrypt one unopened index and return its share only if it is consistent
// with the published commitments. Returns null for every other outcome, which
// is what lets recovery walk past corrupted ciphertexts.
function candidateAt(
  key: AccountKey,
  proof: EscrowProof,
  index: number,
): bigint | null {
  const ciphertext = proof.ciphertexts[index - 1]
  if (!ciphertext) return null
  const plain = decrypt(key, ciphertext)
  if (plain === null || plain.length !== 32) return null
  const value = Fr.create(bytesToBigInt(plain))
  if (value === 0n) return null
  const onPolynomial = commitmentFor(proof.commitments, index)
  if (!bytesEqual(scalarCommitment(value), onPolynomial)) return null
  return value
}

// Equation 12. Decrypt candidates, discard failures, check EVERY result against
// the commitments, collect any k, interpolate, and verify against hS. Taking
// the first k decryptions without checking is unsafe, because cut-and-choose
// never promises that every unopened ciphertext is well formed.
export function recover(key: AccountKey, proof: EscrowProof): RecoveryResult {
  const opened = new Set(proof.openings.map((o) => o.index))
  const good: { index: number; value: bigint }[] = []
  let decryptions = 0

  for (let index = 1; index <= proof.profile.n; index++) {
    if (good.length >= proof.profile.k) break
    if (opened.has(index)) continue
    decryptions++
    const value = candidateAt(key, proof, index)
    if (value !== null) good.push({ index, value })
  }

  if (good.length < proof.profile.k) {
    return { ok: false, reason: 'not enough consistent shares', decryptions }
  }

  const weights = lagrangeCoefficients(good.map((g) => g.index))
  const secret = good.reduce(
    (acc, g, i) => Fr.add(acc, Fr.mul(g.value, weights[i] ?? 0n)),
    Fr.ZERO,
  )

  if (!bytesEqual(scalarCommitment(secret), proof.hS)) {
    return {
      ok: false,
      reason: 'reconstructed secret does not match hS',
      decryptions,
    }
  }
  return { ok: true, secret, decryptions }
}
