import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { CheckLog } from '../src/protocol/verify.ts'
import { scenario as s05 } from '../src/scenarios/s05-hidden-algorithm.ts'
import { scenario as s06 } from '../src/scenarios/s06-shared-proof.ts'
import { scenario as s07 } from '../src/scenarios/s07-missing-signature-nonce-replay.ts'

function splitAtStepReset(checks: CheckLog[]): [CheckLog[], CheckLog[]] {
  const resetIndex = checks.findIndex(
    (c, i) => i > 0 && c.step <= checks[i - 1].step,
  )
  if (resetIndex === -1) throw new Error('expected two concatenated check logs')
  return [checks.slice(0, resetIndex), checks.slice(resetIndex)]
}

test('s05 hidden algorithm rejects with INVALID_PROOF, rule result', () => {
  const t = s05.run()
  assert.equal(t.verdict.kind, 'REJECT')
  assert.equal(t.verdict.error, 'INVALID_PROOF')
  assert.match(t.verdict.note, /rule "result"/)
})

test('s05 is deterministic', () => {
  assert.deepEqual(s05.run(), s05.run())
})

test('s05 fails at step 12 and no earlier step failed', () => {
  const t = s05.run()
  assert.ok(t.checks)
  const failing = t.checks.at(-1)
  assert.equal(failing?.step, 12)
  assert.equal(failing?.pass, false)
  assert.equal(failing?.error, 'INVALID_PROOF')
  for (const check of t.checks.slice(0, -1)) assert.equal(check.pass, true)
})

test('s05 trace shows the hidden function output and the replayed honest result as separate objects', () => {
  const t = s05.run()
  const objects = t.steps.flatMap((s) => s.objects ?? [])
  const hidden = objects.find((o) => o.name === 'hidden-function-output')
  const replayed = objects.find((o) => o.name === 'replayed-honest-result')
  assert.ok(hidden)
  assert.ok(replayed)
  assert.notEqual(hidden?.hex, replayed?.hex)
  assert.equal(
    Number(replayed?.decoded.balance) + 1000,
    Number(hidden?.decoded.balance),
  )
})

test('s06 shared proof accepts for both clients', () => {
  const t = s06.run()
  assert.equal(t.verdict.kind, 'ACCEPT')
  assert.ok(t.verdict.note.length > 0)
})

test('s06 is deterministic', () => {
  assert.deepEqual(s06.run(), s06.run())
})

test('s06 both bundles carry byte-identical query proof bytes and equal proofCacheKey', () => {
  const t = s06.run()
  const objects = t.steps.flatMap((s) => s.objects ?? [])
  const proofA = objects.find((o) => o.name === 'query-proof-client-a')
  const proofB = objects.find((o) => o.name === 'query-proof-client-b')
  assert.ok(proofA)
  assert.ok(proofB)
  assert.equal(proofA?.hex, proofB?.hex)
  assert.equal(proofA?.decoded.proofCacheKey, proofB?.decoded.proofCacheKey)
})

test('s06 receipts differ only in nonce', () => {
  const t = s06.run()
  const objects = t.steps.flatMap((s) => s.objects ?? [])
  const receiptA = objects.find((o) => o.name === 'receipt-client-a')
  const receiptB = objects.find((o) => o.name === 'receipt-client-b')
  assert.ok(receiptA)
  assert.ok(receiptB)
  assert.notEqual(receiptA?.decoded.nonce, receiptB?.decoded.nonce)
  const allFields = Object.keys(receiptA?.decoded ?? {})
  const comparedFields = allFields.filter(
    (field) => field !== 'nonce' && field !== 'who',
  )
  assert.ok(comparedFields.length >= 9)
  for (const field of comparedFields) {
    assert.equal(receiptA?.decoded[field], receiptB?.decoded[field])
  }
})

test('s07 verdict carries the first attack error and names both codes in the note', () => {
  const t = s07.run()
  assert.equal(t.verdict.kind, 'REJECT')
  assert.equal(t.verdict.error, 'INVALID_SIGNATURE')
  assert.match(t.verdict.note, /INVALID_SIGNATURE/)
  assert.match(t.verdict.note, /NONCE_MISMATCH/)
})

test('s07 is deterministic', () => {
  assert.deepEqual(s07.run(), s07.run())
})

test('s07 attack (a) fails at step 5 and attack (b) fails at step 6, nothing later passed', () => {
  const t = s07.run()
  assert.ok(t.checks)
  const [checksA, checksB] = splitAtStepReset(t.checks)

  const failingA = checksA.at(-1)
  assert.equal(failingA?.step, 5)
  assert.equal(failingA?.pass, false)
  assert.equal(failingA?.error, 'INVALID_SIGNATURE')
  for (const check of checksA.slice(0, -1)) assert.equal(check.pass, true)

  const failingB = checksB.at(-1)
  assert.equal(failingB?.step, 6)
  assert.equal(failingB?.pass, false)
  assert.equal(failingB?.error, 'NONCE_MISMATCH')
  for (const check of checksB.slice(0, -1)) assert.equal(check.pass, true)
})

test('s07 trace shows attack (a) fully resolved before attack (b) begins', () => {
  const t = s07.run()
  const attackAIndex = t.steps.findIndex(
    (s) => s.kind === 'act' && s.label.startsWith('attack (a)'),
  )
  const attackBIndex = t.steps.findIndex(
    (s) => s.kind === 'act' && s.label.startsWith('attack (b)'),
  )
  assert.ok(attackAIndex >= 0)
  assert.ok(attackBIndex > attackAIndex)

  const attackAChecks = t.steps
    .slice(attackAIndex + 1, attackBIndex)
    .filter((s) => s.kind === 'check')
  assert.ok(attackAChecks.length > 0)
  assert.equal(attackAChecks.at(-1)?.check?.pass, false)

  const attackBChecks = t.steps
    .slice(attackBIndex + 1)
    .filter((s) => s.kind === 'check')
  assert.ok(attackBChecks.length > 0)
  assert.equal(attackBChecks.at(-1)?.check?.pass, false)
})
