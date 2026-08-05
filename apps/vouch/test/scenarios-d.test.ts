import assert from 'node:assert/strict'
import { test } from 'node:test'
import { scenario as s08 } from '../src/scenarios/s08-database-swap.ts'
import { scenario as s09 } from '../src/scenarios/s09-env-var-semantics.ts'
import { scenario as s10 } from '../src/scenarios/s10-returning-rollback.ts'

test('s08 database swap rejects with INVALID_PROOF, rule continuity', () => {
  const t = s08.run()
  assert.equal(t.verdict.kind, 'REJECT')
  assert.equal(t.verdict.error, 'INVALID_PROOF')
  assert.match(t.verdict.note, /rule "continuity"/)
})

test('s08 is deterministic', () => {
  assert.deepEqual(s08.run(), s08.run())
})

test('s08 fails at step 14 and no earlier step failed', () => {
  const t = s08.run()
  assert.ok(t.checks)
  const failing = t.checks.at(-1)
  assert.equal(failing?.step, 14)
  assert.equal(failing?.pass, false)
  assert.equal(failing?.error, 'INVALID_PROOF')
  for (const check of t.checks.slice(0, -1)) assert.equal(check.pass, true)
})

test('s08 trace shows the canonical root and the shadow root side by side', () => {
  const t = s08.run()
  const objects = t.steps.flatMap((s) => s.objects ?? [])
  const canonical = objects.find((o) => o.name === 'canonical-root')
  const shadow = objects.find((o) => o.name === 'shadow-root')
  assert.ok(canonical)
  assert.ok(shadow)
  assert.notEqual(canonical?.hex, shadow?.hex)
})

test('s08 shadow balance is exactly 100x the honest balance', () => {
  const t = s08.run()
  const objects = t.steps.flatMap((s) => s.objects ?? [])
  const honest = objects.find((o) => o.name === 'honest-balance')
  const shadow = objects.find((o) => o.name === 'shadow-balance')
  assert.ok(honest)
  assert.ok(shadow)
  assert.equal(
    Number(shadow?.decoded.balance),
    Number(honest?.decoded.balance) * 100,
  )
})

test('s09 env-var semantics rejects with INVALID_PROOF, rule result', () => {
  const t = s09.run()
  assert.equal(t.verdict.kind, 'REJECT')
  assert.equal(t.verdict.error, 'INVALID_PROOF')
  assert.match(t.verdict.note, /rule "result"/)
})

test('s09 is deterministic', () => {
  assert.deepEqual(s09.run(), s09.run())
})

test('s09 fails at step 12 and no earlier step failed', () => {
  const t = s09.run()
  assert.ok(t.checks)
  const failing = t.checks.at(-1)
  assert.equal(failing?.step, 12)
  assert.equal(failing?.pass, false)
  assert.equal(failing?.error, 'INVALID_PROOF')
  for (const check of t.checks.slice(0, -1)) assert.equal(check.pass, true)
})

test('s09 trace shows the untrusted env var next to the committed config', () => {
  const t = s09.run()
  const objects = t.steps.flatMap((s) => s.objects ?? [])
  const envVar = objects.find((o) => o.name === 'env-fee-var')
  const config = objects.find((o) => o.name === 'committed-fee-config')
  assert.ok(envVar)
  assert.ok(config)
  assert.equal(envVar?.decoded.trust, 'untrusted')
  assert.equal(config?.decoded.trust, 'committed')
  assert.notEqual(envVar?.decoded.basisPoints, config?.decoded.current)
})

test('s10 returning rollback rejects with ROLLBACK_DETECTED', () => {
  const t = s10.run()
  assert.equal(t.verdict.kind, 'REJECT')
  assert.equal(t.verdict.error, 'ROLLBACK_DETECTED')
})

test('s10 is deterministic', () => {
  assert.deepEqual(s10.run(), s10.run())
})

test('s10 fails at step 11, steps 1-10 all pass, nothing later reported', () => {
  const t = s10.run()
  assert.ok(t.checks)
  assert.equal(t.checks.length, 11)
  for (const check of t.checks.slice(0, 10)) assert.equal(check.pass, true)
  const failing = t.checks.at(-1)
  assert.equal(failing?.step, 11)
  assert.equal(failing?.pass, false)
  assert.equal(failing?.error, 'ROLLBACK_DETECTED')
})

test('s10 trace shows the persisted trust sequence next to the stale bundle sequence', () => {
  const t = s10.run()
  const objects = t.steps.flatMap((s) => s.objects ?? [])
  const persisted = objects.find((o) => o.name === 'persisted-trust-sequence')
  const stale = objects.find((o) => o.name === 'stale-bundle-sequence')
  assert.ok(persisted)
  assert.ok(stale)
  assert.equal(persisted?.decoded.highestSequence, '6')
  assert.equal(stale?.decoded.stateSequence, '3')
})
