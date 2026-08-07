# Claim traceability

Every claim this codebase makes, its tier under spec §3.1, where it is
implemented, and the test that would fail if it stopped being true.

Tiers:

- **MATH** holds against a computationally bounded adversary given the stated
  assumption. Every MATH row names a test.
- **CUSTODY** holds while the named parties keep separate control. It is an
  operational property, not a proof.
- **ASSUMED** is taken on trust from something outside this codebase.

Run `pnpm test` to check every row at once. Run `pnpm reproduce` for the
numbers.

## MATH

| Claim | Spec | Implementation | Test |
|---|---|---|---|
| A verifiable timed discrete-log proof binds the delay to a published commitment | §5.5A | `core/vtd.ts` `proveVtd` / `verifyVtd` | `test/vtd.test.ts` |
| Cut-and-choose soundness is 41.51 bits at n=130, k=27, o=26 | §5.5A | `core/vtd.ts` `soundnessBits` | `test/vtd.test.ts`, `pnpm reproduce` |
| A prover cannot choose polynomial coefficients: they derive from the secret and a per-proof nonce | §5.5A | `core/vtd.ts` `coefficientsDeriveFromSecret` | `test/vtd.test.ts` |
| A repeated proof nonce is refused, because reuse pools two openings into the secret | §5.5A | `world/world.ts` `checkEnvelope` | `test/world.test.ts`, `test/conformance.test.ts` |
| Verification cost does not grow with the delay parameter t | §5.5A | `core/vtd.ts` `verifyVtd` | `test/vtd.test.ts` |
| Shamir shares verify against Feldman commitments in one batched group equation | §5.5A | `core/shamir.ts` `commitmentForCombination` | `test/shamir.test.ts` |
| The escrow KEM is IND-CCA hardened by a Fujisaki-Okamoto transform | §5.5 | `core/kem.ts` `verifyEncapsulation` | `test/kem.test.ts` |
| A non-canonical curve point is refused at the deserialization boundary | §5.8 | `core/kem.ts` `checkEncapsulationPoint` | `test/malformed.test.ts` |
| One gate alone cannot open the escrow envelope | §5.5 | `world/world.ts` `openOuter` | `test/conformance.test.ts` |
| Both master secrets open the outer layer but do not skip the delay | §19 | `world/world.ts` `deriveBothOutOfInterface` | `test/conformance.test.ts` |
| Record encoding is canonical: one logical record has exactly one wire form | §6.1 | `core/cbor.ts` `strictCborMap`, `asUnsignedBigInt`, `asSafeCount` | `test/records.test.ts` |
| A nested unrecognized field is refused, so a tampered record cannot keep its hash | §6.1 | `core/cbor.ts` `strictCborMap` | `test/records.test.ts` |
| `network_id` is bound into every record hash, so a digest cannot replay cross-network | §6.1 | `world/records.ts` `headerCborEntries` | `test/records.test.ts` |
| An unrecognized `schema_version` is refused rather than misread | §6.1 | `world/records.ts` `parseRecordHeader` | `test/records.test.ts` |
| Merkle inclusion and consistency follow RFC 9162 | §8.1 | `core/merkle.ts` `verifyInclusion`, `verifyConsistency` | `test/log.test.ts` |
| The log gate refuses a head inconsistent with the last head it accepted | §10.5 | `world/world.ts` `checkHeadConsistency` | `test/world.test.ts`, `test/conformance.test.ts` |
| The escrow context separates the tracks: standard contributions cannot open the emergency ciphertext | §5.5C | `world/world.ts` `escrowContext` | `test/world.test.ts` |
| An emergency unseal cannot launder itself onto a standard leaf | §5.5C | `world/world.ts` `checkAuthorizationBinding` | `test/world.test.ts` |
| A duplicate document nullifier is refused | §7.4 | `world/world.ts` `reserveNullifier` | `test/conformance.test.ts` |
| An account finds its own detection tags; a keyless outsider cannot link one | §6.2.3 | `world/world.ts` `detectionTag`, `scanForOwnTags` | `test/world.test.ts` |
| K reconstructs from the stored record alone, with no access to the enrollment request | §18.2 | `world/world.ts` `reconstructEscrowKey` | `test/records.test.ts`, `test/conformance.test.ts` |
| The supported unseal path emits an evidence bundle the offline verifier accepts on BOTH tracks, built from the values the ceremony actually used | §6.2.6 | `world/unseal-evidence.ts` `buildUnsealEvidence` | `test/unseal-evidence.test.ts` |
| The bundle's enrollment record is the one the authorization was issued against: both HSM gates sign `hashUnsealAuthorizationV1`, which carries the record hash, so the operator cannot mint a second record after the order | §6.2.6 | `world/evidence.ts` `checkEnrollmentBinding` | `test/unseal-evidence.test.ts`, `test/evidence.test.ts` |
| That record is also one the log published: the bundle carries the `ENROLLMENT_ACCEPTED` leaf that commits it, plus an inclusion proof under the signed head | §6.2.6 | `world/evidence.ts` `checkEnrollmentLeaf` | `test/unseal-evidence.test.ts` |
| Each enrollment binding guard refuses on its own: account, enrollment id, escrow epoch, and the track ciphertext the gates opened | §6.2.6 | `world/evidence.ts` `checkEnrollmentBinding` | `test/evidence.test.ts` |
| The emergency congestion exemption cannot be laundered onto a standard leaf | §5.5C | `world/evidence.ts` `checkCongestionPolicyRange` | `test/unseal-evidence.test.ts` |
| The bundle names the bytes the log actually stored, not a reconstruction | §6.2.6 | `world/unseal-evidence.ts` | `test/unseal-evidence.test.ts` |
| The gates and the bundle sign one attestation message, not two conventions | §10.2 | `world/evidence.ts` `attestationMessage` | `test/unseal-evidence.test.ts` |
| The evidence bundle verifies the timed-commitment proof rather than restating it | §10.2 | `world/evidence.ts` `checkSolutionProof` | `test/evidence.test.ts` |
| The bundle binds the recovered secret to the named enrollment: H_s must be the commitment that record published | §10.2 | `world/evidence.ts` `checkEnrollmentBinding` | `test/evidence.test.ts` |
| The bundle refuses a head that is its own predecessor, and refuses an absent consistency proof | §10.5 | `world/evidence.ts` `checkConsistency` | `test/evidence.test.ts` |
| The bundle reads the authorization's legal predicates rather than only hashing them | §6.2.6 | `world/evidence.ts` `checkAuthorizationPredicates` | `test/evidence.test.ts` |
| The verifier and the world compute ONE escrow context, asserted byte-identical | §5.5C | `world/derivations.ts` `escrowContext` | `test/enrollment.test.ts` |
| `enroll()` runs the §7.5/§7.7 verifier, and a refused package never becomes a record | §7.7 | `world/enrollment-adapter.ts` `verifyThroughSpecVerifier` | `test/world.test.ts` |
| `enroll()` reports which §7.5 conditions are placeholders instead of hiding them | §3.1 | `world/enrollment-adapter.ts` `PLACEHOLDER_CONDITIONS` | `test/world.test.ts` |
| One document issuance id has one nullifier across invisible and whitespace spellings, and two ids differing in a VISIBLE character never share one | §7.4 | `world/derivations.ts` `canonicalizeDocumentIssuanceId` | `test/enrollment.test.ts` |
| An ambiguous or empty document issuance id is refused, not folded | §7.4 | `world/derivations.ts` `tryDocumentNullifier` | `test/enrollment.test.ts` |
| Registering an account auth key requires proving control of the enrolled account key | §12.3 | `world/lifecycle.ts` `registerAccountKey` | `test/lifecycle.test.ts` |
| Migration keeps one nullifier per document | §7.4, §13.2 | `world/world.ts` `enrollForMigration` | `test/lifecycle.test.ts` |
| The transparency report counts only leaves proven included under the CALLER-PINNED head, deduped by index, and reports both unverified and missing leaves | §17.1 | `world/keyless-verifier.ts` `includedLeaves` | `test/keyless.test.ts` |
| An unsigned or forged head, or an equivocating log, zeroes EVERY counter rather than being partly believed | §17.1 | `world/keyless-verifier.ts` `transparencyReport` | `test/keyless.test.ts` |
| The head is pinned by the caller from outside the view, so a presenter cannot substitute a stale head to hide leaves | §17.1 | `world/keyless-verifier.ts` `ReportInputs.pinnedHead` | `test/keyless.test.ts` |
| The bundle digest covers every enrollment field the verifier reads | §6.2.6 | `world/evidence.ts` `evidenceBundleV1Cbor` | `test/unseal-evidence.test.ts` |
| The previous and closing heads must agree with the signed head on log id, log key, schema version and network | §6.2.6 | `world/evidence.ts` `checkHeadFieldAgreement` | `test/evidence.test.ts` |
| An anchor the chain does not carry counts for nothing and is reported as unbacked | §17.1 | `world/keyless-verifier.ts` `transparencyReport` | `test/keyless.test.ts` |
| Parse failures, inclusion failures and duplicates are counted apart, so padding one cannot drown another | §17.1 | `world/keyless-verifier.ts` `classifyLeaves` | `test/keyless.test.ts` |
| The silent-share alarm reads only PROVEN leaves | §17.1 | `world/keyless-verifier.ts` `verifyShareArtifact` | `test/keyless.test.ts` |
| A leaf the build cannot parse is reported as `unparsable`, never silently dropped | §17.1 | `world/keyless-verifier.ts` `transparencyReport` | `test/keyless.test.ts` |
| Every reviewer approval is verified against the pinned roster, positionally, so one reviewer cannot be a quorum | §6.2.6 | `world/evidence.ts` `countVerifiedApprovals` | `test/evidence.test.ts` |
| The ceremony transcript is a value the log published: the closing leaf commits its hash under a signed head | §6.2.6 | `world/evidence.ts` `checkClosingLeafBinding` | `test/evidence.test.ts` |
| A log that stops publishing is in breach, not idle: one heartbeat per promised interval turns silence into the alarm | §17.1 | `world/world.ts` `publishHeartbeat`, `world/keyless-verifier.ts` `heartbeatStatus` | `test/keyless.test.ts` |
| A heartbeat cannot be backdated: it names the chain tip it saw, so it cannot be manufactured earlier than the block it references | §17.1 | `world/log-records.ts` `heartbeatLeaf` | `test/keyless.test.ts` |
| A head carrying k of n witness cosignatures cannot be shown to one auditor alone: splitting the view costs k corrupted witnesses, not zero | §8.1 | `core/merkle.ts` `countCosignatures` | `test/keyless.test.ts` |
| A deployment with NO witnesses reports `witnessCount: null`, never zero, so an unwitnessed log cannot read like a witnessed one with no signatures yet | §8.1 | `world/keyless-verifier.ts` `countWitnesses` | `test/keyless.test.ts` |
| The auditor's view is served BY the log, so withholding, padding or reordering it is not a role anyone holds | §17.1 | `core/merkle.ts` `serveLeaves`, `world/keyless-verifier.ts` `viewFromLog` | `test/keyless.test.ts` |
| A head is bound to the log that signed it: the tree id is inside the signature, so a relabelled head fails verification | §8.1 | `core/merkle.ts` `headMessage` | `test/log.test.ts` |
| The work chain across ALL unseals is walked in authenticated index order, so a fork, a skipped predecessor, a reordering or a second genesis is one failed adjacent-pair check | §5.5D | `world/keyless-verifier.ts` `walkCongestionChain` | `test/keyless.test.ts` |
| The closing head is a consistent extension of the unseal head, not merely later | §6.2.6 | `world/evidence.ts` `checkClosingLeafInclusion` | `test/evidence.test.ts` |
| The two escrow tracks lock different secrets under different nonces | §5.5C | `world/evidence.ts` `checkTrackSeparation` | `test/evidence.test.ts` |
| A submitter learns THAT enrollment was refused and never WHY; the reason goes to an operator journal | §7.5 | `world/world.ts` `refuseEnrollment` | `test/enrollment.test.ts` |
| A leaf's anchor height is derived from a chain-backed anchor and a log-signed head no larger than the pinned tree, never supplied | §17.1 | `world/keyless-verifier.ts` `anchoredTrees` | `test/keyless.test.ts` |
| A bundle cannot restate its congestion starting point after the fact: the stamp output lives in the log-signed leaf, so changing the start breaks the leaf's inclusion proof | §5.5C | `world/evidence.ts` `checkCongestion` | `test/evidence.test.ts` |
| No counter reads a presenter object twice: every supplied value is copied, validated and deduped at one boundary | §17.1 | `world/keyless-verifier.ts` `readAnchors` | `test/keyless.test.ts` |
| A work stamp whose difficulty is not a count is refused, so it can be neither cheap nor a hang | §5.5C | `core/congestion.ts` `verifyWork` | `test/log.test.ts` |
| The keyless verifier holds no secret, structurally | §5.8 | `world/keyless-verifier.ts` | `test/keyless.test.ts` |
| Recovery refuses a document-only quorum | §13.1 | `world/lifecycle.ts` `evaluateRecoveryQuorum` | `test/lifecycle.test.ts` |
| A recovery ticket cannot be fabricated: `finalizeRecovery` takes a store and an id, not a value | §13.1 | `world/lifecycle.ts` `finalizeRecovery` | `test/lifecycle.test.ts` |
| Rotating an epoch never makes an existing ciphertext decryptable under new keys | §11.5 | `world/world.ts` `rotateEpoch` | `test/lifecycle.test.ts` |
| Published golden vectors reproduce byte for byte | §18 | `core/vectors.ts` | `test/vectors.test.ts` |

