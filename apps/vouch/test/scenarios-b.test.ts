import assert from 'node:assert/strict'
import { test } from 'node:test'
import { scenario as s01 } from '../src/scenarios/s01-author-concurrency.ts'
import { scenario as s02 } from '../src/scenarios/s02-payload-tampering.ts'
import { scenario as s03 } from '../src/scenarios/s03-author-replay.ts'

test('s01 author concurrency accepts', () => {
  const t = s01.run()
  assert.equal(t.verdict.kind, 'ACCEPT')
  assert.ok(t.verdict.note.length > 0)
})

test('s01 is deterministic', () => {
  assert.deepEqual(s01.run(), s01.run())
})

test('s01 trace carries every spec-17 check step from the verifier', () => {
  const t = s01.run()
  assert.ok(t.checks)
  assert.deepEqual(
    t.checks.map((c) => c.step),
    Array.from({ length: 19 }, (_, i) => i + 1),
  )
  const checkSteps = t.steps.filter((s) => s.kind === 'check')
  assert.equal(checkSteps.length, t.checks.length)
  for (const [index, step] of checkSteps.entries()) {
    assert.equal(step.check?.name, t.checks[index].name)
    assert.equal(step.check?.pass, t.checks[index].pass)
  }
})

test('s01 trace shows both author tips advancing independently', () => {
  const t = s01.run()
  const objects = t.steps.flatMap((s) => s.objects ?? [])
  const aliceTip = objects.find((o) => o.name === 'alice-tip')
  const bobTip = objects.find((o) => o.name === 'bob-tip')
  assert.ok(aliceTip)
  assert.ok(bobTip)
  assert.notEqual(aliceTip?.hex, bobTip?.hex)
  assert.equal(aliceTip?.decoded.authorSequence, '2')
  assert.equal(bobTip?.decoded.authorSequence, '2')

  const authorEvents = objects.filter((o) => o.type === 'author-event')
  assert.deepEqual(
    authorEvents.map((o) => o.decoded.globalSequence),
    ['1', '2', '3', '4'],
  )
  assert.deepEqual(
    authorEvents.map((o) => o.decoded.authorName),
    ['alice', 'bob', 'alice', 'bob'],
  )
  assert.deepEqual(
    authorEvents.map((o) => o.decoded.authorSequence),
    ['1', '1', '2', '2'],
  )
})

test('s02 payload tampering rejects with INVALID_PROOF, rule author-signature', () => {
  const t = s02.run()
  assert.equal(t.verdict.kind, 'REJECT')
  assert.equal(t.verdict.error, 'INVALID_PROOF')
  assert.match(t.verdict.note, /rule "author-signature"/)
  assert.ok(t.checks)

  const failing = t.checks.at(-1)
  assert.equal(failing?.step, 14)
  assert.equal(failing?.pass, false)
  assert.equal(failing?.error, 'INVALID_PROOF')
  for (const check of t.checks.slice(0, -1)) assert.equal(check.pass, true)

  const checkSteps = t.steps.filter((s) => s.kind === 'check')
  assert.equal(checkSteps.length, t.checks.length)
  assert.equal(checkSteps.at(-1)?.check?.pass, false)
  for (const step of checkSteps.slice(0, -1)) {
    assert.equal(step.check?.pass, true)
  }
})

test('s02 is deterministic', () => {
  assert.deepEqual(s02.run(), s02.run())
})

test('s02 trace shows the original and tampered payload bytes as separate objects', () => {
  const t = s02.run()
  const objects = t.steps.flatMap((s) => s.objects ?? [])
  const original = objects.find((o) => o.name === 'original-payload')
  const tampered = objects.find((o) => o.name === 'tampered-payload')
  assert.ok(original)
  assert.ok(tampered)
  assert.notEqual(original?.hex, tampered?.hex)
})

test('s03 author replay rejects with INVALID_PROOF, rule author-sequence', () => {
  const t = s03.run()
  assert.equal(t.verdict.kind, 'REJECT')
  assert.equal(t.verdict.error, 'INVALID_PROOF')
  assert.match(t.verdict.note, /rule "author-sequence"/)
  assert.ok(t.checks)

  const failing = t.checks.at(-1)
  assert.equal(failing?.step, 14)
  assert.equal(failing?.pass, false)
  assert.equal(failing?.error, 'INVALID_PROOF')
  for (const check of t.checks.slice(0, -1)) assert.equal(check.pass, true)

  const checkSteps = t.steps.filter((s) => s.kind === 'check')
  assert.equal(checkSteps.at(-1)?.check?.pass, false)
})

test('s03 is deterministic', () => {
  assert.deepEqual(s03.run(), s03.run())
})

test('s03 trace shows the honest server refusing the replay at submit time, before the malicious seal', () => {
  const t = s03.run()
  const refusalIndex = t.steps.findIndex(
    (s) =>
      s.kind === 'check' &&
      s.check?.name === 'author-sequence chain check (submit-time)',
  )
  assert.ok(refusalIndex >= 0)
  assert.equal(t.steps[refusalIndex]?.check?.pass, false)

  const sealIndex = t.steps.findIndex(
    (s) => s.objects?.some((o) => o.name === 'malicious-seal') ?? false,
  )
  assert.ok(sealIndex > refusalIndex)

  const rejectionCheckSteps = t.steps
    .slice(sealIndex + 1)
    .filter((s) => s.kind === 'check')
  assert.ok(rejectionCheckSteps.length > 0)
  assert.equal(rejectionCheckSteps.at(-1)?.check?.pass, false)
})

test('s03 replay-swap object diff shows authorSequence, the field that actually differs', () => {
  const t = s03.run()
  const swapStep = t.steps.find((s) =>
    s.objects?.some((o) => o.name === 'discarded-real-event'),
  )
  assert.ok(swapStep)
  const discarded = swapStep?.objects?.find(
    (o) => o.name === 'discarded-real-event',
  )
  const replayed = swapStep?.objects?.find((o) => o.name === 'replayed-event')
  assert.ok(discarded)
  assert.ok(replayed)
  assert.equal(discarded?.decoded.authorSequence, '2')
  assert.equal(replayed?.decoded.authorSequence, '1')
  assert.equal(
    discarded?.decoded.globalSequence,
    replayed?.decoded.globalSequence,
  )
})
