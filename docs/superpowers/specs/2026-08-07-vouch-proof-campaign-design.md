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
2. The Rust home is `apps/vouch/rust`, a self-contained cargo workspace with no package.json of its own. The existing `apps/vouch/package.json` drives cargo through scripts. The pnpm workspace and the root lockfile stay untouched, which protects the lockfile-bound program identity.
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
| T2 | signature forgery, receipt or head or author or governance | 4, 5, 14, 16 | Ed25519 EUF-CMA |
| T3 | invalid inclusion or non-inclusion path | 12, 14 | SHA-256 CR |
| T4 | invalid state transition | 14, 15 | both, plus proof-system and verifier correctness per 5.3 |
| T5 | output unbound to request, root, or program | 7-10, 12, 13, 15 | SHA-256 CR |
| T6 | nonce replay | 6 | equality, under the client-nonce-freshness hypothesis |
| T7 | rollback against a returning client | 11, 14, 18 | descent plus persisted monotonicity |

Theorem statements carry their hypotheses explicitly. Theorem S holds only for a trust state that is the pinned genesis or the atomically persisted output of a prior accepting run, per spec 5.2 and 18. T6 holds only when the client generates a fresh single-use nonce per request. The theorems target the spec 17 algorithm. `verify.ts` is the reference witness. Each implementation carries a tested-conformance refinement argument, not a transferred proof.

Completeness theorem: an honest server passes every step vouch models. Steps 1 and 2 (Protobuf transport extraction) have no vouch counterpart per DESIGN deviation 3, and step 18 is proved for the in-memory persistence model only. The scope statement in `PROOFS.md` records this boundary.

Freshness is a labeled limitation, not a theorem. It keeps the spec 6.4 wording: rollback is prevented for returning clients, freezing is not. Equivocation gets a `PROVABLE_ON_RECORD` evidence lemma: two conflicting signed heads for one window form portable evidence.

Assumption instantiation: spec 5.3 lists zkVM soundness and binary-identity binding as assumptions, and they stay assumptions. Replay mode replaces the zkVM assumption with evaluator and runtime correctness. Track C instantiates it with a concrete audited proof system and a real `guest_binary_hash`. The final theorem remains conditional on 5.3 in both modes, stated per mode.

### A3 forced repairs

A soundness theorem cannot stand next to a known forgery. Three repairs enter track A as obligations.

1. Governance hole. Implement the 16.2 revision: the chain link commits the digest of the full canonical migration object. This gives substitution-proofness, presented bytes equal committed bytes, and nothing more. Authorization validity comes from the governance-role gate on `OP.COMMIT_MIGRATION` inside transition replay (`transition.ts:261`), and the blob's internal structure stays open per spec 32 item 8. The spec revision states this split. The mutation harness covers the role gate. Add an adversarial scenario: a forged governance authorization inside an otherwise-honest migration must reject. All 68 vectors and both program ids regenerate.
2. Era check. `matchWalkedEraToReceipt` skips the walked era's `updateProgramId` today. The induction proof decides its fate: the comparison lands, or the proof shows the transition-layer check subsumes it.
3. Key state. `activeKeyStateHash` is a dead ZERO32. Spec 18 puts `active_key_state_hash` in the client trust state. Track A binds it to the key lifecycle events, or the spec revision marks the field reserved. The key-rotation scenarios decide which.

### A4 mechanical adversary

Zero new dependencies.

1. Check-flip mutation harness. A script enumerates every concrete predicate behind the 19 verifier steps, generates one mutant per predicate (skip or invert) into a scratch copy of `src/`, and runs the suite against the scratch. The harness fails if any mutant leaves the suite green. Every surviving mutant becomes a new scenario or vector.
2. Seeded property fuzzers. The existing per-scenario seeded PRNG generates object corpora. Three property families, split per the decoder's actual contract: canonical uniqueness (no single-byte mutation round-trips to the original bytes), malformed-encoding rejection (truncation, trailing bytes, oversized lengths, invalid discriminants), and authenticated-object tampering (a content mutation decodes but fails the signature, hash, or witness check downstream). Plus SMT witness forgeries fail and chain splices fail. Fixed seeds, deterministic in CI.

### A5 audit matrix

A table in `PROOFS.md` maps every spec 6.1 item to its lemma, the exact `verify.ts` lines, the scenario that exercises it, and the vector that pins the bytes. No claim ships without all four cells.

## track B: rust core

Clean build in `apps/vouch/rust`. Crates: `vouch-core` (encoding, hashing, SMT, state, events, programs, receipts, heads, verifier), `vouch-cli` (vector runner, scenario runner).

