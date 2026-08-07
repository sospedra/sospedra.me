# vouch design

VOUCH: Verified Output Under Canonical History.

- Status: implemented
- Date: 2026-08-05
- Source spec: "Verifiable Algorithm and Canonical Data Architecture" v0.1.0 (2026-08-03)
- Scope: web PoC, rollout Phase 0 per spec section 30 and section 35

## rule of interpretation

The source spec is vendored at apps/vouch/SPEC.md. This document adds definitions only where the spec is silent. The sanctioned deviations are the five items in "deviations". Everything else follows spec text.

## locked decisions

1. Form: scenario dashboard. An in-browser runner over the 22 adversarial
   scenarios from spec section 28.2.
2. Fidelity: byte-exact reference model of spec sections 8 to 18.
3. Execution: shared trace programs. One scenario module feeds both
   `node --test` and the dashboard.
4. Proofs: transparent witness re-execution per spec section 35. No zkVM.

## app shape

- Location: `apps/vouch`. Same mold as `apps/aol`.
- Stack: Vite 8, TypeScript strict, biome, `node --test`.
- Dependencies: `@noble/curves` (Ed25519), `@noble/hashes` (SHA-256). No UI
  framework. Vanilla TS and DOM, the aol and wkc convention.
- Deploy: static Vercel project, root directory `apps/vouch`, framework Vite,
  output `dist`. No environment variables.
- No backend and no network. The server, the prover, and the client verifier
  run in the page as separate actors.
- Determinism: every keypair derives from a labeled seed. Every nonce comes
  from a per-scenario seeded PRNG. A scenario produces identical bytes in CI
  and in the browser.

## protocol core: src/protocol/

One module per future Rust crate concern (spec section 21). All integers use
explicit widths. `u64` is `bigint`.

- `bytes.ts`: concat, `u16be`, `u32be`, `u64be`, hex, byte equality.
- `encode.ts`: canonical encoding v1 (spec 8.1). Writer and reader. The reader
  rejects trailing bytes, invalid lengths, lengths over the per-object limit,
  invalid enum discriminants, invalid UTF-8, integer overflow, and unsupported
  protocol versions.
- `hash.ts`: domain-separated hashing (spec 8.2) with the v1 domain list. The
  magic prefix is `VOUCH` (deviation 1).
- `keys.ts`: Ed25519 keypairs from 32-byte labeled seeds. A key id is the
  32-byte public key.
- `smt.ts`: 256-level sparse Merkle tree (spec 9.2). Precomputed empty-subtree
  table. Membership and non-membership proofs. Deterministic sequential batch
  update. Root recomputation from a witness after a leaf update.
- `state.ts`: logical key layout (spec 9.1) and canonical value encodings.
  Namespaces: `app/account/<id>`, `app/transfers/<id>`, `author/<key_id>`,
  `keys/receipt/<key_id>`, `config/<name>`, `governance/migration`,
  `sys/sequence`, `sys/program-chain`.
- `events.ts`: `AuthorEventV1`, `GlobalEventRecordV1`, `WriteAckV1`
  (spec 10). Signing inputs and `event_hash` exactly per spec.
- `transition.ts`: the update program (spec 10.1, 11). Author signature,
  author sequence contiguity, chain tips, authorization, global sequence
  contiguity, config activation, migration boundary, key lifecycle. Emits
  `TransitionJournalV1` plus a transparent transition proof.
- `query.ts`: query programs `get-balance` and `list-transfers` (spec 12).
  `QueryRequestV1`, canonical results, `QueryJournalV1`, transparent query
  proof.
- `receipt.ts`: `QueryReceiptV1`, receipt signature, `proof_cache_key`
  (spec 13).
- `head.ts`: `LatestHeadV1` and the freshness policy (spec 14). Max age and
  clock-skew allowance are integer trust anchors.
- `program.ts`: `ProgramManifestV1`, `ProgramMigrationV1`, program identity,
  program-chain commitment (spec 15, 16.2).
- `trust.ts`: `ClientTrustStateV1` (spec 18) and genesis initialization from
  the pinned anchors (spec 5.2).
- `verify.ts`: the terminal verifier. The 19 steps of spec section 17, in
  order, fail closed. Typed errors use the spec 29.3 list verbatim. Output:
  canonical result, next trust state, evidence objects.
- `evidence.ts`: head-conflict and omission evidence objects, labeled with the
  spec section 6 taxonomy.

## transparent proof construction

