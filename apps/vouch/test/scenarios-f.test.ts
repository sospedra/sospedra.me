import assert from 'node:assert/strict'
import { test } from 'node:test'
import { scenario as s14 } from '../src/scenarios/s14-omitted-write.ts'
import {
  NON_PORTABILITY_SENTENCE,
  scenario as s15,
} from '../src/scenarios/s15-missed-proof-deadline.ts'
import { scenario as s16 } from '../src/scenarios/s16-float-config.ts'

test('s14 omitted write reports EVIDENCE, taxonomy PROVABLE_ON_RECORD', () => {
  const t = s14.run()
  assert.equal(t.verdict.kind, 'EVIDENCE')
  assert.equal(s14.meta.taxonomy, 'PROVABLE_ON_RECORD')
})

test('s14 is deterministic', () => {
  assert.deepEqual(s14.run(), s14.run())
})

test('s14 the honest query fully accepts before the omission evidence is computed', () => {
  const t = s14.run()
  assert.ok(t.checks)
  assert.equal(t.checks.length, 19)
  for (const check of t.checks) {
    if (!check.skipped) assert.equal(check.pass, true)
  }
})

test('s14 ack-omission evidence is non-null, PROVABLE_ON_RECORD, and carries the signed ack', () => {
  const t = s14.run()
  const objects = t.steps.flatMap((s) => s.objects ?? [])
  const ack = objects.find((o) => o.name === 'write-ack')
  const evidenceObj = objects.find((o) => o.name === 'ack-omission-evidence')
  assert.ok(ack)
  assert.ok(evidenceObj)
  assert.equal(ack?.decoded.mustLandBySequence, '5')
  assert.equal(evidenceObj?.decoded.kind, 'ack-omission')
  assert.equal(evidenceObj?.decoded.taxonomy, 'PROVABLE_ON_RECORD')
  assert.equal(evidenceObj?.decoded.provenThrough, '6')
  assert.equal(evidenceObj?.decoded.included, 'false')
  assert.match(evidenceObj?.decoded.detail ?? '', /mustLandBySequence 5/)
})

test('s14 the below-boundary call returns null; the contrast is the point', () => {
  const t = s14.run()
  const contrastStep = t.steps.find((s) => s.detail === 'result: null')
  assert.ok(contrastStep)
  assert.match(contrastStep?.label ?? '', /provenThrough=4/)
  assert.match(contrastStep?.label ?? '', /returns null/)
  assert.match(contrastStep?.label ?? '', /not evidence/)
})

test('s15 missed proof deadline reports LIMITATION', () => {
  const t = s15.run()
  assert.equal(t.verdict.kind, 'LIMITATION')
  assert.equal(s15.meta.taxonomy, 'LIMITATION')
})

test('s15 is deterministic', () => {
  assert.deepEqual(s15.run(), s15.run())
})

test('s15 the note states the non-portability point exactly, and no Evidence object is produced', () => {
  const t = s15.run()
  assert.ok(t.verdict.note.includes(NON_PORTABILITY_SENTENCE))
  assert.deepEqual(t.checks, [])
  const objects = t.steps.flatMap((s) => s.objects ?? [])
  assert.equal(
    objects.some((o) => o.type === 'evidence'),
    false,
  )
})

test('s15 contrasts explicitly with s14', () => {
  const t = s15.run()
  assert.match(t.verdict.note, /s14/)
})

test('s16 float config rejects with the observed error and rule', () => {
  const t = s16.run()
  assert.equal(t.verdict.kind, 'REJECT')
  assert.equal(t.verdict.error, 'INVALID_PROOF')
  assert.match(t.verdict.note, /rule "payload"/)
})

test('s16 is deterministic', () => {
  assert.deepEqual(s16.run(), s16.run())
})

test('s16 fails at step 14 (the transition walk) with rule payload, no earlier step failed', () => {
  const t = s16.run()
  assert.ok(t.checks)
  assert.equal(t.checks.length, 14)
  const failing = t.checks.at(-1)
  assert.equal(failing?.step, 14)
  assert.equal(failing?.pass, false)
  assert.equal(failing?.error, 'INVALID_PROOF')
  for (const check of t.checks.slice(0, -1)) assert.equal(check.pass, true)
})

test('s16 the honest server genuinely refuses the malformed payload at submit, a real caught error', () => {
  const t = s16.run()
  const refusal = t.steps.find(
    (s) => s.check?.name === 'set-config payload decode (submit-time)',
  )
  assert.ok(refusal)
  assert.equal(refusal?.check?.pass, false)
  assert.equal(refusal?.check?.error, 'payload')
})

test('s16 shows the float bytes and their competing IEEE-754 and canonical-u64 interpretations', () => {
  const t = s16.run()
  const objects = t.steps.flatMap((s) => s.objects ?? [])
  const floatObj = objects.find((o) => o.name === 'float-payload-bytes')
  const u64Obj = objects.find((o) => o.name === 'canonical-u64-read')
  assert.ok(floatObj)
  assert.ok(u64Obj)
  assert.equal(floatObj?.hex, '3fb3333333333333')
  assert.equal(floatObj?.decoded.ieee754Value, '0.075')
  assert.equal(u64Obj?.hex, floatObj?.hex)
  assert.notEqual(u64Obj?.decoded.u64Value, '0')
})
