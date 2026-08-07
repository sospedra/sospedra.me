# sige: complete SIGE, paper companion code

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Turn `apps/sige` from a demonstrator subset into the complete SIGE implementation, at the standard of companion code for a paper that introduces the construction. A reviewer must be able to run every claim the paper makes, check every artifact offline, and reproduce every number.

**Supersedes scope of:** `2026-08-05-sige.md` (that plan is complete and green; this one extends it).

**Doubt rule, unchanged:** the SIGE spec is the gospel — `~/labs/crypto-verificable-promises/docs/SEALED_IDENTITY_TECH_SPEC.md`. Section numbers below cite it.

## What "complete" means here, and what it cannot mean

Two readings. Only one is reachable, and the paper must say which.

**Not reachable, and the spec forbids claiming it.** §21 answers "build production" and "enroll a real identity" with **No**. The ZK enrollment circuit (§7.6 and §22 Open Decision 1) is unvalidated research with no published precedent and no pseudonymity-preserving fallback. Real HSMs, a real Bitcoin anchor, and legal sign-off are outside a browser app.

**Reachable, and this plan's target.** Every protocol mechanism the paper claims, implemented as real math; every institutional seam simulated behind a labeled boundary; every artifact independently verifiable by a party holding no keys; every published number reproducible by one command.

The enrollment relation (§7.5) is the one place the two collide. Handling, and this is the honest form paper code takes: implement all eleven conditions as an explicit **clear-mode relation checker** whose *soundness* is real (a malformed escrow cannot pass) and whose *zero-knowledge* is absent (the checker sees the witness, then discards it). Label it at every call site and in the ledger. `pi_vtd` is **not** part of that gap: §5.5A req 2 states it is "a public, non-zero-knowledge proof, verified by the enrollment verifier and reproducible by any auditor," so it must be real, and Phase A builds it.

## Global Constraints

- **Do NOT commit, branch, or push. Do not run `git add`.** The owner commits. Touch only `apps/sige/**`.
- Concurrent sessions edit this repo (`apps/bonfire`, `apps/main/app/bazaar`). Never touch those paths. Re-read a file if it changed under you.
- Runtime deps stay exactly `@noble/curves@2.2.0`, `@noble/ciphers@2.2.0`, `@noble/hashes@2.2.0`. **No new dependency without owner approval** — propose in the report instead.
- Local imports relative with the `.ts` extension. Filenames kebab-case.
- Biome: `type` over `interface`; no non-null assertions; comment budget 3 inline per file, 2 lines each.
- Complexity budgets per `~/.claude/rules/code.md`. New code has no verbatim-port excuse.
- Copy: jurisdiction-neutral, short declarative sentences, no marketing adjectives, no em dashes.
- Every claim tagged `MATH` / `CUSTODY` / `ASSUMED` per §3.1. **An overclaimed tier is the most serious defect this project can ship.**
- Gates after every task: `pnpm --dir apps/sige lint && pnpm --dir apps/sige typecheck && pnpm --dir apps/sige test && pnpm --dir apps/sige build`
- **No completion claim without pasted command output.**
- Parity note: Phase B adopts canonical CBOR, which changes every hash and retires the byte-identical parity with `packages/sige-demo`. That is expected and correct. Phase E replaces that check with published golden vectors of our own.

---

# Phase A — the construction the paper introduces (§5.5A)

The current escrow time-locks `H(y)` where `y = x^(2^t)`. The spec requires the puzzle to open to a **scalar** `s` with a **published commitment** `H_s = g_inner^s`, an inner key `HKDF(s)`, and a public proof `pi_vtd` that the puzzle opens within `t` steps to the discrete log of `H_s`. Without `pi_vtd`, nothing stops an operator enrolling a puzzle that opens to garbage, and the delay claim rests on trusting the client's word.

## Task A1: Linearly homomorphic time-lock puzzle (LHTLP)

Plain RSW cannot support cheap proof verification: checking a claimed puzzle requires `t` squarings or the factorization. LHTLP (Malavolta–Thyagarajan, CRYPTO 2019) publishes `h = g^(2^T)`, so **anyone creates a puzzle cheaply** and a verifier **recomputes** a challenged puzzle from its randomness. Its linear homomorphism also lets a solver fold `k` share-puzzles into one, so solving costs `T` sequential squarings once, not `k` times.

**Files:** Create `apps/sige/src/core/lhtlp.ts`; Test `apps/sige/test/lhtlp.test.ts`

**Interfaces produced:**

```ts
type LhtlpParams = { n: bigint; nSquared: bigint; t: number; g: bigint; h: bigint }
type LhtlpPuzzle = { u: bigint; v: bigint }
setupParams(primeBits: number, t: number): { params: LhtlpParams; trapdoor: bigint }
createPuzzle(params: LhtlpParams, secret: bigint, r: bigint): LhtlpPuzzle
solvePuzzle(params: LhtlpParams, puzzle: LhtlpPuzzle, onProgress?: (done: number, total: number) => void): Promise<bigint>
addPuzzles(params: LhtlpParams, a: LhtlpPuzzle, b: LhtlpPuzzle): LhtlpPuzzle
scalePuzzle(params: LhtlpParams, p: LhtlpPuzzle, scalar: bigint): LhtlpPuzzle
randomBlinding(params: LhtlpParams): bigint
```

The scheme, with the algebra stated so the implementer does not have to rederive it:

```
Setup:   N = p*q                       # p, q safe primes of primeBits each
         g  <- random unit in Z*_N
         h  = g^(2^T) mod N            # computed with the trapdoor phi, then phi discarded
         params = (N, N^2, T, g, h)

PGen(s, r):  u = g^r mod N
             v = h^(r*N) * (1+N)^s mod N^2

Solve(u, v): w = u^(2^T) mod N         # T sequential squarings, the delay
             m = v * (w^N)^(-1) mod N^2
             s = (m - 1) / N           # exact: (1+N)^s = 1 + s*N mod N^2

Correctness: h^(r*N) = g^(r*N*2^T) = (g^r)^(N*2^T) = (u^(2^T))^N = w^N.

Homomorphism: (u1*u2 mod N, v1*v2 mod N^2) opens to s1 + s2 (integer addition, exact while
              the sum stays below N).
Scaling:      (u^a mod N, v^a mod N^2) opens to a*s (same bound).
```