## CUSTODY

| Claim | Spec | Implementation | Test |
|---|---|---|---|
| Two gates under separate control are both required to release a contribution | §5.5 | `world/world.ts` `warrantGate`, `logGate` | `test/world.test.ts` |
| Two reviewers must approve the account mapping | §10.2 | `world/world.ts` `reviewerQuorum` | `test/world.test.ts` |
| Hardware-backed monotonic state refuses a rollback | §11.4 | `world/world.ts` `checkChainState` | `test/conformance.test.ts` |
| An HSM attests each gate release | §10.2 | `world/evidence.ts` `attestationMessage` | `test/evidence.test.ts`, `test/unseal-evidence.test.ts` |
| The supported unseal path emits durable offline evidence | §6.2.6 | `world/world.ts` `performUnseal`, `world/unseal-evidence.ts` | `test/unseal-evidence.test.ts` |
| An emergency unseal is counted apart and alarms when ratification is absent | §5.5C | `world/world.ts` `unratifiedEmergencyAlarms` | `test/world.test.ts` |

## ASSUMED

| Claim | Spec | Why it is not MATH here | Where it is stated |
|---|---|---|---|
| The supplied chain view is the canonical chain | §8.4 | Proof of work is not proof of publication. Nothing in this codebase can tell a reorg from a lie. | `world/chain-validator.ts`, printed on every accepted anchor |
| The timed-commitment solution proof shows real elapsed time | §5.5A | The proof shows the fold is correct and the recovered scalar is the unique discrete log. This LHTLP carries no verifiable-delay certificate. | `world/evidence.ts` `buildTimedCommitmentSolutionProof` |
| The Bitcoin anchor is a real Bitcoin transaction | §8.3 | `SimBitcoin` is a simulator. The anchor binds a head; it does not prove Bitcoin inclusion. | `core/chain.ts` |
| The client build is honest | §5.5A | A malicious client can leak its own secret through any unchecked field. A subliminal channel in prover randomness is unpreventable. | `core/vtd.ts` |
| The enrollment relation can be proven in zero knowledge at acceptable cost | §7.6, §22 Open Decision 1 | No ZK circuit exists. The verifier runs in clear mode against a witness. | `world/enrollment-verifier.ts` |

