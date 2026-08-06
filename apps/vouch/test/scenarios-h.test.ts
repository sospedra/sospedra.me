import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hex } from '../src/protocol/bytes.ts'
import { GENESIS_ROOT } from '../src/protocol/genesis.ts'
import type { CheckLog } from '../src/protocol/verify.ts'
import { scenarios } from '../src/scenarios/index.ts'
import { scenario as s20 } from '../src/scenarios/s20-key-rotation.ts'
import { scenario as s21 } from '../src/scenarios/s21-first-contact-fork.ts'
import { scenario as s22 } from '../src/scenarios/s22-authorized-false-data.ts'

const REQUIRED_FIRST_CONTACT_SENTENCE =
  'First contact proves valid genesis descent, not global freshness or ' +
  'uniqueness of the presented descendant.'

const REQUIRED_TRUTH_LIMIT_SENTENCE =
  'The system does not guarantee that authorized input data is true in the ' +
  'physical world.'

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

test('s20 key rotation: the key1 attempt fails at step 4 with UNAUTHORIZED_KEY', () => {
  const t = s20.run()
  assert.ok(t.checks)
  const [attempt1] = splitAtStepReset(t.checks)
  assert.equal(attempt1.length, 4)
  for (const check of attempt1.slice(0, 3)) assert.equal(check.pass, true)
  const failing = attempt1.at(-1)
  assert.equal(failing?.step, 4)
  assert.equal(failing?.pass, false)
  assert.equal(failing?.error, 'UNAUTHORIZED_KEY')
})

test('s20 key rotation: the key2 attempt fully accepts', () => {
  const t = s20.run()
  assert.ok(t.checks)
  const [, attempt2] = splitAtStepReset(t.checks)
  assertFullyAccepted(attempt2)
})

test('s20 verdict is REJECT UNAUTHORIZED_KEY and names the observed rule', () => {
  const t = s20.run()
  assert.equal(t.verdict.kind, 'REJECT')
  assert.equal(t.verdict.error, 'UNAUTHORIZED_KEY')
  assert.match(t.verdict.note, /rule "receipt-key-status"/)
})

test('s20 trace shows the revoked-key1 witness beside the active-key2 witness', () => {
  const t = s20.run()
  const objects = t.steps.flatMap((s) => s.objects ?? [])
  const witness1 = objects.find((o) => o.name === 'witness-key1')
  const witness2 = objects.find((o) => o.name === 'witness-key2')
  assert.ok(witness1)
  assert.ok(witness2)
  assert.equal(witness1?.decoded.status, '0')
  assert.equal(witness2?.decoded.status, '1')
})

test('s20 is deterministic', () => {
  assert.deepEqual(s20.run(), s20.run())
})

test('s21 first-contact fork: the world-B bundle genuinely verifies with a full passing ladder, and so does world A', () => {
  const t = s21.run()
  assert.ok(t.checks)
  const [worldA, worldB] = splitAtStepReset(t.checks)
  assertFullyAccepted(worldA)
  assertFullyAccepted(worldB)
})

test('s21 does not claim an unskipped ladder, since persistence bookkeeping is skipped by design', () => {
  const t = s21.run()
  assert.ok(t.checks)
  assert.ok(!t.verdict.note.toLowerCase().includes('unskipped'))
  const skippedCount = t.checks.filter((c) => c.skipped).length
  assert.equal(skippedCount, 2)
})

test('no scenario claims every check passes while its own trace skips one', () => {
  const OVERCLAIMS = [
    'every check in this ladder genuinely passes',
    'unskipped',
  ]
  for (const scenario of scenarios) {
    const t = scenario.run()
    const skipped = t.checks?.filter((c) => c.skipped).length ?? 0
    if (skipped === 0) continue
    const note = t.verdict.note.toLowerCase()
    for (const claim of OVERCLAIMS) {
      assert.ok(
        !note.includes(claim),
        `${scenario.meta.slug} skips ${skipped} check(s) but claims "${claim}"`,
      )
    }
  }
})

test('s21 reports LIMITATION with the exact spec 18 first-contact sentence', () => {
  const t = s21.run()
  assert.equal(t.verdict.kind, 'LIMITATION')
  assert.ok(t.verdict.note.includes(REQUIRED_FIRST_CONTACT_SENTENCE))
})

test('s21 both worlds share the genesis root and differ at their heads', () => {
  const t = s21.run()
  const objects = t.steps.flatMap((s) => s.objects ?? [])

  const sealA = objects.find((o) => o.name === 'world-a-seal')
  const sealB = objects.find((o) => o.name === 'world-b-seal')
  assert.ok(sealA)
  assert.ok(sealB)
  assert.equal(sealA?.decoded.startRoot, hex(GENESIS_ROOT))
  assert.equal(sealA?.decoded.startRoot, sealB?.decoded.startRoot)
  assert.notEqual(sealA?.decoded.endRoot, sealB?.decoded.endRoot)

  const headA = objects.find((o) => o.name === 'head-world-a')
  const headB = objects.find((o) => o.name === 'head-world-b')
  assert.ok(headA)
  assert.ok(headB)
  assert.notEqual(headA?.decoded.stateRoot, headB?.decoded.stateRoot)

  const balanceA = objects.find((o) => o.name === 'balance-world-a')
  const balanceB = objects.find((o) => o.name === 'balance-world-b')
  assert.ok(balanceA)
  assert.ok(balanceB)
  assert.notEqual(balanceA?.decoded.balance, balanceB?.decoded.balance)
})

test('s21 is deterministic', () => {
  assert.deepEqual(s21.run(), s21.run())
})

test('s22 authorized false data: every check in the ladder passes', () => {
  const t = s22.run()
  assert.ok(t.checks)
  assertFullyAccepted(t.checks)
})

test('s22 reports LIMITATION with the exact spec 4 authorization-not-truth sentence', () => {
  const t = s22.run()
  assert.equal(t.verdict.kind, 'LIMITATION')
  assert.ok(t.verdict.note.includes(REQUIRED_TRUTH_LIMIT_SENTENCE))
})

test('s22 trace carries the claimed balance as physically unverifiable', () => {
  const t = s22.run()
  const objects = t.steps.flatMap((s) => s.objects ?? [])
  const claim = objects.find((o) => o.name === 'physical-world-claim')
  assert.ok(claim)
  assert.equal(claim?.decoded.accountId, 'auditor')
  assert.equal(claim?.decoded.claimedInitialBalance, '1000000')
})

test('s22 is deterministic', () => {
  assert.deepEqual(s22.run(), s22.run())
})