A transition proof carries the ordered global event records plus one SMT
witness per state read and per state write. Each witness is valid against the
intermediate root at its position in the replay. The verifier replays in
order: verify the witness, apply the update-program rule, recompute the root
from the witness siblings, and continue. The final root must equal the journal
`end_root`.

A query proof carries every state read with a membership or non-membership
witness against the query root. Completeness for `list-transfers` comes from a
membership witness on the per-account index key. The verifier re-executes the
published query program over the witnessed reads and compares the result hash.

## definitions where the spec is silent

The spec domain list is open ("Required Version 1 domains include"). The PoC
adds two domains and defines four constructions.

1. Witness encoding. `SmtWitnessV1 { path: [u8;32], leaf: [u8;1] || opt,
   bitmap: [u8;32], siblings: list<[u8;32]> }`. `leaf` is `0x00` for absence
   or `0x01` followed by the 32-byte `value_hash`. The bitmap marks non-empty
   siblings. Empty siblings come from the protocol empty table.
2. Program identity (spec 15.1). Real, computed hashes over real artifacts,
   with one substitution named explicitly:
   - `lockfile_hash`: SHA-256 over the exact bytes of the repo's single
     `pnpm-lock.yaml` (normalized to `\n` line endings). A pnpm workspace has
     one lockfile for every package, so this is coarser than a per-crate
     `Cargo.lock`: any workspace package's dependency edit flips it, not only
     `apps/vouch`'s own. Reproducing the finer-grained closure would mean
     re-deriving pnpm's own resolution graph, a worse source of truth than
     the lockfile pnpm already wrote.
   - `toolchain_hash`: SHA-256 over the length-framed concatenation of three
     pinned facts: `apps/vouch/package.json`'s `engines.node` (`24.x`), the
     resolved `typescript` version read from `node_modules/typescript/
     package.json` (kept in sync with the pnpm-workspace catalog by `pnpm
     install`, not re-derived from the lockfile's YAML to avoid a hand-rolled
     parser), and the root `package.json`'s `packageManager` field
     (`pnpm@11.13.0`).
   - `build_recipe_hash`: SHA-256 over the length-framed concatenation of
     `vite.config.ts`, `tsconfig.json`, the `@repo/typescript-config/
     base.json` it extends (resolved via Node module resolution, since it
     genuinely changes compiler behavior), and the literal `build` script
     string (`vite build`).
   - `program_source_hash`, replacing `guest_binary_hash`. A Merkle-ordered
     list of `(relative_path, sha256(file_bytes))` pairs, sorted by path,
     hashed together. The file set is the real transitive closure of
     relative `.ts` imports starting from one entry file per program,
     computed by walking the TypeScript AST (`scripts/source-graph.ts`), not
     hand-picked: `src/protocol/transition.ts` for the update program (13
     files) and `src/protocol/query.ts` for the query program (11 files,
     strictly missing `events.ts` and `keys.ts`, which only the update
     program needs to verify author signatures).
   - `program_id = hash("program-id", lockfile_hash, toolchain_hash,
     build_recipe_hash, program_source_hash)`. This is the first use of the
     `program-id` domain for its own literal purpose; previously it hashed a
     bare label.
   - `source_commit` and `source_repository` are metadata, excluded from
     `program_id` exactly as in spec 15.1's own four-field formula.
     `scripts/program-id.ts` never reads git. Both fields default to an
     empty byte string. Each one only carries a value when the caller
     passes `--source-commit=<hash>` or `--source-repository=<url>`
     explicitly. A default, flagless run never touches an ambient commit
     or remote. It reproduces identically from any clone, any fork, or a
     downloaded tarball.

   Honesty boundary, stated plainly. `program_source_hash` is a
   substitution for `guest_binary_hash`, not an equivalent. It binds the
   source text an independent party can read and re-hash. It does not bind
   an executed artifact, and it cannot detect a compromised compiler: a
   corrupted `tsc`, bundler, or JS engine could turn this exact, honestly
   hashed source into malicious running code without changing
   `program_source_hash` at all. A real `guest_binary_hash` over a
   reproducibly compiled binary closes that gap. Nothing in a TypeScript
   PoC can.

   `manifestFor('update' | 'query')` in `src/protocol/program.ts` is
   browser-safe: it never touches the filesystem. It reads `lockfile_hash`,
   `toolchain_hash`, and `build_recipe_hash` from the committed
   `fixtures/protocol-v1/program-manifest.json`, but actively recomputes
   `program_source_hash` from that same file's committed per-file digest
   list, and recomputes `program_id` from all four hashes, on every call.
   The full recomputation from real files on disk, including every file's
   own SHA-256, lives in `scripts/program-id.ts`
   (`pnpm --filter vouch program-id`), which is what wrote that JSON file in
   the first place and is Node-only by necessity (it walks the filesystem).
   Running it against any checkout of this source, including a fork or a
   downloaded tarball with no `.git` directory at all, reproduces the same
   file byte for byte; `test/program-identity.test.ts` asserts exactly that
   against the committed fixture, checks it against the `PROGRAM` constants
   actually running in the app, and checks it is byte-identical across
   repeated runs in the same process.

   `PROGRAM.updateV2` and `PROGRAM.queryV2` exist only to drive the
   migration scenarios (s18, s19). This PoC keeps both the v1 and v2 fee
   curves inside the one `transition.ts` file, gated by an id comparison,
   rather than maintaining a second source tree the way a real v2 release
   would. There is therefore no honest file set to hash for "v2": hashing
   the same files as v1 would silently claim two different programs share
   one id, and inventing a different file set would be fabrication. Both
   ids are instead built by `scenarioFixture(label)`, a labeled,
   non-reproducible placeholder under its own `scenario-fixture` domain,
   never the `program-id` domain. `simulatedManifestFor(label)` builds the
   matching placeholder `ProgramManifestV1` the same way. Every identifier
   involved says "scenario" or "simulated"; treat any id from that path as
   narrative fixture data, not a claim about real code.