`(1+N)^s = 1 + s*N mod N^2` holds because every binomial term from `N^2` up vanishes. Exactness of the homomorphism needs `sum < N`: Task A3 folds at most `k` products of two sub-`q` values, so the bound is `k*q^2 < 2^520` against a 2048-bit `N`. Assert that bound in code.

- [ ] **Step 1: Write the failing test**

```ts
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  addPuzzles, createPuzzle, randomBlinding, scalePuzzle, setupParams, solvePuzzle,
} from '../src/core/lhtlp.ts'

const SMALL = { primeBits: 256, t: 64 }

test('a puzzle solves to the secret it was created from', async () => {
  const { params } = setupParams(SMALL.primeBits, SMALL.t)
  const secret = 12345678901234567890n
  const puzzle = createPuzzle(params, secret, randomBlinding(params))
  assert.equal(await solvePuzzle(params, puzzle), secret)
})

test('puzzle bytes do not reveal the secret', () => {
  const { params } = setupParams(SMALL.primeBits, SMALL.t)
  const secret = 999n
  const p = createPuzzle(params, secret, randomBlinding(params))
  assert.notEqual(p.u, secret)
  assert.notEqual(p.v % params.n, secret)
  const again = createPuzzle(params, secret, randomBlinding(params))
  assert.notEqual(p.u, again.u, 'fresh randomness gives a different puzzle')
})

test('addition and scaling are homomorphic', async () => {
  const { params } = setupParams(SMALL.primeBits, SMALL.t)
  const a = 111n
  const b = 222n
  const pa = createPuzzle(params, a, randomBlinding(params))
  const pb = createPuzzle(params, b, randomBlinding(params))
  assert.equal(await solvePuzzle(params, addPuzzles(params, pa, pb)), a + b)
  assert.equal(await solvePuzzle(params, scalePuzzle(params, pa, 7n)), a * 7n)
})

test('h is reproducible from the trapdoor and consistent with sequential squaring', async () => {
  const { params, trapdoor } = setupParams(128, 32)
  let squared = params.g
  for (let i = 0; i < params.t; i++) squared = (squared * squared) % params.n
  assert.equal(squared, params.h, 'h equals g^(2^t) the slow way')
  assert.ok(trapdoor > 0n, 'setup returns the trapdoor so the caller can discard it deliberately')
})

test('solving cost scales with t, and creation does not', async () => {
  const cheap = setupParams(256, 64)
  const dear = setupParams(256, 4096)
  const s = 42n
  const t0 = performance.now()
  await solvePuzzle(cheap.params, createPuzzle(cheap.params, s, randomBlinding(cheap.params)))
  const cheapMs = performance.now() - t0
  const t1 = performance.now()
  await solvePuzzle(dear.params, createPuzzle(dear.params, s, randomBlinding(dear.params)))
  assert.ok(performance.now() - t1 > cheapMs, 'more squarings costs more wall clock')
})
```

- [ ] **Step 2: Run it, confirm it fails on the missing module**

Run: `pnpm --dir apps/sige exec node --test test/lhtlp.test.ts`

- [ ] **Step 3: Implement `lhtlp.ts`**

Reuse `modPow` from `./puzzle.ts` (export it if it is not already) and the prime generator; do not duplicate Miller-Rabin. Requirements:
- `setupParams` returns the trapdoor explicitly so the caller discards it as a visible act, never a side effect.
- `solvePuzzle` runs `t` sequential squarings with the same progress-callback and yield cadence as `puzzle.ts` (every 10000 iterations), so the UI keeps working.
- Reject a non-unit `g`, a `secret` at or above `N`, and a puzzle whose `u` is not a unit mod `N`. Fail closed, no silent coercion.
- One comment, stating why LHTLP replaces plain RSW: cheap creation and cheap challenged-puzzle recomputation.

- [ ] **Step 4: Run it green, then the gates. Report the measured create-versus-solve split.**

## Task A2: Shamir sharing and Feldman commitments over the inner group

`pi_vtd` needs shares of `s` that are individually committed and publicly tied to `H_s`.

**Files:** Create `apps/sige/src/core/shamir.ts`; Test `apps/sige/test/shamir.test.ts`

**Interfaces produced:**

```ts
type Poly = { coefficients: bigint[] }          // coefficients[0] is the secret
type Share = { index: number; value: bigint }
type FeldmanCommitments = { a: Uint8Array[] }   // compressed G1, a[0] = H_s
randomPoly(secret: bigint, threshold: number): Poly
shareAt(poly: Poly, index: number): Share
commitPoly(poly: Poly): FeldmanCommitments
commitmentFor(commitments: FeldmanCommitments, index: number): Uint8Array
commitmentForCombination(commitments: FeldmanCommitments, indices: number[], weights: bigint[]): Uint8Array
lagrangeCoefficients(indices: number[]): bigint[]
reconstruct(shares: Share[]): bigint
scalarCommitment(scalar: bigint): Uint8Array
```

All scalar arithmetic is mod the BLS12-381 scalar field `Fr`; commitments are compressed G1 points. §5.5A calls for a SNARK-friendly inner curve so the in-circuit scalar multiplication is cheap; G1 stands in for it here, and that substitution is labeled, not hidden.

`commitmentFor(commitments, i)` recomputes `C_i = sum_j (i^j) * A_j` in the group, so a verifier derives any share commitment from the published coefficients. `lagrangeCoefficients` returns the `Fr` coefficients that interpolate to `x = 0`.

- [ ] **Step 1: Write the failing test**

