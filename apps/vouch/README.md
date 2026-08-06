# vouch

Verified Output Under Canonical History. Reference-model PoC of "Verifiable Algorithm and Canonical Data Architecture" v0.1.0.

VOUCH is a browser dashboard. It is a TypeScript reference model of the protocol. VOUCH runs the protocol's core in the browser. That core spans canonical encoding, domain-separated hashing, and the sparse Merkle tree. It also spans event chains, transition and query proofs, receipts, heads, program identity, and the terminal verifier. On load, VOUCH replays 22 adversarial scenarios from the spec and shows the live verdict next to the expected one.

The spec states the acceptance claim in section 1:

```text
The accepted state descends from the pinned genesis through valid,
authenticated state transitions

AND

result = active_published_program(accepted_state, normalized_request)
```

VOUCH is a reference model, not a production system. Its proofs are transparent witness replay. VOUCH does not use a zkVM. VOUCH is the companion artifact of a paper on cryptographically guaranteed code execution.

## Run

```
pnpm --filter vouch dev
```

Open the printed URL. VOUCH runs all 22 scenarios on load. It fills in the verdict and time columns. Each row updates the moment its scenario finishes.

## Test

```
pnpm --filter vouch test
```

269 node tests pass. They cover canonical encoding, hashing, and the sparse Merkle tree. They cover state, events, program identity, and the update and query programs. They cover receipts, heads, the terminal verifier, the golden vectors, all 22 scenarios, the actors, and the registry.

## Deploy

Vercel project settings: root directory `apps/vouch`, framework Vite. Build is `vite build`, output `dist`. No environment variables. The app is a static bundle with no backend and no network calls.

## Spec coverage

| Spec section | Module |
|---|---|
| 5.1 untrusted components | `src/actors/server.ts` |
| 5.2 trusted client anchors | `src/protocol/genesis.ts`, `src/protocol/trust.ts` |
| 5.3 cryptographic assumptions | `src/protocol/keys.ts` |
| 6.2 provable-on-record evidence | `src/protocol/evidence.ts` |
| 8.1 canonical encoding | `src/protocol/encode.ts`, `src/protocol/bytes.ts` |
| 8.2 domain-separated hashing | `src/protocol/hash.ts`, `src/protocol/constants.ts` |
| 9.1 logical state | `src/protocol/state.ts` |
| 9.2 authenticated map | `src/protocol/smt.ts` |
| 10 events and author chains | `src/protocol/events.ts` |
| 10.1, 11 update program and transition proofs | `src/protocol/transition.ts`, `src/protocol/ops.ts`, `src/protocol/view.ts` |
| 12 queries and results | `src/protocol/query.ts` |
| 13.1, 13.2 receipts and proof cache | `src/protocol/receipt.ts` |
| 13.3 final bundle | `src/protocol/bundle.ts` |
| 14 latest-head and freshness | `src/protocol/head.ts` |
| 15, 16.2 program identity and migration | `src/protocol/program.ts` |
| 16.1 configuration timelock | `src/protocol/state.ts`, `src/protocol/transition.ts` |
| 17 client verification algorithm | `src/protocol/verify.ts` |
| 18 client trust state | `src/protocol/trust.ts` |
| 26 resource and DoS limits | `src/protocol/limits.ts` |
| 28.1 golden vectors | `fixtures/protocol-v1/vectors.json`, `scripts/vectors.ts` |
| 28.2 adversarial scenarios | `src/scenarios/` (22 modules) |
| 29.3 verification failure codes | `src/protocol/verify.ts` |

## The 22 scenarios

This table comes from running the registry in `src/scenarios/index.ts`. Each row reads `meta.slug`, `meta.taxonomy`, and `meta.expected` off the live scenario object. Each scenario also ran through `run()`, and its live verdict matched `meta.expected` in all 22 cases.

