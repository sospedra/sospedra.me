> Vendored verbatim from the source repository on 2026-08-07. This file is
> the gospel text for `apps/vouch`. Revisions append to the changelog below.

## changelog

- v0.1.0 (2026-08-03): vendored baseline.

---

# Verifiable Algorithm and Canonical Data Architecture

**Status:** Draft technical specification  
**Version:** 0.1.0  
**Date:** 2026-08-03  
**Audience:** Protocol, backend, mobile, cryptography, infrastructure, and security engineers

## Contents

- [Purpose, guarantees, and trust model](#1-abstract)
- [System components](#7-system-overview)
- [Canonical encoding and state](#8-canonical-encoding)
- [Events and transition proofs](#10-events-and-author-chains)
- [Queries, receipts, and freshness](#12-queries-and-results)
- [Program publication and governance](#15-program-identity-and-publication)
- [Client verification](#17-client-verification-algorithm)
- [Protobuf, ConnectRPC, and Vercel](#19-protobuf-and-connectrpc-api)
- [Monorepo and implementation requirements](#21-monorepo)
- [Testing, rollout, and acceptance](#28-testing-strategy)

## 1. Abstract

This document specifies a system in which a customer can verify, on their own device, that an API result was produced by a published program over data committed by a canonical, authenticated history.

The system does not attempt to prove that the physical API server exclusively executed the published program. Instead, it makes the following acceptance claim:

```text
The accepted state descends from the pinned genesis through valid,
authenticated state transitions

AND

result = active_published_program(accepted_state, normalized_request)
```

The server may execute hidden code, swap its physical database, alter environment variables, or modify a response in transit. None of those actions produces an accepted final result unless the locally verified receipt, state commitment, program identity, and proof remain valid.

The architecture uses:

- A canonical append-only event history and authenticated state root.
- Per-author signed event chains.
- Batched recursive transition proofs.
- Immediate nonce-bound signed receipts.
- Asynchronous, shareable query proofs.
- A minimal terminal verifier on customer devices.
- Signed latest-head statements and optional peer gossip.
- Timelocked, history-committed configuration, key, and program upgrades.
- Rust for all consensus-critical semantics.
- Protobuf for transport schemas and ConnectRPC for the public mobile API.
- Node.js for API orchestration.
- React Native plus an embedded Rust verifier for the customer application.

No blockchain, federation, external witness, or trusted third-party service is required for correctness. Peer comparison improves detection of split views and freezes but is not a prerequisite for validating an individual proof.

## 2. Normative language

The terms **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** are normative.

Where this specification says that an object is “canonical,” it means the object has exactly one valid byte representation under the protocol version being verified. Protobuf serialization is not canonical and MUST NOT be used directly as the bytes hashed, signed, or proven.

## 3. Goals

### 3.1 Primary goal

A conforming customer client MUST be able to reject any final API response that does not satisfy both of these conditions:

1. The response refers to a state derived from the pinned genesis through valid authenticated transitions.
2. The claimed result is the output of the active published query program over that state and the customer's normalized request.

### 3.2 Secondary goals

- A physical database replacement MUST NOT silently change accepted semantics.
- A hidden server function MAY generate a provisional result, but MUST NOT be able to finalize a false result without breaking the proof system or a pinned cryptographic primitive.
- Returning clients MUST reject rollback beneath their highest accepted sequence.
- Configuration, program, and key changes MUST be visible in canonical history and subject to explicit authorization and activation rules.
- The API MUST support asynchronous proving and shared proof caching.
- The public API MUST work on Vercel without native inbound gRPC.
- Rust, TypeScript, Swift, and Kotlin boundaries SHOULD be generated from one Protobuf schema where the data is transport-level.
- Cross-language implementations MUST share golden test vectors for every consensus-critical byte format.

## 4. Non-goals

The system does not guarantee:

- That published code is benevolent, bug-free, or free of backdoors.
- That authorized input data is true in the physical world.
- Availability, liveness, censorship resistance, or timely proof delivery.
- Prevention of server-side freezing for an isolated client.
- Freshness certainty for a first-contact client without an external head reference.
- Protection for a client that displays unverified data or skips local verification.
- Secrecy of query inputs or state unless the selected proof construction explicitly provides it.
- Proof that the server did not run additional hidden code.
- Canonical global history without some form of cross-client comparison when the operator equivocates.

## 5. Trust and threat model

### 5.1 Untrusted components

The client MUST treat the following as untrusted:

- Node.js API process.
- Rust code executing on server infrastructure outside a proof.
- Physical SQL, key-value, document, cache, or object databases.
- `DATABASE_URL` and every other environment variable.
- Vercel, DNS, CDN, TLS termination, proxies, queues, and networks.
- Server timestamps unless checked against the customer's own clock and interpreted only as signed claims.
- Protobuf-decoded values until the embedded canonical objects are verified.
- Operational logs and observability systems.

### 5.2 Trusted client anchors

The initial customer application distribution MUST contain or otherwise obtain out of band:

- `GENESIS_ROOT`.
- `TERMINAL_VERIFIER_ID`.
- Genesis update-program identity.
- Genesis query-program identity.
- Initial receipt/head verification keys.
- Initial author/governance authorization policy.
- Protocol version and supported canonical encodings.
- Freshness policy defaults.

After first use, the client additionally trusts its own atomically persisted, previously verified state.

### 5.3 Cryptographic assumptions

The design assumes:

- Collision and second-preimage resistance of SHA-256.
- Existential unforgeability of Ed25519 signatures.
- Soundness of the selected zkVM and its recursive/compressed proof system.
- Correct binding between published guest binaries and their program identities.
- Correctness of the terminal verifier implementation and pinned verification parameters.

If a proof system uses a trusted setup, its verification parameters and ceremony assumptions MUST be documented and pinned. A transparent proof system is preferred.

## 6. Guarantee taxonomy

Every externally stated guarantee MUST use exactly one of the following labels.

### 6.1 `PREVENTED_BY_MATH`

Local verification rejects the behavior unless an assumed primitive or proof system is broken. Examples:

- Response tampering.
- Signature forgery.
- Invalid state inclusion/non-inclusion paths.
- Invalid state transitions.
- Output not bound to the request, state root, and active program.
- Nonce replay.
- Rollback against a returning client's persisted state.

### 6.2 `PROVABLE_ON_RECORD`

The behavior may occur, but incompatible signed or proven objects form positive, portable evidence. Examples:

- Two incompatible signed latest-head statements for the same freshness window.
- A signed write acknowledgement whose inclusion boundary is crossed by a later verified history that omits the event.
- An invalid proof explicitly attributable to a signed receipt.

The absence of a message is not positive evidence. A missed proof deadline is locally observable but is not, by itself, portable proof that the server never delivered the proof elsewhere.

### 6.3 `POSSIBLE_UNDER_GOVERNANCE`

The behavior is deliberately permitted only through committed authorization and timelock rules. Examples:

- Program migrations.
- Configuration changes.
- Receipt/head key rotations.
- Author-key lifecycle changes.

### 6.4 Limitations

Limitations MUST NOT be presented as guarantees. The required wording for the principal freshness boundary is:

```text
Rollback is prevented for returning clients; freezing is not.
```

## 7. System overview

```text
React Native application
    |
    | ConnectRPC unary calls carrying Protobuf messages
    v
Node.js API on Vercel
    |\
    | \-- napi-rs native addon --> Rust canonical/provisional core
    |
    \---- durable proof job ----> Rust prover worker
                                      |
                                      \--> proof artifact store

React Native application
    |
    \-- Turbo Native Module / UniFFI --> Rust terminal verifier
```

### 7.1 Components

#### Mobile application

- Creates canonical requests through the Rust mobile module.
- Generates cryptographically random nonces.
- Calls the ConnectRPC API.
- Stores pending signed receipts.
- Polls for proofs.
- Verifies response bundles locally.
- Atomically persists updated trust state before exposing a result as verified.
- MAY gossip signed head objects to peers.

#### Node.js API

- Terminates ConnectRPC requests.
- Performs ordinary authentication, authorization, rate limiting, and abuse controls.
- Calls the Rust native addon for canonical parsing, normalization, hashing, transition prechecks, and provisional query execution.
- Reads projections and witnesses from physical storage.
- Issues signed acknowledgements, receipts, and latest-head claims.
- Submits idempotent proof jobs.
- Serves proof artifacts.

The Node.js API MUST NOT be treated as the authority for canonical semantics.

#### Rust native addon

- Exposes a narrow Node-API surface using `napi-rs`.
- MUST accept and return byte arrays for consensus-critical objects.
- MUST NOT accept ordinary JavaScript objects as the signing or hashing representation.
- SHOULD expose coarse-grained operations rather than many small FFI calls.

#### Rust prover worker

- Claims proof jobs from durable storage.
- Loads authenticated witnesses for the requested root.
- Executes the update or query guest.
- Produces proofs and public journals.
- Verifies that the proven result hash equals the signed provisional result hash.
- Stores immutable proof artifacts keyed by deterministic cache keys.

#### Rust mobile verifier

- Parses canonical protocol objects.
- Verifies signatures, proofs, program migrations, nonces, freshness, and rollback constraints.
- Returns verified application data only after all checks pass.
- Returns the exact next trust state to persist.
- MUST NOT expose an API that allows callers to mark an unverified result as verified.

## 8. Canonical encoding

### 8.1 General rules

Consensus-critical structures MUST use a versioned canonical binary encoding implemented in Rust.

Version 1 uses:

- Unsigned integers encoded big-endian at fixed widths: `u16`, `u32`, `u64`.
- Booleans encoded as exactly `0x00` or `0x01`.
- Fixed hashes encoded as exactly 32 bytes.
- Ed25519 public keys encoded as exactly 32 bytes.
- Ed25519 signatures encoded as exactly 64 bytes.
- Variable byte strings encoded as `u32_be(length) || bytes`.
- Lists encoded as `u32_be(count)` followed by each canonical element.
- Struct fields encoded once, in the field order defined by the protocol version.
- No nulls, implicit defaults, duplicate fields, maps, floating-point values, or platform-sized integers.

Arbitrary payloads SHOULD be represented as bytes. If a protocol string is necessary, it MUST be valid UTF-8 and its normalization and character restrictions MUST be specified per field. Identifiers SHOULD be restricted to lowercase ASCII.

Decoders MUST reject:

- Trailing bytes.
- Non-minimal or invalid lengths.
- Lengths above the object-specific limit.
- Invalid enum discriminants.
- Duplicate logical fields.
- Invalid UTF-8 where a string is required.
- Integer overflow.
- Unsupported protocol versions.

### 8.2 Domain-separated hashing

All protocol hashes MUST use domain separation.

```text
hash(domain, parts...) = SHA256(
    "VAPI" ||
    u16_be(protocol_version) ||
    u16_be(byte_length(domain)) || domain_ascii ||
    for each part: u32_be(byte_length(part)) || part
)
```

Domain labels are lowercase ASCII and versioned by the enclosing protocol version. Required Version 1 domains include:

```text
author-event
author-signing
event-record
write-ack
state-key
state-value
state-leaf
state-node
transition-journal
query-request
query-result
query-journal
query-receipt
latest-head
program-chain
proof-cache-key
```

The same digest MUST NOT be reused across semantic domains.

### 8.3 Protobuf boundary

Protobuf messages MAY carry canonical objects in `bytes` fields. Ordinary Protobuf serialization MUST NOT be:

- Signed.
- Hashed as the persistent object identity.
- Used as a Merkle leaf without first converting it to a canonical Rust representation.
- Used as the zkVM public journal encoding.

## 9. Canonical state commitment

### 9.1 Logical state

The canonical state is a versioned logical key-value map. It includes:

- Application data.
- Per-author chain tips.
- Active author keys and lifecycle data.
- Active receipt/head keys.
- Governance configuration.
- Integer-only algorithm configuration.
- Pending and active program migrations.
- Current global sequence.
- Program-chain commitment.

Environment variables and deployment configuration MUST NOT alter these semantics.

### 9.2 Authenticated map

The production design SHOULD use a 256-level sparse Merkle tree:

```text
path       = hash("state-key", logical_key_bytes)
value_hash = hash("state-value", canonical_value_bytes)
leaf_hash  = hash("state-leaf", path, value_hash)
node_hash  = hash("state-node", left_child_hash, right_child_hash)
```

Empty subtree hashes MUST be protocol constants recursively derived from a domain-separated empty leaf.

The authenticated map MUST support:

- Membership proofs.
- Non-membership proofs.
- Deterministic batch updates.
- Deterministic root calculation across native Rust, zkVM guest, and test implementations.

The physical database MAY store arbitrary indexes and projections. A database row has no authority unless it is tied to the accepted root through a verified witness or proof.

### 9.3 Root identity

A canonical head is identified by:

```text
HeadId {
  sequence: u64,
  state_root: [u8; 32],
  update_program_id: [u8; 32],
  query_program_id: [u8; 32],
  program_chain_hash: [u8; 32]
}
```

## 10. Events and author chains

### 10.1 Author-signed event

Authors sign their own independent chain, not the global head:

```text
AuthorEventV1 {
  author_key_id: [u8; 32],
  author_sequence: u64,
  author_previous_hash: [u8; 32],
  operation: u16,
  payload: bytes
}
```

The signature input is:

```text
hash("author-signing", canonical(AuthorEventV1))
```

The event identity is:

```text
event_hash = hash(
  "author-event",
  canonical(AuthorEventV1),
  author_signature
)
```

The update program MUST enforce:

- The author key is authorized at the current sequence.
- The signature is valid.
- `author_sequence = stored_author_sequence + 1`.
- `author_previous_hash = stored_author_tip`.
- The operation is permitted for that author and state.
- The payload is canonical for the declared operation.

These rules prevent replay without an unbounded global event-hash uniqueness set.

### 10.2 Global event record

The sequencer wraps an accepted author event:

```text
GlobalEventRecordV1 {
  global_sequence: u64,
  event_hash: [u8; 32],
  author_event: bytes,
  author_signature: [u8; 64]
}
```

The update program MUST enforce strictly contiguous global sequences.

### 10.3 Write acknowledgement

The primary write response is asynchronous:

```text
WriteAckV1 {
  event_hash: [u8; 32],
  accepted_at_ms: u64,
  accepted_against_sequence: u64,
  must_land_by_sequence: u64,
  receipt_key_id: [u8; 32]
}
```

The server signs `hash("write-ack", canonical(WriteAckV1))`.

A later verified canonical history crossing `must_land_by_sequence` without the acknowledged event creates positive omission evidence. Until that later history exists, the acknowledgement records an obligation but does not prove omission.

## 11. State-transition proofs

### 11.1 Update guest statement

For a batch of globally sequenced events, the update guest proves:

```text
end_state = UPDATE_PROGRAM(start_state, ordered_events)
```

The guest MUST verify all author signatures, author chains, authorization rules, global sequencing, configuration activation rules, key lifecycle rules, and program migration rules.

### 11.2 Transition journal

The canonical public journal is:

```text
TransitionJournalV1 {
  start_root: [u8; 32],
  end_root: [u8; 32],
  start_sequence: u64,
  end_sequence: u64,
  batch_hash: [u8; 32],
  update_program_id: [u8; 32],
  active_query_program_id: [u8; 32],
  program_chain_hash: [u8; 32]
}
```

Recursive proofs MUST expose sufficient information for the terminal verifier to establish continuous descent from its previously accepted checkpoint or genesis.

### 11.3 Batching

- Writes SHOULD be proven in deterministic batches.
- Batch cadence MAY be tuned operationally.
- Batch boundaries MUST NOT alter state semantics.
- Proof generation MUST be idempotent for the same start root and ordered batch.
- A failed batch MUST NOT advance the canonical proven head.

## 12. Queries and results

### 12.1 Canonical request

The mobile Rust module SHOULD construct canonical requests so TypeScript does not independently reproduce consensus encoding.

```text
QueryRequestV1 {
  request_type: u16,
  request_version: u16,
  body: bytes
}
```

The normalized request hash is:

```text
request_hash = hash("query-request", canonical(QueryRequestV1))
```

The request nonce is deliberately excluded from `request_hash` so proofs can be shared. The nonce is bound by the signed receipt.

### 12.2 Canonical result

Each query program defines one canonical result encoding:

```text
result_hash = hash("query-result", canonical_result_bytes)
```

Clients MUST NOT compare decoded JavaScript objects as the cryptographic equality test. They MUST compare canonical result hashes or verified canonical bytes.

### 12.3 Query guest statement

The query guest proves:

```text
result = QUERY_PROGRAM(committed_state_at_root, normalized_request)
```

The witness MUST establish that every state value read by the guest belongs to the committed root. The proof construction MUST also establish completeness for the query. Returning individually valid rows without proving that no qualifying rows were omitted is insufficient.

### 12.4 Query journal

```text
QueryJournalV1 {
  state_root: [u8; 32],
  state_sequence: u64,
  request_hash: [u8; 32],
  result_hash: [u8; 32],
  query_program_id: [u8; 32],
  program_chain_hash: [u8; 32]
}
```

## 13. Immediate signed query receipts

### 13.1 Receipt

Every provisional response MUST contain a signed, nonce-bound receipt:

```text
QueryReceiptV1 {
  receipt_key_id: [u8; 32],
  state_root: [u8; 32],
  state_sequence: u64,
  request_hash: [u8; 32],
  result_hash: [u8; 32],
  query_program_id: [u8; 32],
  program_chain_hash: [u8; 32],
  nonce: bytes,
  issued_at_ms: u64,
  proof_deadline_ms: u64
}
```

The server signs:

```text
hash("query-receipt", canonical(QueryReceiptV1))
```

The receipt signature is mandatory. A shared proof does not carry the customer's nonce and therefore cannot replace the receipt.

### 13.2 Proof cache

Query proofs are deterministic and SHOULD be cached by:

```text
proof_cache_key = hash(
  "proof-cache-key",
  query_program_id,
  state_root,
  request_hash
)
```

The cache key MUST NOT include the nonce, receipt key, issuance time, or proof deadline.

### 13.3 Final bundle

A final response bundle contains:

- Canonical query request or its client-held exact bytes.
- Canonical result bytes.
- Canonical receipt bytes.
- Receipt signature.
- Query proof.
- Canonical query journal.
- Transition proof/checkpoint sufficient to connect the state root to the client's accepted history.
- Latest-head statement if freshness is requested.
- Program migration objects required to walk from the pinned program identity to the active identity.

## 14. Latest-head statements and freshness

### 14.1 Latest-head object

```text
LatestHeadV1 {
  head: HeadId,
  latest_as_of_ms: u64,
  head_key_id: [u8; 32]
}
```

The signature covers:

```text
hash("latest-head", canonical(LatestHeadV1))
```

The semantic statement is exactly:

> This is the latest canonical head as of `latest_as_of_ms`.

It MUST NOT be described merely as “a root at time T.”

### 14.2 Client freshness policy

The client MUST:

- Compare `latest_as_of_ms` with its own wall clock.
- Reject statements from the future beyond a configured clock-skew allowance.
- Reject statements older than its configured maximum age when freshness is required.
- Compare the sequence against its highest accepted sequence.
- Persist a newer accepted head atomically.

A server-signed timestamp does not prove state currency by itself. It time-binds the server's latest-head claim so that later comparison can expose contradictory claims.

### 14.3 Gossip

Clients MAY exchange signed `LatestHeadV1` objects directly or through an untrusted relay. Relay authenticity is irrelevant because the head objects are self-authenticating.

The gossip layer SHOULD detect:

- Two different heads signed by the same key for the exact same
  `latest_as_of_ms`.
- A later statement with a lower sequence than an earlier verified statement.
- A later statement whose proven history does not descend from the earlier
  verified head.
- Incompatible program-chain commitments for histories that claim the same
  canonical era.

Gossip detects positive conflicts. It cannot prove that an isolated client was frozen if no conflicting object is observed.

## 15. Program identity and publication

### 15.1 Program manifest

Every published program version MUST include:

```text
ProgramManifestV1 {
  source_repository: bytes,
  source_commit: bytes,
  cargo_lock_hash: [u8; 32],
  rust_toolchain_hash: [u8; 32],
  build_recipe_hash: [u8; 32],
  guest_binary_hash: [u8; 32],
  program_id: [u8; 32],
  protocol_version: u16
}
```

The source repository MUST document how to reproducibly build the guest and derive `program_id`. Independent users MUST be able to compare a rebuilt program identity with the identity committed by governance.

The cryptographic proof binds to `program_id`, not to a human-readable repository URL.

### 15.2 Stable terminal wrapper

The client-pinned terminal wrapper MUST remain deliberately minimal. It MAY:

- Verify the selected proof system.
- Decode fixed canonical journals.
- Walk the committed program-ID chain.
- Enforce protocol-version support.
- Return success or a structured failure.

It MUST NOT contain application rules, governance policy interpretation beyond fixed migration verification, dynamic plugin loading, or network behavior.

## 16. Governance, configuration, and upgrades

### 16.1 Configuration

Algorithm-affecting configuration MUST be stored under the canonical state root and modified by governance-authorized events.

Configuration MUST use explicit integer units:

```text
fee_basis_points = 7500
timeout_ms = 60000
max_batch_events = 1000
```

Floating-point values are forbidden in canonical state and proven computation.

### 16.2 Program migration

```text
ProgramMigrationV1 {
  next_update_program_id: [u8; 32],
  next_query_program_id: [u8; 32],
  next_program_manifest_hash: [u8; 32],
  activation_sequence: u64,
  governance_authorization: bytes
}
```

Requirements:

- The migration MUST be governance-authorized.
- The migration MUST be committed before activation.
- The timelock MUST be longer than the normal reviewed-client release cadence.
- The old update program MUST enforce the activation boundary.
- The final journal of the old era MUST commit the next program IDs and activation sequence.
- Receipts and proofs MUST identify the program era they use.
- Clients MUST follow the committed ID chain; explicit per-user approval is not a security control.

### 16.3 Key lifecycle

Key additions, rotations, revocations, and delayed recovery MUST be canonical events.

The protocol MUST distinguish:

- Author keys.
- Receipt/head online keys.
- Governance keys.
- Proof-system verification parameters, where applicable.

Online receipt/head keys SHOULD rotate on a defined schedule. Governance keys SHOULD remain offline except when authorizing canonical changes. Recovery operations SHOULD use a delay long enough for reviewed clients and observers to detect them before activation.

## 17. Client verification algorithm

Given `ExpectedRequest`, `ResponseBundle`, `ClientTrustState`, and `ClientNowMs`, the client MUST perform the following steps in order:

1. Parse the Protobuf transport with strict size limits.
2. Extract canonical byte objects without trusting decoded transport values.
3. Parse canonical receipt bytes and reject trailing or malformed data.
4. Verify the receipt key is authorized for `state_sequence`.
5. Verify the receipt signature.
6. Verify the receipt nonce equals the locally generated nonce.
7. Recompute the normalized request hash from the exact expected request bytes.
8. Verify the receipt request hash matches.
9. Recompute the result hash from canonical result bytes.
10. Verify the receipt result hash matches.
11. Verify the receipt sequence is not below the locally persisted sequence.
12. Verify the query proof using the pinned terminal wrapper.
13. Verify the query journal matches root, sequence, request hash, result hash, program ID, and program-chain hash from the receipt.
14. Verify the transition proof/checkpoint connects the query root to genesis or the client's accepted checkpoint.
15. Walk and validate any intervening program migrations.
16. If a latest-head statement is required, verify its signature, key era, clock window, and relation to the query root.
17. Construct `NextClientTrustState`.
18. Atomically persist `NextClientTrustState` and any pending evidence objects.
19. Only after persistence succeeds, return the verified application result.

Any failure MUST return a typed verification error and MUST NOT return the result through the verified API.

## 18. Client trust state

```text
ClientTrustStateV1 {
  protocol_version: u16,
  highest_sequence: u64,
  accepted_root: [u8; 32],
  program_chain_hash: [u8; 32],
  active_update_program_id: [u8; 32],
  active_query_program_id: [u8; 32],
  active_key_state_hash: [u8; 32],
  last_latest_as_of_ms: u64
}
```

The mobile verifier SHOULD own serialization of this object. The host application SHOULD persist it using an atomic replace or transactional storage primitive. A crash MUST leave either the old fully valid state or the new fully valid state, never a partially written mixture.

First contact initializes from the app-pinned genesis. First contact proves valid genesis descent, not global freshness or uniqueness of the presented descendant.

## 19. Protobuf and ConnectRPC API

### 19.1 Service definition

```proto
syntax = "proto3";

package verifiable.api.v1;

service VerifiableApi {
  rpc SubmitEvent(SubmitEventRequest) returns (SubmitEventResponse);
  rpc Execute(ExecuteRequest) returns (ExecuteResponse);
  rpc GetProof(GetProofRequest) returns (GetProofResponse);
  rpc GetLatestHead(GetLatestHeadRequest) returns (GetLatestHeadResponse);
  rpc GetTransition(GetTransitionRequest) returns (GetTransitionResponse);
}

message SubmitEventRequest {
  bytes author_event = 1;
  bytes author_signature = 2;
}

message SubmitEventResponse {
  bytes write_ack = 1;
  bytes write_ack_signature = 2;
}

message ExecuteRequest {
  bytes canonical_request = 1;
  bytes nonce = 2;
}

message ExecuteResponse {
  bytes canonical_result = 1;
  bytes query_receipt = 2;
  bytes query_receipt_signature = 3;
}

message GetProofRequest {
  bytes receipt_hash = 1;
}

message GetProofResponse {
  oneof state {
    ProofPending pending = 1;
    ProofReady ready = 2;
    ProofFailed failed = 3;
  }
}

message ProofPending {
  uint64 retry_after_ms = 1;
}

message ProofReady {
  bytes response_bundle = 1;
}

message ProofFailed {
  string public_code = 1;
}

message GetLatestHeadRequest {}

message GetLatestHeadResponse {
  bytes latest_head = 1;
  bytes latest_head_signature = 2;
}

message GetTransitionRequest {
  uint64 from_sequence = 1;
  uint64 to_sequence = 2;
}

message GetTransitionResponse {
  bytes transition_bundle = 1;
}
```

All protocol-bearing fields are opaque `bytes`. Generated TypeScript representations MUST use `Uint8Array`, not `number[]` and not base64 strings inside application code. Base64 MAY appear only where an intermediary cannot carry binary.

### 19.2 Connect error mapping

Transport errors MUST remain distinct from verification outcomes.

| Connect code | Use |
|---|---|
| `invalid_argument` | Malformed transport input or unsupported request type |
| `unauthenticated` | Missing/invalid ordinary API authentication |
| `permission_denied` | Caller not permitted to submit the requested operation |
| `failed_precondition` | Request conflicts with known canonical sequence or author tip |
| `resource_exhausted` | Rate, size, or capacity limit |
| `unavailable` | Temporary infrastructure failure |
| `internal` | Unexpected server failure; no cryptographic meaning |

`ProofPending` is a normal application state, not an error.

### 19.3 Compatibility

- Protobuf packages MUST be versioned, for example `verifiable.api.v1`.
- Field numbers MUST never be reused.
- Deleted fields MUST be reserved.
- Changes SHOULD be additive within a version.
- Breaking changes MUST introduce a new package version.
- `buf lint` and `buf breaking` MUST run in CI.
- The server MUST support old mobile API versions for the documented compatibility window.

## 20. Vercel deployment architecture

### 20.1 Public API

The public API MUST use unary ConnectRPC over ordinary HTTPS. It MUST NOT require native inbound gRPC.

The Vercel function MUST use the Node.js runtime, not the Edge runtime, because it loads a native Node-API addon.

### 20.2 Proving

Proof generation MUST NOT run synchronously in the request path. The API MUST:

1. Produce and sign the provisional receipt.
2. Commit an idempotent proof job to durable storage.
3. Return the provisional response.
4. Let a separately deployed Rust worker claim the job.
5. Serve the resulting immutable proof artifact through `GetProof`.

The proof worker MAY be self-hosted or deployed on any compute platform capable of running the selected zkVM. Its operator is not trusted for correctness because the customer verifies its output.

### 20.3 Durable job record

```text
ProofJobV1 {
  proof_cache_key: [u8; 32],
  state_root: [u8; 32],
  state_sequence: u64,
  query_program_id: [u8; 32],
  canonical_request: bytes,
  expected_result_hash: [u8; 32],
  status: enum,
  attempts: u32
}
```

The unique key is `proof_cache_key`. Duplicate submissions MUST converge on the same job. Workers MUST use leases and idempotent completion. Proof artifacts MUST be immutable after successful publication.

## 21. Monorepo

```text
repo/
├── apps/
│   ├── api/                       # Node + ConnectRPC deployment
│   └── mobile/                    # React Native application
│
├── proto/
│   ├── package.json               # Turborepo adapter
│   ├── buf.yaml
│   ├── buf.gen.yaml
│   └── verifiable/api/v1/
│       └── service.proto
│
├── packages/
│   ├── proto-ts/                  # Generated TypeScript messages/clients
│   ├── rust-node/                 # Native-addon loader and generated .d.ts
│   └── verifier-native/           # React Native Turbo Native Module
│
├── rust/
│   ├── package.json               # Turborepo adapter for Cargo workspace
│   ├── Cargo.toml
│   ├── Cargo.lock
│   └── crates/
│       ├── protocol/
│       ├── state-tree/
│       ├── algorithm/
│       ├── state-transition/
│       ├── terminal-verifier/
│       ├── query-guest/
│       ├── update-guest/
│       ├── node-addon/
│       ├── mobile-ffi/
│       └── prover-worker/
│
├── fixtures/
│   └── protocol-v1/
│       ├── canonical/
│       ├── signatures/
│       ├── state-roots/
│       ├── transitions/
│       └── queries/
│
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── rust-toolchain.toml
```

### 21.1 Dependency direction

```text
protocol
  ├── state-tree
  ├── algorithm
  └── terminal-verifier

state-tree + algorithm + state-transition
  ├── update-guest
  └── query-guest

Rust core crates
  ├── node-addon --> Node API
  ├── mobile-ffi --> React Native
  └── prover-worker
```

Application packages MUST NOT be imported by shared protocol packages. TypeScript MUST NOT duplicate canonical algorithms.

### 21.2 Turborepo responsibilities

Turborepo orchestrates:

- Protobuf generation.
- Rust builds.
- Native addon packaging.
- Mobile binding generation.
- TypeScript builds.
- Cross-language tests.
- Affected-package CI.

Cargo remains authoritative for Rust dependency resolution and build semantics.

Illustrative task ordering:

```text
proto#generate
    -> rust#build
        -> rust-node#build -> api#build
        -> verifier-native#build -> mobile#build
```

The repository SHOULD expose these stable root commands:

```bash
pnpm generate       # Generate Protobuf and language bindings
pnpm build          # Build all affected production artifacts
pnpm test           # Run unit, integration, and adversarial tests
pnpm check          # Formatting, lint, typecheck, buf breaking, cargo checks
pnpm test:vectors   # Run cross-language protocol golden vectors
```

CI SHOULD use Turborepo's affected-package filtering but MUST run all protocol
golden vectors whenever canonical encoding, cryptographic dependencies, guest
programs, Protobuf schemas, or Rust toolchains change.

## 22. Rust engineering requirements

Consensus-critical crates MUST:

- Use pinned Rust toolchains and committed `Cargo.lock` files.
- Use explicit integer widths.
- Use checked arithmetic or prove that overflow is impossible.
- Forbid floating point.
- Prefer `BTreeMap` or authenticated map abstractions where ordering matters.
- Avoid `HashMap` iteration in canonical computation.
- Use deterministic serialization implemented in one crate.
- Set `#![forbid(unsafe_code)]` unless a separately reviewed adapter requires unsafe FFI code.
- Isolate any unavoidable unsafe code in the smallest possible binding crate.
- Reject unbounded allocations and deeply nested attacker-controlled input.
- Avoid time, randomness, filesystem, network, process environment, and locale dependencies inside proven logic.
- Be deterministic across native, zkVM, and mobile targets.

The zkVM guest MUST not read environment variables or external network state.

## 23. Mobile native interface

The React Native-facing surface SHOULD remain small:

```ts
interface VerifiableCore {
  createRequest(input: CreateRequestInput): Promise<{
    canonicalRequest: Uint8Array;
    nonce: Uint8Array;
  }>;

  verifyAndAdvance(input: {
    expectedRequest: Uint8Array;
    expectedNonce: Uint8Array;
    responseBundle: Uint8Array;
    trustState: Uint8Array;
    clientNowMs: string;
  }): Promise<{
    canonicalResult: Uint8Array;
    nextTrustState: Uint8Array;
    evidence: Uint8Array[];
  }>;
}
```

`clientNowMs` MUST NOT be represented as a JavaScript `number` if the generated binding cannot guarantee safe integer range; a decimal string or generated bigint representation is preferred.

The UI MUST render final/verified status only from `verifyAndAdvance` output. Raw API result fields MAY be shown as explicitly provisional but MUST NOT use the same UI state as verified results.

## 24. Server native interface

The Node addon SHOULD expose operations similar to:

```ts
interface RustCore {
  validateAuthorEvent(
    canonicalEvent: Uint8Array,
    signature: Uint8Array,
    canonicalStateWitness: Uint8Array,
  ): Uint8Array;

  executeProvisionalQuery(
    canonicalRequest: Uint8Array,
    canonicalStateWitness: Uint8Array,
  ): Uint8Array;

  createQueryReceipt(input: Uint8Array): Uint8Array;

  createLatestHead(input: Uint8Array): Uint8Array;
}
```

Private-key operations MAY remain in a dedicated signing component, but Rust MUST construct the exact digest presented for signing. No JavaScript object serializer may define signed bytes.

CPU-intensive proving MUST use the prover worker, not Node's event loop or an in-process native call.

## 25. Physical data storage

Recommended logical stores:

- Append-only event store keyed by global sequence.
- Canonical state-node store keyed by Merkle node hash.
- Projection database optimized for API reads.
- Proof-job store with leases.
- Immutable proof artifact store.
- Signed object archive for receipts, acknowledgements, and heads.

Projection rows MUST record the canonical root and sequence from which they were derived. The API MUST refuse to use a projection against a mismatched requested root.

Backups SHOULD include the event log, state nodes, proof artifacts, and key lifecycle history. Rebuilding projections from canonical events MUST be tested regularly.

## 26. Resource and denial-of-service limits

The protocol MUST define and enforce maximum sizes for:

- Protobuf request body.
- Canonical request body.
- Author event payload.
- Nonce.
- Result.
- Merkle witness.
- Proof and journal.
- Migration chain length per bundle.
- Transition span per request.

Before expensive cryptography, implementations SHOULD perform cheap length, version, and structural checks.

Proof jobs MUST be rate-limited and deduplicated by cache key. The server MAY require authorization or payment policy before accepting expensive uncached queries, but such policy MUST NOT alter proven algorithm semantics.

## 27. Observability and audit

Operational telemetry MAY include:

- API latency and error rates.
- Receipt issuance count.
- Proof queue depth and age.
- Proof generation duration.
- Proof cache hit rate.
- Transition lag in sequences and wall time.
- Latest-head age.
- Verification failure categories reported voluntarily by clients.

Operational telemetry MUST NOT be treated as canonical history.

Logs SHOULD reference hashes and sequence numbers rather than duplicate sensitive payloads. Secret keys, full witnesses, and private query data MUST NOT be logged.

## 28. Testing strategy

### 28.1 Golden vectors

Versioned golden vectors MUST cover:

- Every canonical object encoding.
- Every domain-separated hash.
- Valid and invalid Ed25519 signatures.
- State membership and non-membership.
- Empty state and multi-update roots.
- Author-chain replay and fork cases.
- Transition journals.
- Query journals and result hashes.
- Receipts, acknowledgements, heads, migrations, and key rotations.

The same vectors MUST run against:

- Native Rust.
- zkVM guests where applicable.
- Node addon.
- Mobile iOS and Android bindings.
- Any independent audit implementation.

### 28.2 Adversarial scenarios

At minimum, production tests MUST preserve the existing 22 scenarios:

1. Independent author concurrency.
2. Signed payload tampering.
3. Author-event replay.
4. Honest final query.
5. Hidden algorithm cannot finalize a lie.
6. Shared proof across nonce-bound receipts.
7. Missing signature and nonce replay.
8. Physical database replacement.
9. Environment-variable semantic changes.
10. Returning-client rollback.
11. Isolated freeze limitation.
12. Gossiped head conflict evidence.
13. Stale head rejection.
14. Omitted acknowledged write after crossed boundary.
15. Missed proof deadline as local overdue state only.
16. Floating-point configuration rejection.
17. Integer configuration timelock.
18. Early migration rejection.
19. Valid program migration chain.
20. Receipt/head key rotation.
21. First-contact valid-fork limitation.
22. Authorized false-data limitation.

### 28.3 Additional testing

- Property tests for encoding round trips and state-tree updates.
- Parser fuzzing for canonical and Protobuf inputs.
- Differential tests across native and guest execution.
- Reproducible-build tests for guest program identities.
- Power-loss tests for atomic mobile trust-state persistence.
- Queue retry and duplicate-delivery tests.
- Proof-cache poisoning tests.
- Mobile compatibility tests across every supported API/protocol version.
- `buf lint` and `buf breaking` in CI.
- Dependency and supply-chain review for proof and cryptographic crates.

## 29. Failure behavior

### 29.1 API failures

An API infrastructure failure MAY return a Connect error. It MUST NOT fabricate a verified response.

### 29.2 Prover failures

If proving fails or the proven result differs from the provisional result:

- The job MUST enter a terminal or retryable failure state.
- No proof artifact may be published as ready.
- The signed provisional receipt remains evidence of the server's claim.
- The client MUST keep the result provisional or rejected.

### 29.3 Verification failures

The mobile verifier MUST fail closed. Typed error categories SHOULD include:

```text
MALFORMED_TRANSPORT
MALFORMED_CANONICAL_OBJECT
UNSUPPORTED_PROTOCOL_VERSION
INVALID_SIGNATURE
UNAUTHORIZED_KEY
NONCE_MISMATCH
REQUEST_HASH_MISMATCH
RESULT_HASH_MISMATCH
INVALID_PROOF
JOURNAL_MISMATCH
INVALID_PROGRAM_CHAIN
ROLLBACK_DETECTED
STALE_HEAD
FUTURE_HEAD
STATE_PERSISTENCE_FAILED
```

Errors SHOULD include safe diagnostic hashes and codes, not sensitive state.

## 30. Rollout plan

### Phase 0: Executable transparent model

- Keep the existing JavaScript demo as the behavioral reference.
- Freeze Version 1 object semantics and adversarial scenarios.

### Phase 1: Rust protocol core

- Implement canonical encoding and hashing.
- Implement state tree, event rules, receipts, heads, configuration, migration, and key lifecycle.
- Reproduce every existing test vector and scenario.

### Phase 2: Monorepo and transport

- Create Turborepo and Cargo workspaces.
- Add Buf and Protobuf generation.
- Implement ConnectRPC service in Node.
- Build the `napi-rs` addon.

### Phase 3: Mobile verification

- Build UniFFI Swift/Kotlin bindings.
- Wrap them in a React Native Turbo Native Module.
- Implement atomic trust-state persistence.
- Ensure the UI cannot confuse provisional and verified results.

### Phase 4: Real zkVM backend

- Select and threat-model the zkVM.
- Implement update and query guests.
- Define public journals exactly as specified.
- Add recursion/compression and mobile verification.
- Benchmark proof generation, proof size, mobile verification time, and memory.

### Phase 5: Production hardening

- Deploy async proving and shared caching.
- Add key rotation and upgrade rehearsals.
- Add client head comparison/gossip.
- Conduct external cryptographic and protocol review.
- Publish source, manifests, reproducible build instructions, and genesis artifacts.

## 31. Acceptance criteria

Version 1 is production-ready only when:

- All consensus-critical semantics are implemented in Rust.
- The client verifies final responses locally without contacting a trusted verifier.
- Changing the physical database cannot finalize a response against an unrelated root.
- A hidden query function cannot finalize a result different from the active published program.
- Returning-client rollback is rejected.
- Provisional receipts are always signed and nonce-bound.
- Query proofs are asynchronous and shareable.
- Program, configuration, and key upgrades are committed and timelocked.
- Protobuf is used only as transport for canonical objects.
- Native inbound gRPC is not required by the Vercel deployment.
- Every golden vector passes on native Rust, Node, iOS, Android, and zkVM guest targets.
- Every required adversarial scenario passes.
- Guest program identities are reproducibly buildable from published source.
- Failure paths are fail-closed and do not return verified data.
- Public documentation uses the guarantee taxonomy from this specification.

## 32. Open engineering decisions

The following must be resolved before production freeze:

1. zkVM selection and mobile-verifier feasibility.
2. Transparent versus setup-based final proof format.
3. Sparse Merkle implementation and storage backend.
4. Maximum request, witness, result, and proof sizes.
5. Transition batch cadence and acknowledgement inclusion window.
6. Default freshness maximum age and clock-skew allowance.
7. Proof deadline policy.
8. Governance authorization structure, including whether threshold signatures are required.
9. Client gossip transport and privacy behavior.
10. Vercel native-addon build and packaging matrix.
11. Proof-worker deployment and capacity model.
12. Supported mobile-version compatibility window.
13. Public data-export and user-exit format.

## 33. Final claim

For a returning client that follows this specification, an accepted final response proves:

```text
published program
+ canonical state descended from pinned genesis
+ this exact normalized request
= this exact accepted result
```

The verdict is produced on the customer's CPU. The infrastructure supplies evidence; it does not supply trust.

## 34. References

- [NIST FIPS 180-4: Secure Hash Standard](https://csrc.nist.gov/pubs/fips/180-4/upd1/final)
- [RFC 8032: Edwards-Curve Digital Signature Algorithm](https://www.rfc-editor.org/rfc/rfc8032)
- [Protocol Buffers: Serialization Is Not Canonical](https://protobuf.dev/programming-guides/serialization-not-canonical/)
- [Connect protocol documentation](https://connectrpc.com/docs/protocol/)
- [Buf breaking-change detection](https://buf.build/docs/breaking/)
- [Turborepo multi-language support](https://turborepo.dev/docs/guides/multi-language)
- [Node-API documentation](https://nodejs.org/api/n-api.html)
- [React Native native platform documentation](https://reactnative.dev/docs/native-platform)
- [UniFFI user guide](https://mozilla.github.io/uniffi-rs/)
- [Vercel: gRPC versus REST deployment considerations](https://vercel.com/i/grpc-vs-rest)

## 35. Executable reference model

The transparent JavaScript demo in `verifiable-architecture-demo/` is the
current executable reference for the control-plane semantics and required
adversarial scenarios. It re-executes full witnesses locally rather than
producing succinct zkVM proofs. The Rust and zkVM implementations MUST preserve
its logical guarantees while replacing its deliberately non-scalable proof
backend.