```ts
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bytesEqual } from '../src/core/bytes.ts'
import {
  commitPoly, commitmentFor, lagrangeCoefficients, randomPoly, reconstruct,
  scalarCommitment, shareAt,
} from '../src/core/shamir.ts'

test('any threshold subset reconstructs, fewer does not', () => {
  const secret = 7777777n
  const poly = randomPoly(secret, 5)
  const shares = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => shareAt(poly, i))
  assert.equal(reconstruct(shares.slice(0, 5)), secret)
  assert.equal(reconstruct([shares[1], shares[3], shares[5], shares[6], shares[7]]), secret)
  assert.notEqual(reconstruct(shares.slice(0, 4).concat(shares.slice(0, 1))), secret)
})

test('feldman commitments bind every share to the published coefficients', () => {
  const poly = randomPoly(31337n, 4)
  const commitments = commitPoly(poly)
  assert.ok(bytesEqual(commitments.a[0], scalarCommitment(31337n)), 'a[0] commits the secret')
  for (const i of [1, 2, 9, 40]) {
    const share = shareAt(poly, i)
    assert.ok(bytesEqual(commitmentFor(commitments, i), scalarCommitment(share.value)))
  }
})

test('a tampered share fails its commitment check', () => {
  const poly = randomPoly(5n, 3)
  const commitments = commitPoly(poly)
  const share = shareAt(poly, 2)
  assert.ok(!bytesEqual(commitmentFor(commitments, 2), scalarCommitment(share.value + 1n)))
})

test('lagrange coefficients interpolate to the secret in the exponent', () => {
  const secret = 4242n
  const poly = randomPoly(secret, 3)
  const indices = [4, 8, 15]
  const shares = indices.map((i) => shareAt(poly, i))
  const lambdas = lagrangeCoefficients(indices)
  const folded = shares.reduce((acc, s, j) => acc + lambdas[j] * s.value, 0n)
  assert.equal(reconstruct(shares), secret)
  assert.ok(folded > 0n, 'the integer fold is the value the puzzle homomorphism will carry')
})
```

- [ ] **Step 2: Run it, confirm failure.**
- [ ] **Step 3: Implement `shamir.ts`.** Guard `threshold >= 1`, distinct share indices, index `!= 0`. Reject a reconstruct call with fewer than `threshold` shares by throwing, never by returning a wrong value silently.
- [ ] **Step 4: Green, then gates.**

## Task A3: the VTD proof (§5.5A req 2)

The public statement: *this puzzle opens, within `t` sequential squarings, to the discrete log of `H_s`.* Construction is Fiat-Shamir cut-and-choose over LHTLP-locked Shamir shares, the practical shape from Thyagarajan et al. (CCS 2020), which the spec cites in §24.

```
Prove(s, H_s, params, profile):
  poly        = randomPoly(s, k)
  A           = commitPoly(poly)                    # A[0] == H_s
  for i in 1..n:  s_i = shareAt(poly, i); r_i = randomBlinding(); Z_i = PGen(s_i, r_i)
  challenge   = H(DST_VTD || params || A || Z_1..Z_n || t || n || k || o)
  I           = first o distinct indices drawn from challenge          # the opened set
  pi_vtd      = { n, k, o, A, Z[1..n], opened: { i, s_i, r_i } for i in I }

Verify(pi_vtd, H_s, params, t):
  A[0] == H_s
  recompute challenge from (params, A, Z, t, n, k, o) and confirm I matches
  for each opened i:  Z_i == PGen(s_i, r_i)                       # puzzle recomputation, cheap
  batched Feldman check over all opened i, in ONE group equation:  # see below
      rho   = weights derived by Fiat-Shamir from a transcript that already commits to
              A, every Z, the opened indices AND the revealed shares s_i
      lhs   = (sum_i rho_i * s_i mod r) * G                        # one fixed-base multiply
      rhs   = commitmentForCombination(A, I, rho)                  # one size-k multi-scalar mult
      lhs == rhs
  |I| == o, o <= k-1, n - o >= k

Solve(pi_vtd, params):
  J       = any k unopened indices
  lambdas = lagrangeCoefficients(J)
  folded  = sum over J of scalePuzzle(Z_j, lambda_j)          # one puzzle
  value   = LHTLP.solve(folded)                               # t squarings, ONCE
  s       = value mod q
  require scalarCommitment(s) == H_s                          # else try another subset
```

Why each clause is load-bearing:
- `o <= k-1` keeps the opened shares below the reconstruction threshold, so the proof leaks nothing about `s`. Its statement concerns a random scalar anyway (§5.5A req 2), but the bound must hold structurally.
- `n - o >= k` keeps enough unopened shares to fold, so an honest proof is always solvable.
- Verification stays cheap because `h` is public: a challenged puzzle is **recomputed**, never solved.
- The Feldman check is **batched, not per index**, and this is load-bearing rather than an optimisation. Per-index costs `o*k` group multiplications, measured at 2707 ms for `o = 30, k = 31`, which breaks the paper's own claim that a verifier need not pay the delay. Batching regroups the `o` equations `C_i = s_i*G` by coefficient into one, costing about `k` multiplications, measured at 118 ms. Soundness is Schwartz-Zippel over a degree-1 form in the weights: if any opened share is false the check passes only with probability `1/r`, about `2^-255`, **provided** the weights are fixed after the shares are committed. Hence the transcript requirement above; deriving `rho` from the index-selection challenge alone would let a prover pick shares after seeing its weights.
- `scalarCommitment` is the wrong function for the `lhs` comparison: its zero guard would throw on an honest combination that happens to reduce to `0 mod r`. Do the fixed-base multiply and compare bytes directly.
- Solving folds first and squares once, so the delay is `t`, not `k*t`.
- The final `scalarCommitment(s) == H_s` check makes the solver self-correcting: a bad fold is detected, not consumed.

**Soundness.** A prover breaks solvability only by planting `b >= n - o - k + 1` malformed puzzles that all escape opening, with probability `C(n-b, o) / C(n, o)`. That number is a published parameter of the construction, not a hand-wave. Export it and print it.

