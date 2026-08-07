# vouch proof campaign design

- Status: approved design, 2026-08-07
- Goal: prove the VOUCH thesis completely
- Source spec: "Verifiable Algorithm and Canonical Data Architecture" v0.1.0 (2026-08-03)
- Thesis: the spec section 33 final claim. An accepted final response proves published program + canonical state descended from pinned genesis + this exact normalized request = this exact accepted result.

## scope

Three tracks, strictly sequential.

- Track A: formal proofs and repairs over the TypeScript reference model in `apps/vouch`.
- Track B: clean Rust protocol core, spec phase 1.
- Track C: real zkVM guests, the thesis slice of spec phase 4.

Out of scope: Protobuf and ConnectRPC transport (phase 2), mobile bindings (phase 3), production hardening (phase 5), proof recursion and compression, gossip transport, performance work.

## locked decisions

1. Tracks run A then B then C. Track A changes the byte contract, so B and C consume its output.
2. The Rust home is `apps/vouch/rust`, a self-contained cargo workspace. A thin `package.json` wraps cargo commands with `ci:` scripts for turbo.
3. The zkVM is RISC Zero. Plain STARK receipts are transparent with no trusted setup, which spec 5.3 prefers. Accelerator crates cover SHA-256 and Ed25519. SP1 is the named fallback if the track C spike fails.
4. `labs/crypto-verificable-promises` is temporary and dies soon. Nothing is inherited from it. Track A rescues the spec text first.
5. The wire protocol stays v1 through the spec revision. The spec is a pre-publication draft. No deployed verifier pins the old bytes. The spec changelog records the break.

## track A: prove and repair the reference model

### A1 spec rescue and revision

1. Vendor the spec verbatim into `apps/vouch/SPEC.md` before the temporary repo dies.
2. Revise to v0.1.1. Section 16.2 gains: the old era's final journal MUST commit `next_program_manifest_hash` and a governance-authorization digest, alongside the next program ids and activation sequence it commits today. A changelog section records every revision the proofs force.
3. v0.1.1 defines the program identity field rule: `program_source_hash` identifies Phase 0 programs, `guest_binary_hash` identifies zkVM-era programs.

### A2 theorem set

`apps/vouch/PROOFS.md` is the paper appendix source. Two genres plus completeness.

Safety induction: any state the verifier accepts descends from the pinned genesis through valid authenticated transitions. Induction over the chain walk, spec 17 steps 14 and 15.

Reduction lemmas, one per `PREVENTED_BY_MATH` item in spec 6.1. Each lemma: an adversary that makes the verifier accept the forbidden behavior breaks a spec 5.3 primitive.

| # | Forbidden behavior | Verifier steps | Reduces to |
|---|---|---|---|
| T1 | response tampering | 9, 10 | SHA-256 CR |
| T2 | signature forgery | 4, 5, 16 | Ed25519 EUF-CMA |
| T3 | invalid inclusion or non-inclusion path | 12, 13 | SHA-256 CR |
| T4 | invalid state transition | 14, 15 | both |
| T5 | output unbound to request, root, or program | 13 | SHA-256 CR |
| T6 | nonce replay | 6 | exact equality, no reduction |
| T7 | rollback against a returning client | 11, 18 | persisted monotonicity, no reduction |

Completeness theorem: an honest server passes all 19 steps. The honest scenario beats witness it.

Freshness is a labeled limitation, not a theorem. It keeps the spec 6.4 wording: rollback is prevented for returning clients, freezing is not. Equivocation gets a `PROVABLE_ON_RECORD` evidence lemma: two conflicting signed heads for one window form portable evidence.

Assumption discharge: spec 5.3 lists zkVM soundness and binary-identity binding as assumptions. Replay mode discharges them by direct evaluation. Track C discharges them constructively with real guests and a real `guest_binary_hash`.

### A3 forced repairs

A soundness theorem cannot stand next to a known forgery. Three repairs enter track A as obligations.

