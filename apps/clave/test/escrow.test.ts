import assert from 'node:assert/strict'
import { test } from 'node:test'

import { bls12_381 } from '@noble/curves/bls12-381.js'

import { bytesToBigInt, randomBytes, toHex } from '../src/core/bytes.ts'
import { derive, setup } from '../src/core/ibe.ts'
import { scalarCommitment } from '../src/core/shamir.ts'
import {
  corruptionFloor,
  passProbability,
  prove,
  REFERENCE_PROFILE,
  recover,
  soundnessBits,
  verify,
  worstCaseDecryptions,
} from '../src/escrow/proof.ts'

const Fr = bls12_381.fields.Fr

// A small profile keeps the suite fast. It obeys the same constraints as the
// reference profile: o < k, and n - o >= k.
const FAST = { n: 16, k: 6, o: 5 }

function freshSecret(): bigint {
  return Fr.create(bytesToBigInt(randomBytes(48))) || 1n
}

test('paper Equation 2: the corruption floor is n - o - k + 1', () => {
  assert.equal(corruptionFloor(REFERENCE_PROFILE), 78)
  assert.equal(corruptionFloor(FAST), 6)
})

test('paper Table 1: the tabulated soundness figures reproduce exactly', () => {
  const rows: [{ n: number; k: number; o: number }, number, number][] = [
    [{ n: 24, k: 7, o: 6 }, 7.19, 19],
    [{ n: 120, k: 25, o: 24 }, 38.29, 97],
    [{ n: 126, k: 26, o: 25 }, 40.22, 102],
    [{ n: 130, k: 27, o: 26 }, 41.51, 105],
  ]
  for (const [profile, bits, decryptions] of rows) {
    assert.equal(Number(soundnessBits(profile).toFixed(2)), bits)
    assert.equal(worstCaseDecryptions(profile), decryptions)
  }
})

test('paper Figure 5: corrupting one ciphertext passes easily and achieves nothing', () => {
  // The point of the figure. A low b survives the challenge most of the time,
  // and recovery still succeeds because the remaining shares reconstruct.
  assert.ok(passProbability(REFERENCE_PROFILE, 1) > 0.79)
  // At the floor, where recovery would actually break, it does not.
  const atFloor = passProbability(
    REFERENCE_PROFILE,
    corruptionFloor(REFERENCE_PROFILE),
  )
  assert.ok(atFloor < 1e-12, `expected < 1e-12, got ${atFloor}`)
})

test('an honest proof verifies and the secret recovers', () => {
  const master = setup()
  const secret = freshSecret()
  const proof = prove(master.mpk, 'acct-honest', secret, FAST)

  assert.equal(verify(master.mpk, proof, scalarCommitment(secret)), null)

  const result = recover(derive(master, 'acct-honest'), proof)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.secret, secret)
})

test('any ciphertext edit is caught by the challenge, before anything else', () => {
  const master = setup()
  const secret = freshSecret()
  const proof = prove(master.mpk, 'acct-swap', secret, FAST)

  // Equation 9 hashes every ciphertext, so editing one moves the challenge and
  // the opened set no longer matches. This fires before Equation 11 is reached.
  const target = proof.openings.at(0)?.index ?? 1
  const tampered = {
    ...proof,
    ciphertexts: proof.ciphertexts.map((c, i) =>
      i === target - 1 ? { u: c.u, v: randomBytes(c.v.length) } : c,
    ),
  }
  const reason = verify(master.mpk, tampered, scalarCommitment(secret))
  assert.ok(reason, 'tampered ciphertext verified')
  assert.match(reason, /openings do not match the challenge/)
})

test('paper Equation 11: recomputation catches what the other checks cannot', () => {
  const master = setup()
  const secret = freshSecret()
  const proof = prove(master.mpk, 'acct-coins', secret, FAST)

  // Openings are NOT part of the challenge, so editing the revealed coins
  // leaves Equation 9 satisfied. The share is untouched, so Equation 10 passes
  // too. Only recomputing the ciphertext from the revealed coins catches it,
  // which is the check the paper calls the most likely one to omit.
  const tampered = {
    ...proof,
    openings: proof.openings.map((o, i) =>
      i === 0 ? { ...o, coins: randomBytes(32) } : o,
    ),
  }
  const reason = verify(master.mpk, tampered, scalarCommitment(secret))
  assert.ok(reason, 'wrong coins verified')
  assert.match(reason, /does not recompute the published ciphertext/)
})

test('paper Equation 10: a forged opened share is caught by the Feldman check', () => {
  const master = setup()
  const secret = freshSecret()
  const proof = prove(master.mpk, 'acct-forge', secret, FAST)
  const tampered = {
    ...proof,
    openings: proof.openings.map((o, i) =>
      i === 0 ? { ...o, share: Fr.add(o.share, 1n) } : o,
    ),
  }
  const reason = verify(master.mpk, tampered, scalarCommitment(secret))
  assert.ok(reason)
  assert.match(reason, /Feldman commitment/)
})

test('the join to the credential proof: C_0 must equal the committed hS', () => {
  const master = setup()
  const secret = freshSecret()
  const proof = prove(master.mpk, 'acct-join', secret, FAST)

  // A prover who proved a credential against a DIFFERENT secret cannot reuse
  // this escrow proof, because the verifier compares the two commitments.
  const otherHS = scalarCommitment(freshSecret())
  const reason = verify(master.mpk, proof, otherHS)
  assert.ok(reason)
  assert.match(reason, /does not match the value the credential proof/)
})