**Files:** Create `apps/sige/src/core/vtd.ts`; Test `apps/sige/test/vtd.test.ts`

**Interfaces produced:**

```ts
type VtdProfile = { n: number; k: number; o: number }
type VtdOpened = { index: number; share: bigint; blinding: bigint }
type VtdProof = { profile: VtdProfile; commitments: FeldmanCommitments; puzzles: LhtlpPuzzle[]; opened: VtdOpened[] }
proveVtd(params: LhtlpParams, secret: bigint, profile: VtdProfile): VtdProof
verifyVtd(params: LhtlpParams, proof: VtdProof, hS: Uint8Array): string | null   // null = valid, else the reason
solveVtd(params: LhtlpParams, proof: VtdProof, onProgress?: (done: number, total: number) => void): Promise<bigint>
soundnessBits(profile: VtdProfile): number
```

`verifyVtd` returns a reason string on failure, matching the gates' fail-closed idiom.

- [ ] **Step 1: Write the failing test**

```ts
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { setupParams } from '../src/core/lhtlp.ts'
import { scalarCommitment } from '../src/core/shamir.ts'
import { proveVtd, soundnessBits, solveVtd, verifyVtd } from '../src/core/vtd.ts'

const PROFILE = { n: 24, k: 7, o: 6 }
const SECRET = 123456789n

function fixture() {
  const { params } = setupParams(256, 64)
  const proof = proveVtd(params, SECRET, PROFILE)
  return { params, proof, hS: scalarCommitment(SECRET) }
}

test('an honest proof verifies and solves to the committed scalar', async () => {
  const { params, proof, hS } = fixture()
  assert.equal(verifyVtd(params, proof, hS), null)
  assert.equal(await solveVtd(params, proof), SECRET)
})

test('the proof leaks nothing: opened shares stay below the threshold', () => {
  const { proof } = fixture()
  assert.equal(proof.opened.length, PROFILE.o)
  assert.ok(PROFILE.o <= PROFILE.k - 1, 'opened count is below the reconstruction threshold')
  assert.ok(PROFILE.n - PROFILE.o >= PROFILE.k, 'enough unopened shares remain to fold')
})

test('verification refuses a proof bound to the wrong commitment', () => {
  const { params, proof } = fixture()
  const reason = verifyVtd(params, proof, scalarCommitment(SECRET + 1n))
  assert.match(String(reason), /commit/i)
})

test('verification refuses a tampered opened share', () => {
  const { params, proof, hS } = fixture()
  const bad = { ...proof, opened: proof.opened.map((x, i) => (i === 0 ? { ...x, share: x.share + 1n } : x)) }
  assert.notEqual(verifyVtd(params, bad, hS), null)
})

test('verification refuses a tampered puzzle', () => {
  const { params, proof, hS } = fixture()
  const puzzles = proof.puzzles.slice()
  const target = proof.opened[0].index - 1
  puzzles[target] = { ...puzzles[target], v: puzzles[target].v + 1n }
  assert.notEqual(verifyVtd(params, { ...proof, puzzles }, hS), null)
})

test('verification refuses a re-chosen challenge set', () => {
  const { params, proof, hS } = fixture()
  const shifted = { ...proof, opened: proof.opened.slice(1).concat(proof.opened.slice(0, 1)) }
  const swapped = { ...shifted, opened: shifted.opened.map((x) => ({ ...x, index: (x.index % PROFILE.n) + 1 })) }
  assert.notEqual(verifyVtd(params, swapped, hS), null)
})

test('verification is cheap: it never pays the delay', () => {
  const { params, proof, hS } = fixture()
  const t0 = performance.now()
  assert.equal(verifyVtd(params, proof, hS), null)
  assert.ok(performance.now() - t0 < 2000, 'a verifier recomputes challenged puzzles, never solves them')
})

test('soundness error is a published number', () => {
  assert.ok(soundnessBits(PROFILE) > 0)
  assert.ok(soundnessBits({ n: 120, k: 31, o: 30 }) > soundnessBits(PROFILE), 'more instances, better soundness')
})
```

- [ ] **Step 2: Run it, confirm failure.**
- [ ] **Step 3: Implement `vtd.ts`.**
  - Derive `I` from the challenge by rejection sampling distinct indices in `1..n`; the derivation must be deterministic and reproducible by the verifier from published fields alone.
  - `verifyVtd` re-derives `I` and refuses if the proof's opened set differs. Also enforce the three structural bounds and reject duplicate opened indices.
  - `soundnessBits` returns `-log2(C(n-b, o) / C(n, o))` with `b = n - o - k + 1`, computed in floating point from log-gamma or a log-factorial sum. Never return `Infinity`.
  - Everything fails closed with a reason string.
- [ ] **Step 4: Green, then gates.**
- [ ] **Step 5: Calibrate and report.** Measure prove, verify, and solve for `n` in `{24, 60, 120}` at 2048-bit `N`. Report a table of `n, k, o, soundnessBits, proveMs, verifyMs, proofBytes`. Recommend the largest profile whose prove time fits the §7.6 budget (target 2 s, hard max 10 s) at soundness `>= 40` bits. Do not wire it in yet; Task A4 consumes the recommendation.

## Task A4: rewire the escrow to the spec's envelope

**Files:** Modify `apps/sige/src/world/world.ts`, `apps/sige/src/world/params.ts`, `apps/sige/src/core/puzzle.ts`; Test extend `apps/sige/test/world.test.ts`

**Interfaces as actually built in A1-A3, which supersede any earlier sketch:**