| # | slug | taxonomy | verdict |
|---|---|---|---|
| 01 | author-concurrency | PREVENTED_BY_MATH | `ACCEPT` |
| 02 | payload-tampering | PREVENTED_BY_MATH | `REJECT INVALID_PROOF (author-signature)` |
| 03 | author-replay | PREVENTED_BY_MATH | `REJECT INVALID_PROOF (author-sequence)` |
| 04 | honest-query | PREVENTED_BY_MATH | `ACCEPT` |
| 05 | hidden-algorithm | PREVENTED_BY_MATH | `REJECT INVALID_PROOF (result)` |
| 06 | shared-proof | PREVENTED_BY_MATH | `ACCEPT (twice)` |
| 07 | missing-signature-nonce-replay | PREVENTED_BY_MATH | `REJECT INVALID_SIGNATURE then REJECT NONCE_MISMATCH` |
| 08 | database-swap | PREVENTED_BY_MATH | `REJECT INVALID_PROOF (continuity)` |
| 09 | env-var-semantics | PREVENTED_BY_MATH | `REJECT INVALID_PROOF (result)` |
| 10 | returning-rollback | PREVENTED_BY_MATH | `REJECT ROLLBACK_DETECTED` |
| 11 | isolated-freeze | LIMITATION | `LIMITATION` |
| 12 | head-conflict-gossip | PROVABLE_ON_RECORD | `EVIDENCE (head-conflict)` |
| 13 | stale-head | PREVENTED_BY_MATH | `REJECT STALE_HEAD` |
| 14 | omitted-write | PROVABLE_ON_RECORD | `EVIDENCE (ack-omission)` |
| 15 | missed-proof-deadline | LIMITATION | `LIMITATION` |
| 16 | float-config | PREVENTED_BY_MATH | `REJECT INVALID_PROOF (payload)` |
| 17 | config-timelock | POSSIBLE_UNDER_GOVERNANCE | `ACCEPT` |
| 18 | early-migration | POSSIBLE_UNDER_GOVERNANCE | `REJECT INVALID_PROGRAM_CHAIN (migration-activation-sequence)` |
| 19 | migration-chain | POSSIBLE_UNDER_GOVERNANCE | `ACCEPT` |
| 20 | key-rotation | POSSIBLE_UNDER_GOVERNANCE | `REJECT UNAUTHORIZED_KEY then ACCEPT` |
| 21 | first-contact-fork | LIMITATION | `LIMITATION` |
| 22 | authorized-false-data | LIMITATION | `LIMITATION` |

## Deviations from the letter

1. The hash magic prefix is `VOUCH`, not `VAPI`. The spec text uses `VAPI`. This is a sanctioned, documented deviation.
2. TypeScript with transparent witness replay stands in for Rust with zkVM proofs. Spec sections 30 and 35 sanction this as Phase 0.
3. VOUCH has no Protobuf and no ConnectRPC. Transport is a function call. It carries byte arrays. The canonical layer is unaffected. Protobuf is transport-only per spec 8.3.
4. `program_id` for the update and query programs is a real, reproducible identity, not a stand-in. It is `hash('program-id', lockfile_hash, toolchain_hash, build_recipe_hash, program_source_hash)`. `lockfile_hash` is SHA-256 over the repo's `pnpm-lock.yaml`. `toolchain_hash` covers the pinned node, typescript, and pnpm facts. `build_recipe_hash` covers `vite.config.ts`, `tsconfig.json`, and the build script. `program_source_hash` is a Merkle-ordered SHA-256 over the real source files each program imports: 13 files for update, 11 for query. Run `pnpm --filter vouch program-id` to recompute all of it. It prints the derived ids and rewrites the committed `fixtures/protocol-v1/program-manifest.json`. The command never reads git. Any clone, fork, or tarball checkout reproduces the same file byte for byte. The one honest gap, stated plainly: `program_source_hash` substitutes for spec 15.1's `guest_binary_hash`. It binds source text an auditor can re-hash, not a compiled, executed binary. It cannot detect a compromised toolchain the way a real guest-binary hash would. Separately, `PROGRAM.updateV2` and `PROGRAM.queryV2` exist only to drive the migration scenarios (s18, s19). This PoC keeps both fee curves in one `transition.ts` file, not a second source tree. Those two ids are therefore `scenarioFixture` placeholders under their own domain. They are labeled and non-reproducible by design, never real derived ids.
5. VOUCH commits `nextProgramManifestHash` and `governanceAuthorization` inside `ProgramMigrationV1`, but `chainNext` does not cover them. A forged value in either field still verifies. Never present a manifest hash from this app as verified.