3. Program chain. `program_chain_hash = hash("program-chain",
   previous_chain_hash, update_program_id, query_program_id,
   u64be(activation_sequence))`. Genesis uses a zero previous hash.
4. Demo limits. One `limits.ts` constant object caps payload, witness, result,
   proof, and migration-chain sizes (spec 26) with demo-scale values.

## demo domain

A micro-ledger. It is illustrative only. Operations, as `u16` op codes:

| op | name | authorization |
|---|---|---|
| 1 | `OPEN_ACCOUNT` | author |
| 2 | `TRANSFER` | author |
| 16 | `SET_CONFIG` | governance |
| 17 | `COMMIT_MIGRATION` | governance |
| 18 | `SET_RECEIPT_KEY` | governance |
| 19 | `SET_AUTHOR` | governance |

`TRANSFER` charges a fee from `config/fee_basis_points` (genesis value 250).
`SET_CONFIG` and `COMMIT_MIGRATION` carry an explicit `activation_sequence`
enforced by the update program. Genesis seeds: one governance key, two author
keys (alice, bob), one receipt/head key, initial config, and the v1 program
ids.

## actors: src/actors/

- `server.ts`: the untrusted operator. Owns the tree, the event log, and the
  online keys. Sequences events, builds transparent proofs, signs receipts,
  acks, and heads. Internals are public on purpose: scenarios play the
  malicious operator by direct mutation.
- `client.ts`: builds requests, generates nonces, holds trust state in an
  atomic in-memory store, and calls the verifier.

## scenario programs: src/scenarios/

One module per scenario:

```ts
interface Scenario {
  meta: { id: number; slug: string; title: string;
          taxonomy: Taxonomy; specRefs: string[] };
  run(): Trace;
}
```

`run()` is pure, synchronous, and deterministic. A trace is a list of steps
plus a verdict. A step has an actor (`author`, `server`, `client`,
`attacker`, `peer`), a kind (`act`, `object`, `check`), a one-line label, and
optional canonical objects. An object carries name, type, canonical hex, hash,
and a decoded field view. A verdict is `ACCEPT`, `REJECT` with a typed error,
`EVIDENCE`, or `LIMITATION`.

The 22 scenarios map to spec section 28.2 in order:

| # | slug | verdict |
|---|---|---|
| 1 | author-concurrency | ACCEPT |
| 2 | payload-tampering | REJECT `INVALID_SIGNATURE` |
| 3 | author-replay | REJECT `INVALID_PROOF` |
| 4 | honest-query | ACCEPT |
| 5 | hidden-algorithm | REJECT `INVALID_PROOF` |
| 6 | shared-proof | ACCEPT twice, one proof artifact |
| 7 | missing-signature-nonce-replay | REJECT `INVALID_SIGNATURE`, `NONCE_MISMATCH` |
| 8 | database-swap | REJECT `INVALID_PROOF` |
| 9 | env-var-semantics | REJECT `INVALID_PROOF` |
| 10 | returning-rollback | REJECT `ROLLBACK_DETECTED` |
| 11 | isolated-freeze | LIMITATION |
| 12 | head-conflict-gossip | EVIDENCE |
| 13 | stale-head | REJECT `STALE_HEAD` |
| 14 | omitted-write | EVIDENCE |
| 15 | missed-proof-deadline | LIMITATION |
| 16 | float-config | REJECT `MALFORMED_CANONICAL_OBJECT` |
| 17 | config-timelock | ACCEPT at boundary, REJECT early |
| 18 | early-migration | REJECT `INVALID_PROGRAM_CHAIN` |
| 19 | migration-chain | ACCEPT across eras |
| 20 | key-rotation | ACCEPT new key, REJECT old `UNAUTHORIZED_KEY` |
| 21 | first-contact-fork | LIMITATION |
| 22 | authorized-false-data | LIMITATION |