- `verifyVtd(params, proof, expectations)` where `expectations` is `{ hS: Uint8Array; profile: VtdProfile }`. The expected profile is mandatory: a proof carries its own `profile` field and a verifier that trusts it accepts attacker-chosen security parameters (a `{n:3,k:2,o:1}` proof verifies at 0.58 soundness bits).
- `VtdProof` carries a published 32-byte `nonce`. It must be unique per proof. A stateless verifier cannot detect reuse, and a repeated nonce repeats the derived polynomial, so pooling two openings recovers the scalar with zero squarings. **The envelope layer owns uniqueness:** keep a per-account seen-nonce set and refuse a repeat, the same way the single-use server nonce works.
- `coefficientsDeriveFromSecret(secret, proof, profile)` returns a reason or `null`. Task C1 calls it; A4 does not.
- `solveVtd` reports progress against the worst case, so an honest solve's bar peaks near 4 percent and then completes. A4 owns how that reads in the UI: either report against the fast path and accept a jump on fallback, or label the two stages.
- LHTLP parameters are per delay profile, generated once and published. The world holds them; the client never holds the trapdoor.

**Parameter sizing, and this is load-bearing for the suite's runtime.** Proving at the recommended profile costs about 5.3 s and enrollment happens many times across the scenarios, so a single profile would make the suite unusable. `params.ts` gains:

```ts
export const VTD_PROFILE: VtdProfile = FAST ? { n: 24, k: 7, o: 6 } : { n: 130, k: 27, o: 26 }
export const LHTLP_PRIME_BITS: number = FAST ? 256 : 1024
```

Real mode is the honest default, exactly as with `t`. Report the measured enrollment cost in both modes, and if fast-mode enrollment still makes the suite unpleasant, say so with numbers rather than shrinking the real profile.

`DelayedIdentityEnvelopeV1` (§5.5A) becomes, exactly:

```ts
type DelayedIdentityEnvelopeV1 = {
  schemaVersion: number
  delayProfileId: string
  t: number
  hS: Uint8Array          // compressed G1, the public commitment to the puzzle scalar
  proof: VtdProof         // pi_vtd, public and non-zero-knowledge
  innerNonce: Uint8Array
  innerCiphertext: Uint8Array
}
```

Enrollment becomes: sample `s` in `Fr`; `hS = scalarCommitment(s)`; `innerKey = kdf(s, "SIGE/v1/inner-aead")`; seal the identity payload under `innerKey`; `proof = proveVtd(params, s, profile)`; put all of it inside the two-gate AEAD as before, so the puzzle bytes still do not exist for anyone until both gates open (the anti-pre-grinding property, §5.5A).

The ceremony becomes: open the outer envelope, `verifyVtd` against the envelope's own `hS` and the profile's `t`, then `solveVtd` (the delay), then derive `innerKey` and open the payload, then check the identity commitment as today.

- [ ] **Step 1: Write the failing tests**

```ts
test('the envelope carries a public commitment and a verifiable delay proof', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const { record } = mustEnroll(world, 'DOC-VTD')
  const envelope = record.envelopePublic
  assert.equal(envelope.hS.length, 48, 'compressed G1')
  const expectations = { hS: envelope.hS, profile: world.policy.vtdProfile }
  assert.equal(verifyVtd(world.delayParams, envelope.proof, expectations), null)
  assert.equal(envelope.t, world.policy.t)
})

test('a repeated proof nonce is refused at the envelope layer', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const first = mustEnroll(world, 'DOC-NONCE-1')
  const refusal = enrollReusingProofNonce(world, 'DOC-NONCE-2', first.record)
  assert.match(String(refusal), /nonce/i)
})

test('an envelope whose proof does not match its commitment is refused at enrollment', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const refusal = enrollWithTamperedProof(world, 'DOC-BAD-VTD')
  assert.match(String(refusal), /vtd|commit/i)
})

test('the delay still binds a holder of both master secrets, and now it is provable', async () => {
  const world = createWorld(GENERIC, { t: tuned(2048) })
  const { record, attrs } = mustEnroll(world, 'DOC-BOTH')
  const opened = openOuter(world, record, deriveBothOutOfInterface(world, record, { unsafe: true }))
  assert.notEqual(opened, null)
  assert.equal(verifyVtd(world.delayParams, opened.envelope.proof, opened.envelope.hS), null)
  const identity = await payDelayAndDecrypt(world, record, opened)
  assert.equal(identity?.attrs.fullLegalName, attrs.fullLegalName)
})
```

Add `enrollWithTamperedProof` as a small, explicitly named test helper in `world.ts` alongside the existing fault injectors, not as a scenario-only hack.

- [ ] **Step 2: Run, confirm failure. Step 3: Implement. Step 4: Green plus gates.**
- [ ] **Step 5:** Delete the now-dead `createPuzzle`/`solvePuzzle` path from `puzzle.ts` if nothing else consumes it, or keep it only if a test still pins RSW behavior; say which in the report and leave no unreferenced export.

## Task A5: scenario and ledger for the construction

**Files:** Modify `apps/sige/src/scenarios/scenarios.ts`, `apps/sige/src/ui/ledger.ts`

New scenario `delay-proof`, placed directly after `timed-commitment`, tier `MATH`:

- summary: the envelope publishes a commitment and a proof that the puzzle opens within `t` steps to that commitment's discrete log. Anyone verifies it without paying the delay. The operator cannot enrol a puzzle that opens to garbage.
- steps, each computed, none narrated: verify the honest proof and print the verify time against the solve time; print the soundness bits and the worst-case solve count of the active profile; tamper the commitment and show the refusal; tamper one opened share and show the refusal; swap the proof nonce and show the refusal; present a weaker profile than the world's and show the refusal; then solve and show the recovered scalar matching the commitment.

Interfaces as built: `verifyVtd(params, proof, { hS, profile })` with a mandatory expected profile, `soundnessBits(profile)`, `worstCaseSolves(profile)`. The world carries `delayParams` and `policy.vtdProfile`. Reach the envelope through the same guarded path Task A4's tests use; there is no plaintext envelope field on the record, deliberately, because the proof carries every puzzle instance and publishing it early would hand any party the sequential clock before authorization.

The weaker-profile step is the one worth getting right: a proof carries its own profile, and a verifier trusting it accepts attacker-chosen security parameters, so this step demonstrates the pinning rather than restating it.

Update the `timed-commitment` scenario's summary: the delay is now publicly verifiable, not asserted.

