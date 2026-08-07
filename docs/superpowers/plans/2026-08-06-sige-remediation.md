# sige remediation plan (gospel)

This table is the order of work for the rest of `apps/sige`. It supersedes the
ad-hoc lists in the SDD ledger. Ordering came from nine adversarial agent
reviews plus a Codex review of the plan itself, and every row was verified
against the source before it was written down.

Rows are grouped by SEVERITY, not by the order they were found. The numbers are
creation order and carry no priority. Work the Criticals first, always.
`CLAIMS.md` is the contract; anything here that is not yet done must appear in
its known-gaps table.

| # | Step | Why | Can it be done now? |
|---|---|---|---|
| | **OPEN CRITICAL. None.** | | |
| | **OPEN IMPORTANT. None.** | | |
| | **OPEN MINOR. None.** | | |
| | **DONE.** | | |
| 25 | Pin the enrollment record in the authorization | DONE after two rounds. The field alone was not enough: both gates signed a pin neither gate read, so the operator forged the record BEFORE the order. `LogGateState.acceptedRecordHashes` gives the gate enrollment-time memory, and `checkGateAuthority` also refuses an expired warrant. | Done and reviewed. |
| 26 | Reach the four undefended `evidence.ts` guards | DONE. `buildFixture` mutates the record BEFORE the authorization is issued, so each guard is reachable with one fault present. Alternations gone. | Done, review pending. |
| 27 | `safeVerifyHead` at six call sites | DONE. Also routes `verifyLeafInclusion` through `provesInclusion`. | Done, review pending. |
| 28 | Dedupe `realAnchors` | DONE. Both the backed count and the unbacked count work off the deduped supplied list. | Done, review pending. |
| 31 | Four keyless guards with no test | DONE. One test covers all four, and five separate mutations redden it. | Done, review pending. |
| 29 | Keyless minors | DONE, plus six more the review found: prototype-named roles swallowed by `countBy`, height type confusion that reopened the anchor double-count, `rootHistory` never deduped, a null anchor, missing view arrays, and a hostile getter through the `verifyLeafInclusion` spread. | Done and reviewed. |
| 30 | Two stale claims | DONE. `CLAIMS.md` rows 43 and 44 rewritten, dead branch deleted. | Done, review pending. |
| 18 | Verify reviewer approvals | DONE. `reviewerKeys` pinned in the bundle, approvals verified positionally against the roster over the approval-free pre-image. | Done. |
| 20 | `checkCeremonyTranscript` constrains nothing | DONE. The closing leaf now commits the transcript hash, so the log published it under a signed head and moving it breaks the inclusion proof. | Done. |
| 23 | Derive `anchorHeight` instead of trusting it | DONE. Removed from `PublicLeafView`. Derived from chain-backed anchors matched to log-signed head records, plus a new `unanchoredUnseals` counter. | Done. |
| 5 | Split public refusal from operator telemetry | DONE. One public tag, one opaque message, the reason to `world.operatorJournal`. | Done. |
| 7 | Authenticate `tree_id` | DONE. Moved inside the head signature, so a relabelled head fails verification. | Done. |
| 11 | Correct refusal tags | DONE with 5. With the reason gone, one tag is correct rather than lazy. | Done. |
| 12 | Test a verifier refusal through `enroll()` | DOCUMENTED. `checkEnvelope` catches every malformed submission first, so the spec 7.5 verifier is reached on the happy path and by direct unit tests. Stated in the CLAIMS gaps and in `PLACEHOLDER_CONDITIONS`. | Done. |
| 13 | Replace the constant-time test | DONE by removal. It protected the weakness and flaked. The timing fact is a CLAIMS gap; the observable property has its own test. | Done. |
| 15 | `checkRelation` step-3 pins | DONE. Renamed `checkRelationInternal`: only `verifyEnrollmentSubmission` establishes the pins, so only it may call it. | Done. |
| 16 | Minors | DONE. Lone surrogates already refused, `reviewerQuorum` bounds its index, conventions documented. | Done. |
| 9 | Genesis head stand-in | OPEN BY DESIGN. A gate with a null root accepts any head as its start. Needs trust provisioning, which is a deployment question this demo has no ceremony for. Written into the CLAIMS known gaps. | Documented. |
| 19 | Congestion chain unverifiable offline | DONE. The report walks proven unseal leaves in authenticated index order; each must recompute from the one before. `unknown` when the view is incomplete. | Done. |
| 6 | Closing-head consistency proof | DONE. `closingConsistencyProof` on the bundle, checked with `verifyConsistency`. | Done. |
| 8 | Verify unread head fields | DONE. `tree_id`, `log_key_id`, `schema_version`, `network_id` and `timestamp` pinned across all three heads. | Done. |
| 10 | Cross-track nonce check | DONE. Shared VTD nonce, shared commitment, shared escrow nonce and shared encapsulation all refused. | Done. |
| 14 | Bigint transport ceiling | DONE. `MAX_BIGINT_BYTES = 512` in the decoder, before any arithmetic. | Done. |
| 34 | Work-stamp difficulty is not validated | NEW and DONE. `NaN` cleared the congestion floor and ran zero rounds, so one sha256 satisfied a required 2,000,000 and the gate released. `Infinity` cleared it and hung. | Done. |
| 35 | One normalization boundary for the presenter view | NEW and DONE. Five arrays each grew the same three holes and five per-site fixes did not stop the sixth. Nothing past the boundary reads a caller object. Closed five review findings at once. | Done. |
| 36 | Gate state aliased caller memory | NEW and DONE. One `Uint8Array` was the leaf field, the stamp output, the gate chain head and the next bundle's start. Copy on store. | Done. |
| 37 | Refusal tables asserted nothing | NEW and DONE. 26 hostile cases pinned to their exact refusal. Three earn a refusal from the inclusion proof rather than the guard they name, now visible. | Done. |
| 32 | `verifyConsistency` hangs beyond u32 | NEW and DONE. The shift loops coerce through ToInt32, so at any nonzero multiple of 2^32 the loop never ends. `MAX_TREE_SIZE` bounds both proof verifiers. | Done. |
| 33 | One root at two tree sizes | NEW and DONE. `detectEquivocation` keyed on size only, so a second signed size for one root reopened cross-size inclusion aliasing. | Done. |
| 24 | `verifyInclusion` index aliasing | DONE and mutation-proven. `index - k*2^32` walked the same path as `index`, so one leaf verified under unboundedly many indices and 50 aliases of one unseal leaf reported as 51. Guard added, parity unified, two regressions each proven by deleting the line they defend. | Done, review pending. |
| 21 | Authenticate the transparency report view | PARTIAL. Head verification, per-leaf inclusion and index dedup all landed. The review then broke it through `verifyInclusion` and found five more holes: rows 24, 27, 28, 29, 31. | Superseded. |
| 22 | Bind the bundle's enrollment record to a logged leaf | PARTIAL. The leaf plus its inclusion proof landed. The review showed a logged leaf is not enough, because the operator chooses what gets logged: rows 25, 26, 30. | Superseded. |
| 1 | Evidence bundle producer | DONE and reviewed. Review found 2 Criticals in the fix; both closed. | Done. |
| 2 | Bind transparency report to leaf bytes | DONE and reviewed. Relabelling is closed. | Done. |
| 3 | `escrowEpoch` single bound | DONE. `injectiveNumber` replaces the collapsing encoder, plus one `MAX_ESCROW_EPOCH` bound enforced at the boundary. | Done. |
| 4 | One enrollment leaf | DONE and reviewed. Leaf committed, blinding returned, tests verify inclusion against the real log. | Done. |
| 17 | Emergency track congestion floor | DONE. Track-aware floor added after a reviewer showed the laundering objection was unsupported. | Done. |