test('openings cannot be chosen: a relabelled opening set is refused', () => {
  const master = setup()
  const secret = freshSecret()
  const proof = prove(master.mpk, 'acct-choose', secret, FAST)
  const shifted = {
    ...proof,
    openings: proof.openings.map((o) => ({
      ...o,
      index: o.index === FAST.n ? 1 : o.index + 1,
    })),
  }
  const reason = verify(master.mpk, shifted, scalarCommitment(secret))
  assert.ok(reason)
  assert.match(reason, /openings do not match the challenge|Feldman|recompute/)
})

test('paper Proposition 3: a key for another account recovers nothing', () => {
  const master = setup()
  const secret = freshSecret()
  const proof = prove(master.mpk, 'acct-A', secret, FAST)

  const wrong = recover(derive(master, 'acct-B'), proof)
  assert.equal(wrong.ok, false)
  if (wrong.ok) return
  assert.match(wrong.reason, /not enough consistent shares/)

  const right = recover(derive(master, 'acct-A'), proof)
  assert.equal(right.ok, true, 'positive control')
})

test('paper Equation 12: recovery survives corrupted unopened ciphertexts', () => {
  const master = setup()
  const secret = freshSecret()
  const proof = prove(master.mpk, 'acct-corrupt', secret, FAST)

  // Corrupt every unopened ciphertext up to one below the floor. Recovery must
  // skip them rather than accept garbage, and must still find k good shares.
  const opened = new Set(proof.openings.map((o) => o.index))
  const damage = corruptionFloor(FAST) - 1
  let done = 0
  const ciphertexts = proof.ciphertexts.map((c, i) => {
    if (opened.has(i + 1) || done >= damage) return c
    done++
    return { u: c.u, v: randomBytes(c.v.length) }
  })
  assert.equal(done, damage, 'fixture did not corrupt the intended count')

  const result = recover(derive(master, 'acct-corrupt'), {
    ...proof,
    ciphertexts,
  })
  assert.equal(result.ok, true, 'recovery gave up despite enough good shares')
  if (!result.ok) return
  assert.equal(result.secret, secret)
})

test('a fresh polynomial per attempt: two proofs of one secret share nothing', () => {
  const master = setup()
  const secret = freshSecret()
  const first = prove(master.mpk, 'acct-retry', secret, FAST)
  const second = prove(master.mpk, 'acct-retry', secret, FAST)

  // Same secret, so the same hS. Everything else must differ, or opened
  // subsets would accumulate across retries and cross the threshold.
  assert.equal(toHex(first.hS), toHex(second.hS))
  assert.notEqual(
    toHex(first.commitments.a.at(1) ?? new Uint8Array()),
    toHex(second.commitments.a.at(1) ?? new Uint8Array()),
  )
  const shareOf = (p: typeof first, i: number) =>
    p.openings.find((o) => o.index === i)?.share
  const shared = first.openings
    .map((o) => o.index)
    .filter((i) => shareOf(second, i) !== undefined)
    .filter((i) => shareOf(first, i) === shareOf(second, i))
  assert.equal(shared.length, 0, 'a share value repeated across attempts')
})

test('profiles that would leak the secret are refused', () => {
  const master = setup()
  const secret = freshSecret()
  // o >= k would reveal enough shares to reconstruct.
  assert.throws(
    () => prove(master.mpk, 'acct-bad', secret, { n: 16, k: 5, o: 5 }),
    /o must be below k/,
  )
  // n - o < k leaves too few unopened shares to ever recover.
  assert.throws(
    () => prove(master.mpk, 'acct-bad', secret, { n: 10, k: 6, o: 5 }),
    /unopened shares must still reach the threshold/,
  )
})

test('the join is checked at C_0, not only at hS', () => {
  const master = setup()
  const secret = freshSecret()
  const proof = prove(master.mpk, 'acct-c0', secret, FAST)

  // ISOLATING. hS is left alone, so the check comparing it to the credential
  // commitment still passes. Only the C_0 = hS comparison can catch this.
  // Without it a prover could commit to one secret and share another.
  const other = prove(master.mpk, 'acct-c0', freshSecret(), FAST)
  const swapped = {
    ...proof,
    commitments: {
      a: [
        other.commitments.a.at(0) ?? new Uint8Array(),
        ...proof.commitments.a.slice(1),
      ],
    },
  }
  const reason = verify(master.mpk, swapped, proof.hS)
  assert.ok(reason, 'a mismatched C_0 verified')
  assert.equal(reason, 'commitment zero is not the published hS')
})

test('recovery refuses a secret that does not match the published hS', () => {
  const master = setup()
  const secret = freshSecret()
  const proof = prove(master.mpk, 'acct-final', secret, FAST)

  // ISOLATING. The commitments and ciphertexts are untouched, so every share
  // passes its Feldman check and interpolation succeeds. Only the final
  // comparison against hS can catch that hS is not the committed value.
  const tampered = { ...proof, hS: scalarCommitment(freshSecret()) }
  const result = recover(derive(master, 'acct-final'), tampered)
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.reason, 'reconstructed secret does not match hS')
})