- [ ] Steps: write the scenario, extend `test/scenarios.test.ts`'s expected id list to include `delay-proof` in position, run, gates.

---

# Phase B — canonical encoding, CCA, and the full record set

## Task B1: deterministic CBOR and framed object hashing (§6.1)

Cross-implementation reproducibility is a paper requirement, and `JSON.stringify` is not a canonical form. §6.1 is normative:

```
SHA256( "SIGE/object-hash/v1" || uint32_be(len(type_url)) || type_url
                              || uint64_be(len(canonical_cbor)) || canonical_cbor )
```

**Files:** Create `apps/sige/src/core/cbor.ts`, `apps/sige/src/core/object-hash.ts`; Test `apps/sige/test/cbor.test.ts`

- Encoder and decoder for the profile subset: unsigned and negative integers, byte strings, text strings, arrays, maps, `true`/`false`/`null`. Deterministic: shortest-form integers, map keys sorted by encoded bytes, definite lengths only.
- The decoder **must reject** duplicate map keys, non-shortest integers, indefinite-length items, floats, and trailing bytes. Each rejection is a named test.
- `objectHash(typeUrl, value)` implements the framing above. Every record type gets a `type_url` constant.
- Round-trip property tests over generated nested values, plus a fixed vector table (encode a known structure, assert exact bytes) so another implementation can check itself against us.

- [ ] Steps: failing test, confirm failure, implement, green, gates.

## Task B2: replace ad-hoc encodings with canonical ones

**Files:** Modify `world.ts` (leaf building, envelope encoding, `escrowContext`, authorization hashing), `merkle.ts` (leaf bytes), and delete `world.ts`'s local `fromHex`.

Every signed or hashed object routes through `objectHash`. Leaves become canonical CBOR maps, not JSON strings. Note in the report that this retires reference byte-parity by design.

- [ ] Steps: adapt the existing tests to the new hashes (they assert structure, not constants, so most survive), implement, green, gates.

## Task B3: CCA security via the FO transform (§5.5, demo spec §4.5)

A paper cannot ship a CPA-only KEM and claim confidentiality against an active adversary. Derive the KEM randomness from the plaintext, re-encapsulate on decapsulation, and reject on mismatch.

**Files:** Modify `apps/sige/src/core/kem.ts`; Test extend `apps/sige/test/kem.test.ts`

```
Encapsulate:  r = H(DST_FO || envelopeBytes || coins)
              U = r*P2 ;  K = kdf(...)                     # as today, but r is derived
Decapsulate:  recover the envelope, recompute r, recompute U, reject unless U matches
```

Tests must include: a mauled `U` with a valid AEAD tag is refused; a replayed `U` from another record is refused; the honest path still round-trips.

- [ ] Steps: failing test, confirm failure, implement, green, gates. Report the added cost per operation.

## Task B4: point validation everywhere (§5.8)

**Files:** Modify `kem.ts`, `shamir.ts`, `vtd.ts`; Test create `apps/sige/test/malformed.test.ts`

Every deserialized point gets canonical-encoding, on-curve, correct-subgroup, and non-identity checks. The test corpus: identity point, off-curve point, wrong-subgroup point, wrong-length input, non-canonical encoding. All must be refused with a reason, none may throw an unhelpful low-level error.

**A demonstrated attack this task must close, found during Task B3's review.** `@noble/curves@2.2.0`'s `G2.fromBytes` reduces coordinates modulo the field prime instead of rejecting a non-canonical field encoding. Adding `p` to the `c0` limb therefore yields a **different 96-byte string that decodes to the same point**. The reviewer built it against a live enrolled record: the two encodings differ byte for byte, decode to one point, derive one key, and the AEAD opens under both. Task B3's Fujisaki-Okamoto check happens to catch it, because that check compares canonical bytes, but nothing at the deserialization boundary does. Reject a non-canonical encoding where it enters, so the property does not depend on a downstream check noticing. Test with that exact construction, not a synthetic stand-in.

- [ ] Steps: failing test, confirm failure, implement, green, gates.

## Task B5: the full record set (§6.2)

**Files:** Create `apps/sige/src/world/records.ts`; Modify `world.ts`; Test create `apps/sige/test/records.test.ts`

Settled at Task B2, so do not re-litigate: field-level commitments (`identityCommitment`, `account_commitment`, `transcriptHash`, the nullifier, the gate-attestation messages) intentionally stay on `dhash`, whose framing already length-prefixes every part. `objectHash` with a `type_url` is for records, not for field values that live inside them.

Every field list from §6.2.1 through §6.2.5 verbatim, as types plus constructors plus canonical hashers: `EnrollmentRecordV1` (including `credential_profile_id`, `trust_snapshot_id`, `policy_id`, `delay_profile_id`, both escrow ciphertexts, both VTD proofs, `unseal_detection_tag_key`, `verifier_build_hash`), `UnsealAuthorizationV1` (including `jurisdiction`, `legal_basis_code`, `requested_attribute_scope`, `mapping_explanation_commitment`, `case_reference_commitment`, `expires_at`), `LogLeafV1` (including `prev_unseal_anchor_ref`, `unseal_detection_tag`, `public_disclosure_class`, `extension_commitments`), `SignedTreeHeadV1` (including `previous_tree_size` and `previous_root_hash`), `BitcoinAnchorV1` (including `transaction_merkle_proof`, `block_header`, `confirmation_policy`, `observed_chain_work`).

The §18.2 MUST-succeed regression belongs here: **`K` is reconstructible from the stored record alone.** Load a record from its canonical bytes with no access to the original request, and decrypt.

**Unrecognized critical fields (§6.1), assigned here because only a per-record parser can own it.** §6.1 requires rejecting them alongside the encoding rules, but the generic CBOR layer cannot: it has no idea which fields a given record type considers critical. Each record's parser therefore rejects a map carrying a field its schema does not know, rather than ignoring it. Test one unknown field per record type. Without this, a forward-dated producer can smuggle a field past a verifier that then hashes something it did not understand.

