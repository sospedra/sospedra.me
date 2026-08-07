# sige pending work

Written 2026-08-07, after the round-15 batch landed at commit `37e6760e`
(76 files, 510 tests green). The remediation gospel is now empty: no open
Critical, Important or Minor. This file is what is left, and none of it came
from the gospel. It came from the `CLAIMS.md` known-gaps table, from the parts
of the paper that are not code, and from two operational debts.

Read `2026-08-06-sige-defect-ledger.md` before starting any row. Its class table
is the circularity detector, and the standing rules in
`2026-08-06-sige-remediation.md` still apply to every change here.

## The one rule that outranks the rest

Fifteen rounds ran. Eight of them found a defect inside the previous round's
fix, and two of those were claim breaks in work called done hours earlier. So:
nothing below is finished when the tests pass. It is finished when an
adversarial round has attacked it and found nothing.

## P0. Close the round-15 review

Two attackers were dispatched against `37e6760e` and have not reported. Their
findings come first, ahead of everything in this file. History says the expected
number of defects in an unreviewed round is not zero.

## P1. Gaps that weaken a paper claim

These are in `CLAIMS.md` under known gaps. A reviewer reads that table, checks
the code, and decides whether to trust the rest. Each row here is either work or
a decision to state the limit more sharply.

| # | Gap | What closing it takes | Size |
|---|---|---|---|
| 1 | The enrollment verifier is not constant time. A structural refusal returns before any curve operation, so refusal LATENCY says which stage failed even though the returned value does not. | A fixed-cost verifier: evaluate every predicate unconditionally with no early return, and pad the cheap paths. The predicates are already evaluated as an array literal, so the shape is half there. Measure before and after. | A day. Real cryptographic engineering, not a patch. |
| 2 | No gate can tell a real first head from a claimed one. A gate whose `rootHash` is null accepts any head as its starting state. | Trust provisioning: the first head arrives out of band, signed by a ceremony the gate already trusts. This demo has no such ceremony, so it is a design question first and code second. | Half a day for the design note, a day to build a stand-in ceremony. |
| 3 | A verifier refusal is not reachable through `enroll()`, because `checkEnvelope` catches every malformed submission first. | Either give `enroll()` a path that reaches the spec 7.5 verifier, or make the adapter's `PLACEHOLDER_CONDITIONS` the authoritative statement and stop implying the verifier is exercised end to end. | Two hours. Mostly a decision. |
| 4 | `parseLeaf` is the strict `LogLeafV1` decoder, so an honest one-unseal log already reports `unparsable: 1` because a closing leaf uses its own encoding. | Give `ClosingLeafV1` a leaf type inside `LogLeafV1`, or teach the report to classify closing leaves separately. The second is smaller and does not touch the record catalog. | Half a day. |
| 5 | `unparsable` is a count, not an alarm. It names no index and no leaf, and every real view has a non-zero baseline to hide one flipped byte inside. | Report the indices, not the count. The classifier already has them. | An hour. |
| 6 | Nothing verifies a record's `network_id` against the verifying world. | One comparison at the boundary, plus a regression that reaches it. | An hour. |
| 7 | `closures` counts docket rows, not closing leaves, so it is the one report counter an outsider cannot reproduce. | Count `CLOSURE` leaves from the log once gap 4 gives closing leaves a decodable form. Blocked by 4. | An hour after 4. |
| 8 | `enroll()` throws on an active epoch above the bound, because `gateIdentity` runs before the verifier's numeric checks. | Move the bound ahead of `gateIdentity`. Needs 2^32 rotations to reach, so it is a tidiness fix with a real regression. | An hour. |

## P2. Operational debt

| # | Item | Why it matters |
|---|---|---|
| 9 | `world.operatorJournal` is an unbounded array that every refusal appends to and nothing reads or trims. | A long-running demo grows without limit. Cap it, or expose a reader and document the cap. |
| 10 | Golden vectors were not regenerated when the head signature scheme changed in row 7, and the suite still passes. | Either they never covered head signatures, which is a coverage gap, or they are stale. One of the two attackers is checking this now. Resolve whichever it is. |
| 11 | `TransparencyLog`'s default tree id and `TREE_ID` in `log-records.ts` are the same string written twice, with nothing keeping them in step. | A silent divergence makes every signature fail at once. One shared constant. |
| 12 | Three timing tests flake on a busy host. | The constant-time assertion is already gone. The remaining ones measure real behaviour and should either be given generous bounds or moved behind a flag. |

## P3. The paper

The code exists to support a paper, so this is the actual deliverable and none of
it is written.

| # | Item |
|---|---|
| 13 | The VTD construction section. `src/core/vtd.ts` is the novel contribution and the soundness numbers reproduce exactly through `pnpm cli reproduce`. The prose does not exist. |
| 14 | A reviewer's guide: which command reproduces which number, and what `CLAIMS.md` tiers mean. |
| 15 | The defect ledger is arguably a paper artifact of its own. Fifteen adversarial rounds against a construction, with every fix mutation-proven, is a methodology result. Decide whether it ships. |

## What NOT to do

Do not reopen the gospel rows. They are closed and each one has a
mutation-proven regression. If a round-15 finding reopens one, it gets a NEW
ledger row naming the old one, which is how D23, D28 and D31 were kept honest.

Do not add a guard without a test that fails when you delete the guard's single
line. Twenty-one entries in ledger class C exist because that rule was skipped.