## Standing rules for this work

- A binding that must live inside a hash cannot be covered by that same hash.
  Row 19 needed a pre-image with the field zeroed, the shape an approval
  signature already uses. Look for the cycle before designing the field.
- Signing a value is not checking it. Moving a binding into a signed pre-image
  is half a fix: name the party that must REFUSE the value, and give it the
  state to do so. Row 25 took two rounds because the first version had both HSM
  gates signing a pin neither of them read.
- A guard that throws an engine error instead of returning a named refusal is a
  defect, not a style issue. Fifteen instances so far, and one of them hangs
  rather than throws, which no try recovers.
- Every fix needs a regression that fails against the pre-fix behaviour. A green
  suite has never once caught a defect on this project.
- PROVE each new regression by mutation, when you write it. Break the single
  line it defends, confirm the test fails, restore, and grep for the mutation
  marker. Five tests here passed for the wrong reason. Not one was caught by
  reading. Construct the hostile input so only the target check can reject it;
  if another guard would also catch it, the test proves that other guard.
- A fix that changes two things needs a mutation per change. The tree-size guard
  in row 24 looked defended until its own mutation stayed green, because the
  parity fix in the same commit was catching every case the test tried.
- Never assert a refusal with a regex alternation. Row 26 exists because an
  alternation let a reordered check answer for the guard the test names.
- Run the mutation harness the way the package runs tests. Mine omitted
  `SIGE_FAST=1`, the slow time-lock path timed out, and every mutation reported
  failures in tests it could not reach. A mutation that reddens a test it cannot
  touch means the harness is broken, not that the guard is broad.
- Log every defect in `2026-08-06-sige-defect-ledger.md` before fixing it, and
  read its class table first. A class with three or more entries needs the
  property named, not another patch.
- A mutation driver restores by `diff` against a snapshot, never by grepping for
  a marker. A deleted line leaves no marker, and a driver killed mid-run left one
  guard missing for two later runs before anything noticed.
- A refusal test asserts the refusal string. `notEqual(null)` lets a weakened
  guard fall through to a later check and stay green.
- Scripted edits assert their match count. A replace that silently matches
  nothing leaves the fix unapplied and the suite still green. That has happened.
- Dispatch an adversarial review after each claim-breaking step. Four separate
  rounds have found a new defect inside the fix for the previous one.
- Adversarial reviewers get told to attack, never to read, and are given the
  authority to contradict the brief. Several controller instructions have been
  wrong and the reviewers were right to refuse them.
- Give reviewers the already-tracked rows so a round is not spent rediscovering
  them. Both reviewers in round nine went past their briefs because of it.
