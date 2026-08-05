import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { CheckLog } from '../src/protocol/verify.ts'
import { scenario as s17 } from '../src/scenarios/s17-config-timelock.ts'
import { scenario as s18 } from '../src/scenarios/s18-early-migration.ts'
import { scenario as s19 } from '../src/scenarios/s19-migration-chain.ts'

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

test('s17 config timelock accepts overall: the timelock holds end to end', () => {
  const t = s17.run()
  assert.equal(t.verdict.kind, 'ACCEPT')
})

test('s17 is deterministic', () => {
  assert.deepEqual(s17.run(), s17.run())
})

test('s17 checks carry three rounds: pre-boundary accepts, malicious early application fails at step 14, post-boundary accepts', () => {
  const t = s17.run()
  assert.ok(t.checks)
  const [preRound, afterPre] = splitAtStepReset(t.checks)
  const [maliciousRound, postRound] = splitAtStepReset(afterPre)

  assertFullyAccepted(preRound)
  assertFullyAccepted(postRound)

  assert.equal(maliciousRound.length, 14)
  for (const check of maliciousRound.slice(0, -1)) {
    assert.equal(check.pass, true)
  }
  const failing = maliciousRound.at(-1)
  assert.equal(failing?.step, 14)
  assert.equal(failing?.pass, false)
  assert.equal(failing?.error, 'INVALID_PROOF')
})

test('s17 pre-boundary fee is 250bp-derived and post-boundary fee is 500bp-derived, from the actual proven balances', () => {
  const t = s17.run()
  const objects = t.steps.flatMap((s) => s.objects ?? [])
  const comparison = objects.find((o) => o.name === 'fee-timelock-comparison')
  assert.ok(comparison)

  const amount = BigInt(comparison?.decoded.transferAmount ?? '0')
  const preFeeCharged = BigInt(comparison?.decoded.preBoundaryFeeCharged ?? '0')
  const postFeeCharged = BigInt(
    comparison?.decoded.postBoundaryFeeCharged ?? '0',
  )

  assert.equal(preFeeCharged, (amount * 250n) / 10_000n)
  assert.equal(postFeeCharged, (amount * 500n) / 10_000n)
  assert.notEqual(preFeeCharged, postFeeCharged)
})

test('s17 the early-application check step genuinely failed, not narrated', () => {
  const t = s17.run()
  const objects = t.steps.flatMap((s) => s.objects ?? [])
  const earlyResult = objects.find((o) => o.name === 'early-fee-result')
  assert.ok(earlyResult)

  const maliciousCheckSteps = t.steps.filter(
    (s) =>
      s.kind === 'check' && s.label.startsWith('malicious early application:'),
  )
  assert.ok(maliciousCheckSteps.length > 0)
  const failedStep = maliciousCheckSteps.find((s) => s.check?.pass === false)
  assert.ok(failedStep)
  assert.equal(failedStep?.check?.error, 'INVALID_PROOF')
})

test('s18 early migration rejects with INVALID_PROGRAM_CHAIN', () => {
  const t = s18.run()
  assert.equal(t.verdict.kind, 'REJECT')
  assert.equal(t.verdict.error, 'INVALID_PROGRAM_CHAIN')
})

test('s18 is deterministic', () => {
  assert.deepEqual(s18.run(), s18.run())
})

test('s18 fails at step 15 with rule migration-activation-sequence, and no later step passed', () => {
  const t = s18.run()
  assert.ok(t.checks)
  assert.equal(t.checks.length, 15)

  const failing = t.checks.at(-1)
  assert.equal(failing?.step, 15)
  assert.equal(failing?.pass, false)
  assert.equal(failing?.error, 'INVALID_PROGRAM_CHAIN')

  for (const check of t.checks.slice(0, -1)) {
    assert.equal(check.step < 15, true)
    assert.equal(check.pass, true)
  }

  assert.match(t.verdict.note, /rule "migration-activation-sequence"/)
})

test('s18 trace shows the governance-committed migration next to the bundle-attached (forged) one', () => {
  const t = s18.run()
  const objects = t.steps.flatMap((s) => s.objects ?? [])
  const committed = objects.find((o) => o.name === 'committed-migration')
  const attached = objects.find((o) => o.name === 'attached-migration')
  assert.ok(committed)
  assert.ok(attached)
  assert.notEqual(
    committed?.decoded.activationSequence,
    attached?.decoded.activationSequence,
  )
  assert.equal(
    BigInt(attached?.decoded.activationSequence ?? '0'),
    BigInt(committed?.decoded.activationSequence ?? '0') - 1n,
  )
})

test('s19 migration chain accepts across the era change', () => {
  const t = s19.run()
  assert.equal(t.verdict.kind, 'ACCEPT')
})

test('s19 is deterministic', () => {
  assert.deepEqual(s19.run(), s19.run())
})

test('s19 checks fully accept across the era change (19 entries, all pass)', () => {
  const t = s19.run()
  assert.ok(t.checks)
  assertFullyAccepted(t.checks)
})

test('s19 the walked chain hash advances by chainNext, computed and matched, not asserted', () => {
  const t = s19.run()
  const objects = t.steps.flatMap((s) => s.objects ?? [])
  const chainAdvance = objects.find((o) => o.name === 'chain-advance')
  assert.ok(chainAdvance)
  assert.equal(chainAdvance?.decoded.matchesJournal, 'true')
})

test('s19 the v2 ceiling fee differs from the v1 floor fee, and the actual credited balance uses the ceiling', () => {
  const t = s19.run()
  const objects = t.steps.flatMap((s) => s.objects ?? [])
  const feeComparison = objects.find((o) => o.name === 'fee-ceiling-comparison')
  assert.ok(feeComparison)

  const amount = BigInt(feeComparison?.decoded.amount ?? '0')
  const feeBp = BigInt(feeComparison?.decoded.feeBp ?? '0')
  const floor = BigInt(feeComparison?.decoded.v1FloorFee ?? '0')
  const ceil = BigInt(feeComparison?.decoded.v2CeilFee ?? '0')
  const actual = BigInt(feeComparison?.decoded.actualFeeCharged ?? '0')

  assert.equal(floor, (amount * feeBp) / 10_000n)
  assert.equal(ceil, (amount * feeBp + 9_999n) / 10_000n)
  assert.notEqual(floor, ceil)
  assert.equal(actual, ceil)
  assert.notEqual(actual, floor)
})

test('s19 trace discloses the manifest hash and governance authorization as committed but not chain-verified', () => {
  const t = s19.run()
  const objects = t.steps.flatMap((s) => s.objects ?? [])
  const commitment = objects.find((o) => o.name === 'migration-commitment')
  assert.ok(commitment)
  assert.equal(
    commitment?.decoded.manifestHashCoverage,
    'committed, not covered by chainNext',
  )
  assert.equal(
    commitment?.decoded.governanceAuthorizationCoverage,
    'committed, not covered by chainNext',
  )
})