Exact per-scenario error codes are fixed during implementation. The spec 29.3
enum is the closed set.

## dashboard: src/ui/

Single page, vanilla TS.

- Header: name, expansion, the spec section 1 acceptance claim, pinned genesis
  anchors as hash chips.
- Table: 22 rows. Columns: id, title, taxonomy chip, expected verdict, live
  verdict, run time in ms. All scenarios run on the visitor's CPU on load,
  plus a run-all control.
- Row expansion: actor-grouped timeline, object inspector with a decoded-to-
  hex toggle, the section 17 checklist for verification steps, verdict banner.
- Information architecture is fixed here. Visual direction is decided at
  implementation start with the frontend-design skill and owner sign-off.

## golden vectors: fixtures/protocol-v1/

JSON files with `{ name, decoded, hex, hash }` per canonical object, state
roots for empty and multi-update trees, signed samples with seed provenance,
journals, receipts, and heads. A `vectors` package script regenerates them.
The node suite asserts equality. The future Rust port consumes the same files.

## testing

- Unit: encode reject matrix, SMT properties, object round trips, signature
  vectors.
- Vectors: fixture equality against `fixtures/protocol-v1/`.
- Scenarios: all 22 verdicts and error codes asserted.
- Runner: `node --test` with an explicit file list, relative `.ts` imports.
- Final gate: typecheck, lint, test, build, plus a headless Chrome screenshot
  of the dashboard.

## deviations from the source spec

1. The hash magic prefix is `VOUCH`, not `VAPI`. The technique was renamed.
   The spec text updates at its next revision.
2. TypeScript with transparent witness re-execution replaces Rust with zkVM
   proofs. Sanctioned as Phase 0 by spec sections 30 and 35.
3. No Protobuf and no ConnectRPC. Transport is a function call carrying byte
   arrays. The canonical layer is unaffected because Protobuf is
   transport-only per spec 8.3.
4. `program_id`'s `program_source_hash` field substitutes for spec 15.1's
   `guest_binary_hash`. It is a real, reproducible SHA-256 over the actual
   source files that implement each program (see "definitions where the
   spec is silent" above for the full construction and the honesty
   boundary). It binds source text, not a compiled, executed artifact, and
   cannot detect a compromised toolchain the way a real `guest_binary_hash`
   would. `lockfile_hash`, `toolchain_hash`, and `build_recipe_hash` are
   real and not substitutes. Only `program_source_hash` stands in for
   something a TypeScript PoC cannot produce.
5. `ProgramMigrationV1` commits `next_program_manifest_hash` and
   `governance_authorization`, but `chainNext` does not cover either field.
   `chainNext` binds only `next_update_program_id`, `next_query_program_id`,
   and `activation_sequence`. A forged manifest hash or a forged governance
   authorization inside an otherwise-honest migration still verifies. Never
   present a manifest hash from this app as verified.

## verdict kind for compound scenarios

Several scenarios mix accepting and rejecting beats. The verdict kind names
what the scenario CLAIMS, not what its last beat did.

- The rejection is the subject. The scenario exists to show the client
  refusing something. Use `REJECT` with the first rejecting beat's error.
  s07, s10, and s20 follow this.
- The rejection is corroboration. The scenario exists to show a positive
  property holding, and a rejected attempt is the supporting evidence. Use
  `ACCEPT`. s17 follows this: the claim is that the timelock held, and the
  failed early application proves the boundary is real.

A scenario author picks by asking what the trace proves, never by counting
beats or reading the last one.

## non-goals

zkVM proving, network transport, mobile bindings, persistence beyond the
in-memory store, a real gossip transport, performance work, and the spec 19
API surface.

## estimate

Three sessions. Session 1: protocol core, unit tests, golden vectors.
Session 2: actors and the 22 scenario programs. Session 3: dashboard UI and
final gates.