1. Governance hole. Implement the 16.2 revision: `chainNext` covers `next_program_manifest_hash` and the governance-authorization digest. Add an adversarial scenario: a forged governance authorization inside an otherwise-honest migration must reject. All 68 vectors and both program ids regenerate.
2. Era check. `matchWalkedEraToReceipt` skips the walked era's `updateProgramId` today. The induction proof decides its fate: the comparison lands, or the proof shows the transition-layer check subsumes it.
3. Key state. `activeKeyStateHash` is a dead ZERO32. Spec 18 puts `active_key_state_hash` in the client trust state. Track A binds it to the key lifecycle events, or the spec revision marks the field reserved. The key-rotation scenarios decide which.

### A4 mechanical adversary

Zero new dependencies.

1. Check-flip mutation harness. A script enumerates every concrete predicate behind the 19 verifier steps, generates one mutant per predicate (skip or invert) into a scratch copy of `src/`, and runs the suite against the scratch. The harness fails if any mutant leaves the suite green. Every surviving mutant becomes a new scenario or vector.
2. Seeded property fuzzers. The existing per-scenario seeded PRNG generates object corpora. Properties: encode-decode round-trips, decode rejects every single-byte mutation of valid bytes, SMT witness forgeries fail, chain splices fail. Fixed seeds, deterministic in CI.

### A5 audit matrix

A table in `PROOFS.md` maps every spec 6.1 item to its lemma, the exact `verify.ts` lines, the scenario that exercises it, and the vector that pins the bytes. No claim ships without all four cells.

## track B: rust core

Clean build in `apps/vouch/rust`. Crates: `vouch-core` (encoding, hashing, SMT, state, events, programs, receipts, heads, verifier), `vouch-cli` (vector runner, scenario runner).

Conformance contract, one direction. The TS reference generates the regenerated vectors, scenario expectations, and the program manifest. Rust consumes them and must reproduce byte-exactly. Differential replay: identical seeded streams through TS and Rust must produce byte-equal encodings and verdict-equal scenarios.

## track C: zkVM guests

1. Spike gate, one day: prove and verify one trivial RISC Zero guest end to end on the development machine. Failure switches the campaign to SP1 before any real guest work.
2. Guests: `vouch-guest-update` and `vouch-guest-query`, journals byte-exact per spec 11.1 and 12.3, matching the TS journals for identical inputs.
3. Identity: `guest_binary_hash` becomes real. A reproducible-build recipe pins the toolchain and locked dependencies. A rebuild check recomputes the hash from published source.
4. Receipts: the prover CLI emits receipt fixtures. The verifier CLI checks them with pinned verification parameters.

## acceptance criteria

1. Every golden vector passes on node, native Rust, and inside the zkVM guest.
2. Every scenario passes on the TS and Rust verifiers, including the new governance-forgery scenario.
3. The mutation harness reports zero surviving mutants across the 19 verifier steps.
4. Guest identities rebuild reproducibly from published source.
5. `PROOFS.md` maps every spec 6.1 item to a lemma, a code line, a scenario, and a vector.

## estimates

Track A: 3 to 4 sessions. Track B: 1 to 2 weeks. Track C: 1 to 2 weeks after the spike.

## risks

1. Vector regeneration cascade. The program identity binds the root `pnpm-lock.yaml`, and sibling work holds an uncommitted lockfile edit today. Pre-flight for the A3 regeneration: let the sibling lockfile work land, run `pnpm program-id`, confirm the suite is green, then start.
2. Guest constraints. The TS reference uses noble libraries. Guests use `sha2` and `ed25519-dalek` accelerator forks. The journal byte layout must match canonical encoding exactly, with no serde defaults.
3. Proof-forced spec changes beyond 16.2. The induction may surface more holes. Each becomes a v0.1.1 changelog entry and, where needed, a new scenario. The campaign treats new holes as findings, not failures.