## Known gaps

These are real and unfixed. They are listed so no reader mistakes silence for
absence.

| Gap | Consequence | Where |
|---|---|---|
| Nothing verifies a record's `network_id` against the verifying world | The field is bound into the hash, so signatures cannot replay, but no component refuses a foreign record by name | routed to a follow-up |
| No unseal leaf carries a detection tag | Enrollment stores `unseal_detection_tag_key: null`, so `buildUnsealLeaf` writes `unseal_detection_tag: null` and `scanForOwnTags` has no live producer. §6.2.3 detection is exercised only by a direct unit test. | `world/world.ts` `storedEnrollmentRecord` |
| `enrollment_proof` is an empty byte string | `proof_system_id` is `none-clear-mode/v1`, so the stored record publishes no succinct proof. The empty field states the absence instead of hiding it behind bytes that prove nothing. | `world/world.ts` `storedEnrollmentRecord` |
| The transparency report drops every non-`LogLeafV1` leaf as unparsable | `parseLeaf` is the strict `LogLeafV1` decoder. Closing leaves use their own encoding, so an honest one-unseal log already reports `unparsable: 1`. Enrollment leaves DO decode and are counted. | `world/keyless-verifier.ts` |
| `unparsable` is a count, not an alarm | It names no index and no leaf, and a closing leaf never parses, so every real view has a non-zero baseline an attacker can hide one flipped byte inside. | `world/keyless-verifier.ts` |
| An auditor cannot verify the work chain at all, in either direction | The stamp pre-image ZEROES the output field so the leaf can carry it, which means a producer picks any starting point, computes the output, and writes it in. No preimage is needed at construction. Publishing the output only stops a LATER restatement. Serialization needs the report to walk unseal leaves in authenticated index order and require each to recompute from the previous one. | `world/evidence.ts` `checkCongestion`, `world/keyless-verifier.ts` |
| No gate can tell a real first head from a claimed one | A gate whose `rootHash` is still null accepts any head as its starting state, because there is nothing to be consistent WITH. Closing this needs trust provisioning: the first head must arrive out of band, signed by a ceremony the gate already trusts. That is a deployment question, not a code one, and this demo has no such ceremony. | `world/world.ts` `checkChainState` |
| The enrollment verifier is not constant time | A structural refusal at step 1 returns before any curve operation, so how LONG a refusal takes is an oracle on which stage failed. The returned value is not: every cause yields one opaque message. Closing the timing channel needs a fixed-cost verifier, which is out of scope for a demo. | `world/enrollment-verifier.ts` |
| A verifier refusal is not reachable through `enroll()` | `checkEnvelope` catches every malformed submission first, so the spec 7.5 verifier is exercised on the happy path and by direct unit tests. The adapter lists this in `PLACEHOLDER_CONDITIONS`. | `world/world.ts` `enrollCore` |
| `closures` counts docket rows, not closing leaves | The name implies the log; the value comes from the external docket. | `world/keyless-verifier.ts` |
| `enroll()` throws on an active epoch above the bound | `gateIdentity` runs before the verifier's `checkNumericFieldsSane`, so the bound is enforced on `verifyEnrollmentSubmission` but not on `enroll()`. Needs 2^32 rotations to reach. | `world/world.ts` |
| Two enrollment-leaf formats remain | The bare `leaf-enrollment` digest is gone, but the verifier's `encodeLeaf` and the log's `encodeLogLeafV1` are still different formats, so `activateAfterInclusion` still cannot verify against `world.log`. | `world/enrollment-verifier.ts` |
| No test drives a verifier refusal through `enroll()` | The wiring has regressions for the honest path and the placeholder list, but every refusal reachable from `enroll()` today is caught by `checkEnvelope` before the verifier runs. | `test/world.test.ts` |
| Every verifier refusal is reported as `VTD_ENVELOPE_REJECTED` | The tag names the wrong cause for a step-1 or step-3 refusal, and the transport ceiling is only checked after a full VTD prove and two encapsulations are paid. | `world/world.ts` |
| `encodeIdentityAttrs` is not injective on lone surrogates | Every lone surrogate encodes as U+FFFD, so the identity commitment collides for those inputs. | `world/derivations.ts` |
| Five domain-string conventions coexist | `sige/v1/*`, `sige-verifier/*`, `sige/evidence/*`, `SIGE/v1/*` and bare strings. Not a break, but it makes a future collision easy to miss. | across `src/` |
| §7.5 conditions 1 to 5 are placeholders | The credential chain, type, validity, revocation status and normalized attributes are fabricated by the demo, because no PKI exists here. Conditions 6 to 11 and the timed-commitment proof are checked for real. `enroll()` returns the list on every acceptance. | `world/enrollment-adapter.ts` |
| **The enrollment verifier is not constant time** | A structural refusal at step 1 returns in microseconds; an accept costs hundreds of milliseconds. An adversarial review measured an 86x spread across well-formed inputs. Refusals cluster only when they all reach the expensive relation tail. | `world/enrollment-verifier.ts` `checkRelation` |
| `checkRelation` called standalone enforces no step-3 pin | A forged `networkId`, `policyId`, `trustSnapshotId`, `delayProfileId` or `credentialProfileId` passes it. Not reachable from `verifyEnrollmentSubmission`, which refuses at step 3. | `world/enrollment-verifier.ts` |
| The transport ceiling ignores bigint magnitude | `puzzles[].u/v`, `opened[].share/blinding` and the witness secret are unbounded. 192 MiB of bigint payload costs about 10 s, linear, not an amplifier. | `world/enrollment-verifier.ts` |
| The verifier has no cross-track check | Both tracks may share one secret and one proof nonce. `world.ts` refuses a repeated nonce via `seenVtdNonces`; the verifier sees each track alone. | `world/enrollment-verifier.ts` |
| The refusal object carries both channels | `submitterMessage` is constant across causes, but the same object carries `operatorReason`, and `describeError` copies thrown text verbatim. No function produces a submitter-only view. | `world/enrollment-verifier.ts` |
| Byte-distinct bundles can share a verdict | `previous_tree_size`, `previous_root_hash` and `timestamp` are unpinned on the previous and closing heads, so seven variants of one ceremony verify with seven different digests. Four other head fields ARE pinned. | `world/evidence.ts` `checkHeadFieldAgreement` |
| A genuine genesis head can stand in for "no prior state" | A gate with no accepted head yet cannot distinguish a real first head from a claimed one | `world/world.ts` `checkHeadConsistency` |