## Golden vectors

`fixtures/protocol-v1/vectors.json` holds 68 entries: 18 domain-separated hashes, 39 canonical object encodings, 4 program-id derivations (2 real, for the update and query programs, and 2 labeled `scenario-fixture` simulations for the v2 migration narrative), 4 sparse-Merkle-tree roots, 2 Ed25519 signatures, and 1 program-chain hash. Each entry carries a name, its decoded fields, and its canonical hex. `scripts/vectors.ts` (`pnpm --filter vouch vectors`) regenerates the file from the live protocol code. `test/vectors.test.ts` asserts the regenerated output against the committed fixture, byte for byte.

`fixtures/protocol-v1/program-manifest.json` is the companion artifact for program identity specifically: the real lockfile, toolchain, and build-recipe hashes, plus the full per-file source list and digest for each program. `scripts/program-id.ts` (`pnpm --filter vouch program-id`) recomputes it from the checked-out source and prints a summary. `test/program-identity.test.ts` recomputes it independently and asserts the content matches, and that it is byte-identical across repeated runs in the same checkout.

The file exists, so an independent implementation can check conformance without reading TypeScript. Spec 28.1 requires golden vectors. The same vectors must run against every implementation of the protocol. Any independent port can decode `vectors.json` and assert equality on `hex` alone.

## What this does not prove

The spec defines four guarantee labels in section 6. Every claim in this app uses exactly one.

- `PREVENTED_BY_MATH`: local verification rejects the behavior unless a cryptographic assumption breaks.
- `PROVABLE_ON_RECORD`: the behavior can happen, but a signed or proven object turns it into portable evidence.
- `POSSIBLE_UNDER_GOVERNANCE`: committed authorization and a timelock allow the behavior, deliberately.
- Limitations: the protocol leaves a real gap open.

Spec 6.4 is explicit: "Limitations MUST NOT be presented as guarantees."

VOUCH ships four `LIMITATION` scenarios. Each one shows a verification ladder. The ladder passes cleanly. A real gap stays open anyway.

- s11, isolated freeze: a frozen server and an honestly caught-up server produce the same passing checks. The spec's required sentence for this boundary is "Rollback is prevented for returning clients; freezing is not."
- s15, missed proof deadline: an overdue proof is a local timer, not evidence. Spec 6.2: "The absence of a message is not positive evidence. A missed proof deadline is locally observable but is not, by itself, portable proof that the server never delivered the proof elsewhere."
- s21, first-contact fork: a first-contact client verifies genesis descent, not global uniqueness. Two histories can both descend honestly from the same pinned genesis. They can diverge from there. First contact alone cannot tell which one is canonical.
- s22, authorized false data: a correctly authorized, correctly processed write can still carry a false real-world claim. Spec section 4: "The system does not guarantee that authorized input data is true in the physical world."

Spec section 4 lists nine non-goals. VOUCH does not guarantee benevolent, bug-free, backdoor-free published code. It does not guarantee real-world truth for authorized input data. It does not guarantee availability, liveness, censorship resistance, or timely proof delivery. It does not prevent server-side freezing for an isolated client. It does not guarantee freshness certainty for a first-contact client without an external head reference. Skipping local verification voids every guarantee here. So does displaying unverified data without checking it. It does not guarantee secrecy of query inputs or state. It does not disprove additional hidden server code. It does not guarantee one canonical global history if the operator equivocates, without cross-client comparison.

The verifier never checks the signed latest-head statement's `updateProgramId`, `queryProgramId`, or `programChainHash` against the walked chain. It checks `stateRoot` only when the head's sequence equals the receipt's own sequence. These fields are signed, not verified. Never render them as verified.

Two more gaps belong to this implementation, not the protocol. `program_id`'s `program_source_hash` binds real source text, not a compiled, executed binary, so it cannot catch a compromised toolchain the way spec 15.1's `guest_binary_hash` would (deviation 4). VOUCH stores a migration's manifest hash and governance authorization but does not check them (deviation 5). This repeats them on purpose. A paper reviewer should not have to find them twice.