- [ ] Steps: failing test, confirm failure, implement, green, gates.

---

# Phase C — components, evidence, and the keyless path

## Task C1: enrollment verifier component (§7.5, §7.7)

**Files:** Create `apps/sige/src/world/enrollment-verifier.ts`; Test create `apps/sige/test/enrollment.test.ts`

A component the operator runs, which accepts or refuses a submitted enrollment package. It checks all eleven §7.5 conditions in clear mode plus `pi_vtd` for each track outside the relation, then the nine §7.7 acceptance steps in order, atomically: request shape, single-use server nonce consumed, active policy and trust snapshot and epoch and delay profile and proof key, the relation, `transcript_hash` consistency **and that `K` is reconstructible from the fields about to be stored**, nullifier uniqueness, store, append `EnrollmentAccepted`, activate only after the leaf appears in a signed head.

Two properties the tests must pin: a refusal never reveals which private predicate failed (§7.7), and the witness is discarded after the check (assert the verifier retains no reference).

Label the zero-knowledge gap at the call site and in the report. Soundness is real here; zero-knowledge is not.

- [ ] Steps: failing test, confirm failure, implement, green, gates.

## Task C2: keyless verifier component (demo spec §5.8)

**Files:** Create `apps/sige/src/world/keyless-verifier.ts`; Test create `apps/sige/test/keyless.test.ts`

Constructed with public data only, holding no secret. It must be impossible to build it with a key: take public keys and public logs, nothing else. Surface: `verifyInclusion`, `verifyConsistency`, `verifyAnchor` (printing the `ASSUMED` tier), `reconcile`, `detectEquivocation`, `verifyShareArtifact` (flagging an interface-issued share with no anchored leaf), `verifyEvidenceBundle`, `transparencyReport` (recomputing every §17.1 counter from public data: enrollments by epoch, unseals by issuing role and by track, in-delay count, current congestion difficulty and window state, anchors confirmed and pending, tree size and root history, disclosure and closure counts, unmatched past horizon).

The scenarios currently do these checks inline, next to the code that created the data. Move them here so the claim "a party holding nothing can check this" is structural rather than narrated.

- [ ] Steps: failing test, confirm failure, implement, green, gates.

## Task C3: consistency proofs (§8.1)

**Files:** Modify `apps/sige/src/core/merkle.ts`; Test extend `apps/sige/test/log.test.ts`

RFC 9162-compatible `consistencyProof(oldSize, newSize)` and `verifyConsistency(oldSth, newSth, proof)`. Tests: every size pair up to 16 verifies; a proof across a forked branch never verifies; a truncated or padded proof is refused. Then `SignedTreeHeadV1` carries `previous_tree_size` and `previous_root_hash`, and the log gate requires a valid consistency transition from the last accepted head (§10.5 lists a missing consistency proof as fail-closed).

- [ ] Steps: failing test, confirm failure, implement, green, gates.

## Task C4: evidence bundle and its offline verifier (§6.2.6)

**Files:** Create `apps/sige/src/world/evidence.ts`; Test create `apps/sige/test/evidence.test.ts`

Assemble every §6.2.6 field: authorization, redacted order-signature evidence, log leaf, inclusion proof, signed head, consistency proof from the previous anchor, Bitcoin anchor, congestion-schedule evidence, both HSM attestations, the **timed-commitment solution proof**, the decryption-result commitment, and the ceremony transcript.

The solution proof is what makes the delay auditable after the fact: publish the folded puzzle, the recovered scalar, and the subset used, so a verifier confirms the fold was correct and the scalar matches `H_s` without re-solving. Serialize the bundle as canonical CBOR. The verifier is a pure function of the bundle plus public keys, and every check has a negative test: altered order hash, altered account mapping, swapped leaf, spliced anchor, under-difficulty stamp, absent solution proof.

- [ ] Steps: failing test, confirm failure, implement, green, gates.

## Task C5: chain validator, consistency wiring, and detection tag

**Wiring inherited from Task C3, which built and tested the algorithms but was scoped away from the files you own.** `consistencyProof` and `verifyConsistency` are exported from `src/core/merkle.ts` and verified against RFC 9162's worked example. Until they are wired, the enforcement gap is open: nothing refuses an inconsistent head at a gate. Do four things:
1. Add `previousTreeSize` and `previousRootHash` to `SignedTreeHeadV1`.
2. Call `consistencyProof` when signing a head and `verifyConsistency` on the gate's head-acceptance path, so §10.5's fail-closed condition for a missing consistency proof is real.
3. Pair it with the existing `verifyHead`. `verifyConsistency` performs **no signature check**, so consistency alone proves nothing about authenticity.
4. Decide and document how the first-ever head bootstraps through the `oldSize === 0` trivial case. C3 flagged that its no-root-check convention there matches Trillian but is a judgment call rather than RFC text, so make the choice explicit rather than inheriting it silently.



**Files:** Create `apps/sige/src/world/chain-validator.ts`; Modify `world.ts`, `records.ts`; Test extend `apps/sige/test/world.test.ts`

Chain validator (§4.1, §8.4) as its own component holding the monotonic state: full header validation, chainwork comparison, rollback refusal, freshness bound, minimum confirmations and cumulative-work delta, and an archive of the evidence handed to the log gate. It prints `ASSUMED` for canonical-chain knowledge every time, because proof of work is not proof of publication.

Detection tag (§6.2.3): `unseal_detection_tag = PRF(unseal_detection_tag_key, event_counter)`, the key stored per account and handed to the user at enrollment. A user scans the public log for their own tags; a third party cannot link a tag to an account. Test both halves: the user finds their tag, and an outsider holding the whole log cannot.

- [ ] Steps: failing test, confirm failure, implement, green, gates.

---

# Phase D — tracks and lifecycle

## Task D1: standard and emergency tracks (§5.5C)