Conformance contract, one direction. The TS reference generates the regenerated vectors, scenario transcripts, and the program manifest. Rust consumes them and must reproduce byte-exactly. Scenario transcripts are a language-neutral fixture format the TS scenarios export: the seeded action list, the tamper operations, the intermediate commitments, and the expected verdict with its failing rule string. A verdict match alone does not count, the failing rule must match too, so a Rust rejection for the wrong reason fails conformance. Differential replay: identical seeded streams through TS and Rust must produce byte-equal encodings and rule-equal verdicts.

## track C: zkVM guests

1. Spike gate, one day: prove and verify one trivial RISC Zero guest end to end on the development machine. Failure switches the campaign to SP1 before any real guest work.
2. Guests: `vouch-guest-update` and `vouch-guest-query`, journals byte-exact per spec 11.2 and 12.4, matching the TS journals for identical inputs. Guests also run the applicable rejection vectors: bad signatures, incomplete query witnesses, wrong chains, and invalid migrations must abort the guest, per the 11.1 and 12.3 statements.
3. Identity: `guest_binary_hash` becomes real, and the binding is an equation the terminal verifier enforces: the RISC Zero image id derives from the exact guest ELF bytes, the manifest commits that image id as `guest_binary_hash`, the `program_id` derives from the manifest, and the verifier accepts a proof only when the receipt's image id equals the pinned image id for the journal's `program_id`. A guest cannot journal a foreign id. A reproducible-build recipe pins the toolchain and locked dependencies. A rebuild check recomputes the image id from published source.
4. Era bridge: track C does not rewrite Phase 0 history. The zkVM era enters through a committed, timelocked `ProgramMigrationV1` from the Phase 0 era to the guest era, exercising the 16.2 mechanism for real. Phase 0 vectors stay valid for the Phase 0 era.
5. Receipts: the prover CLI emits receipt fixtures. The verifier CLI checks them with pinned verification parameters.

## acceptance criteria

1. Every applicable golden vector passes on node, native Rust, and inside the zkVM guest. Vectors with no guest counterpart (heads, client persistence) pass on node and Rust.
2. Every scenario transcript passes on the TS and Rust verifiers with rule-equal verdicts, including the new governance-forgery scenario.
3. The mutation harness reports zero surviving mutants across the modeled verifier steps and the transition role gates.
4. Guest identities rebuild reproducibly from published source, and the image-id equation from track C item 3 holds.
5. `PROOFS.md` maps every spec 6.1 item to a lemma, a code line, a scenario, and a vector.
6. Composition: one flow takes a signed `QueryReceiptV1`, a real query proof, real transition proofs, a migration walk, and a pinned trust state, and returns one accepted result on the Rust terminal verifier in the guest era. The same flow with any single component tampered returns a typed rejection.

## estimates

Track A: 3 to 4 sessions. Track B: 1 to 2 weeks. Track C: 1 to 2 weeks after the spike.

## risks

1. Vector regeneration cascade. The program identity binds the root `pnpm-lock.yaml`, and sibling work holds an uncommitted lockfile edit today. Pre-flight for the A3 regeneration: let the sibling lockfile work land, run `pnpm program-id`, confirm the suite is green, then start.
2. Guest constraints. The TS reference uses noble libraries. Guests use `sha2` and `ed25519-dalek` accelerator forks. The journal byte layout must match canonical encoding exactly, with no serde defaults.
3. Proof-forced spec changes beyond 16.2. The induction may surface more holes. Each becomes a v0.1.1 changelog entry and, where needed, a new scenario. The campaign treats new holes as findings, not failures.

## amendments, 2026-08-07 codex review

Seventeen findings, each verified against the spec and code before acceptance. Accepted and folded in above: composition acceptance criterion (6), track C era bridge and image-id binding equation, journal sections corrected to 11.2 and 12.4, guest rejection vectors, corrected reduction table with explicit hypotheses, assumption instantiation wording (theorems stay conditional per 5.3), completeness scoped to modeled steps, governance repair split into substitution-proofness plus role-gate validity (spec 32 item 8 stays open), fuzzer property families split per the decoder contract, portable scenario transcripts for Rust, cargo driven from `apps/vouch/package.json` with no workspace change. Spec v0.1.1 additionally renames the hash magic to `VOUCH` (8.2) and adds an execution-mode discriminant to the program manifest (15.1). Rejected: one finding claimed the A3 decisions stayed open, the track A plan closes both (key state binds, era comparison proved subsumed). Deferred to track plans: manifest-pair id-derivation checks apply only when era manifests are real (track C).
