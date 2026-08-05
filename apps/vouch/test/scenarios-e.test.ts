import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { CheckLog } from '../src/protocol/verify.ts'
import { scenario as s11 } from '../src/scenarios/s11-isolated-freeze.ts'
import { scenario as s12 } from '../src/scenarios/s12-head-conflict-gossip.ts'
import { scenario as s13 } from '../src/scenarios/s13-stale-head.ts'

const REQUIRED_LIMITATION_SENTENCE =
  'Rollback is prevented for returning clients; freezing is not.'

function splitAtStepReset(checks: CheckLog[]): [CheckLog[], CheckLog[]] {
  const resetIndex = checks.findIndex(
    (c, i) => i > 0 && c.step <= checks[i - 1].step,
  )
  if (resetIndex === -1) throw new Error('expected two concatenated check logs')
  return [checks.slice(0, resetIndex), checks.slice(resetIndex)]
}

function assertFullyAccepted(checks: CheckLog[]): void {
  assert.equal(checks.length, 19)
  for (const check of checks) {
    if (!check.skipped) assert.equal(check.pass, true)
  }
}

test('s11 isolated freeze reports LIMITATION with the exact required sentence', () => {
  const t = s11.run()
  assert.equal(t.verdict.kind, 'LIMITATION')
  assert.ok(t.verdict.note.includes(REQUIRED_LIMITATION_SENTENCE))
})

test('s11 is deterministic', () => {
  assert.deepEqual(s11.run(), s11.run())
})

test('s11 both rounds fully accept, in full, and the sequence never advances', () => {
  const t = s11.run()
  assert.ok(t.checks)
  const [round1, round2] = splitAtStepReset(t.checks)
  assertFullyAccepted(round1)
  assertFullyAccepted(round2)

  const objects = t.steps.flatMap((s) => s.objects ?? [])
  const receipt1 = objects.find((o) => o.name === 'receipt-round-1')
  const receipt2 = objects.find((o) => o.name === 'receipt-round-2')
  assert.ok(receipt1)
  assert.ok(receipt2)
  assert.equal(receipt1?.decoded.stateSequence, receipt2?.decoded.stateSequence)
  assert.equal(receipt1?.decoded.stateRoot, receipt2?.decoded.stateRoot)

  const head1 = objects.find((o) => o.name === 'head-round-1')
  const head2 = objects.find((o) => o.name === 'head-round-2')
  assert.ok(head1)
  assert.ok(head2)
  assert.equal(head1?.decoded.sequence, head2?.decoded.sequence)
  assert.notEqual(head1?.decoded.latestAsOfMs, head2?.decoded.latestAsOfMs)
})

test('s12 reports EVIDENCE', () => {
  const t = s12.run()
  assert.equal(t.verdict.kind, 'EVIDENCE')
})

test('s12 is deterministic', () => {
  assert.deepEqual(s12.run(), s12.run())
})

test('s12 head-conflict evidence is non-null, PROVABLE_ON_RECORD, and carries both signed heads', () => {
  const t = s12.run()
  const objects = t.steps.flatMap((s) => s.objects ?? [])

  const evidenceObj = objects.find((o) => o.name === 'head-conflict-evidence')
  assert.ok(evidenceObj)
  assert.equal(evidenceObj?.decoded.kind, 'head-conflict')
  assert.equal(evidenceObj?.decoded.taxonomy, 'PROVABLE_ON_RECORD')
  assert.equal(evidenceObj?.decoded.objectCount, '4')

  const headA = objects.find((o) => o.name === 'head-canonical')
  const headB = objects.find((o) => o.name === 'head-shadow')
  assert.ok(headA)
  assert.ok(headB)
  assert.equal(headA?.decoded.latestAsOfMs, headB?.decoded.latestAsOfMs)
  assert.notEqual(headA?.decoded.stateRoot, headB?.decoded.stateRoot)
})

test('s13 stale head rejects with STALE_HEAD at step 16, nothing later reported', () => {
  const t = s13.run()
  assert.equal(t.verdict.kind, 'REJECT')
  assert.equal(t.verdict.error, 'STALE_HEAD')
  assert.ok(t.checks)
  assert.equal(t.checks.length, 16)
  const failing = t.checks.at(-1)
  assert.equal(failing?.step, 16)
  assert.equal(failing?.pass, false)
  assert.equal(failing?.error, 'STALE_HEAD')
  for (const check of t.checks.slice(0, -1)) assert.equal(check.pass, true)
})

test('s13 is deterministic', () => {
  assert.deepEqual(s13.run(), s13.run())
})