Version 1 MUST enroll **two** escrow envelopes, both proven well-formed at signup. Emergency is exempt from congestion, uses its own leaf type, is counted separately, and requires post-hoc ratification inside a published window, with a public alarm when ratification is absent. The plan's honest line, which the copy must carry: the emergency track's protection is auditability and separate counting, **not** delay.

**Files:** Modify `records.ts`, `world.ts`, `params.ts`, `scenarios.ts`; Test extend `world.test.ts`

- [ ] Steps: failing test, confirm failure, implement, green, gates.

## Task D2: recovery, renewal, migration (§12.2, §12.3, §13.2)

**Files:** Create `apps/sige/src/world/lifecycle.ts`; Test create `apps/sige/test/lifecycle.test.ts`

- Recovery: two-of-N quorum, document-only recovery **forbidden** as the sole mechanism, a published delay, existing-device notification, and a `RECOVERY` leaf with hiding commitments.
- Renewal: linked enrollment, new `enrollment_id` and new ciphertexts, old enrollment marked superseded and not deleted, and no claim that two documents belong to one person.
- Migration: user-assisted rewrap under a new epoch (§13.2 path 1), with the report stating plainly that Boneh-Franklin cannot re-encrypt existing ciphertexts, so old epoch keys must be retained while any unmigrated ciphertext exists.

- [ ] Steps: failing test, confirm failure, implement, green, gates.

## Task D3: the remaining leaf types

**Files:** Modify `records.ts`, `world.ts`; Test extend `records.test.ts`

`EscrowEpoch`, `EnrollmentAccepted`, `AnchorObserved`, `Disclosure`, `POLICY`, `RECOVERY`, `UNSEAL_EMERGENCY`, with the §21 field lists. Disclosure opens selected commitments only after review, and **no automatic timed disclosure exists** (§8.2). A test must assert that no code path publishes case metadata on a timer.

- [ ] Steps: failing test, confirm failure, implement, green, gates.

---

# Phase E — the paper apparatus

## Task E1: the §18.2 conformance suite

**Files:** Create `apps/sige/test/conformance.test.ts`

Every §18.2 MUST-fail as a named test, each citing its spec line: wrong-account ciphertext, commitment paired with an unrelated ciphertext, copied proof with a fresh nonce, duplicate nullifier, order mapped to another enrollment, order from an unaccepted role, inclusion under an inconsistent head, anchor on a lower-work branch, under-spaced anchor, under-difficulty stamp, stale monotonic state, one-gate decryption, **payload recovery without solving the timed commitment including with both master secrets**, a `pi_vtd` mismatched to `t` or `H_s`, a payload whose opening does not match, migration without the user or both gates, a disclosure opened with a wrong salt. Plus the MUST-succeed: `K` reconstructible from the stored record alone.

A passing unseal in any MUST-fail test is a build failure.

- [ ] Steps: write, run, gates. Report the count and the spec line each test cites.

## Task E2: golden vectors (§5.8)

**Files:** Create `apps/sige/src/core/vectors.ts`, `apps/sige/test/vectors.test.ts`, `apps/sige/vectors/*.json`

Deterministic, seeded vectors another implementation can check itself against: CBOR encodings, object hashes, gate identity strings, KEM encapsulation from fixed randomness, LHTLP puzzles, VTD proofs, Merkle roots and both proof types, congestion schedules. Committed as JSON with a documented schema. The test asserts the code reproduces the files byte for byte, so a regression cannot pass quietly.

- [ ] Steps: failing test, confirm failure, implement, green, gates.

## Task E3: reproducibility harness

**Files:** Create `apps/sige/src/bench/reproduce.ts`; Modify `package.json`

One command regenerates every number the paper cites: per-operation timings, the §7.6 feasibility table against its targets and hard maxima, the VTD profile table with soundness bits, measured delay against its published profile, the congestion burst curve with its geometric fit, proof and bundle sizes, and the conformance count. It writes a machine-readable table plus a human-readable summary, and prints the host CPU so a reader can scale.

- [ ] Steps: implement, run, paste the full output, gates.

## Task E4: claim traceability

**Files:** Create `apps/sige/CLAIMS.md`; Modify `apps/sige/src/ui/ledger.ts`

One row per claim: the claim, its §3.1 tier, the spec section, the implementing file and symbol, the covering test, and the scenario that demonstrates it. Every `MATH` row must name a test. The ledger UI links each row to its scenario, and any claim without a covering test is either given one or removed.

- [ ] Steps: write, cross-check every row against the code, gates.

## Task E5: README and honest limits

**Files:** Modify `apps/sige/README.md`

State what runs, what is simulated, what is assumed, and what remains research: the ZK circuit (§7.6 and §22 Open Decision 1), real hardware, a real chain, and legal review. Reproduce §1's bounded claim verbatim rather than paraphrasing it, and keep §21's "not ready for production, not ready to enroll a real identity" in plain sight.

- [ ] Steps: write, verify every printed command runs, gates.

---

## Self-review record

- Spec coverage: §5.5A → A1-A5; §5.4/§5.5 CCA → B3; §5.8 → B4, E2; §6.1 → B1, B2; §6.2 → B5, C4, D3; §7.5/§7.6/§7.7 → C1, E3; §8.1/§8.4 → C3, C5; §8.2 → D3; §5.5C → D1; §12/§13 → D2; §17.1 → C2; §18.2 → E1; §3.1 tiers → E4; §21 honesty → E5.
- Known deliberate deviations: BLS12-381 G1 substitutes for the SNARK-friendly inner curve (A2, labeled); the enrollment relation is clear-mode with real soundness and absent zero-knowledge (C1, labeled); LHTLP setup discards a trapdoor rather than using a class group (A1, labeled `ASSUMED`, matching §5.5A's own reasoning about creation cost); reference byte-parity retired at B2 and replaced by E2.
- Sequencing: Phase A is independent and highest value. B1 and B2 must land before B5, C4, and D3, because those hash canonical records. C3 precedes C4. D1 depends on B5. E1 and E4 come last, since they audit everything above.
