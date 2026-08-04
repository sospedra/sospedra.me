# vouch design

VOUCH: Verified Output Under Canonical History.

- Status: approved design, pre-implementation
- Date: 2026-08-05
- Source spec: "Verifiable Algorithm and Canonical Data Architecture" v0.1.0 (2026-08-03)
- Scope: web PoC, rollout Phase 0 per spec section 30 and section 35

## rule of interpretation

The source spec wins over this document in any conflict. This document adds
definitions only where the spec is silent. The sanctioned deviations are the
three items in "deviations". Everything else follows spec text.

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
adds one domain and defines three constructions.

1. Witness encoding. `SmtWitnessV1 { path: [u8;32], leaf: [u8;1] || opt,
   bitmap: [u8;32], siblings: list<[u8;32]> }`. `leaf` is `0x00` for absence
   or `0x01` followed by the 32-byte `value_hash`. The bitmap marks non-empty
   siblings. Empty siblings come from the protocol empty table.
2. Program identity. The transparent model has no guest binary. The stand-in:
   `program_id = hash("program-id", ascii_name)`, for example
   `vouch-update-v1`. The verifier holds a fixed registry from `program_id` to
   the TS implementation. This registry is the PoC terminal wrapper
   (spec 15.2).
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

## non-goals

zkVM proving, network transport, mobile bindings, persistence beyond the
in-memory store, a real gossip transport, performance work, and the spec 19
API surface.

## estimate

Three sessions. Session 1: protocol core, unit tests, golden vectors.
Session 2: actors and the 22 scenario programs. Session 3: dashboard UI and
final gates.
