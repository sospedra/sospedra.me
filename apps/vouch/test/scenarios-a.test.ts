import assert from 'node:assert/strict'
import { test } from 'node:test'
import { scenario as s04 } from '../src/scenarios/s04-honest-query.ts'

test('s04 honest query accepts', () => {
  const t = s04.run()
  assert.equal(t.verdict.kind, 'ACCEPT')
  assert.ok(t.steps.length >= 8)
  assert.ok(t.steps.some((s) => s.kind === 'check' && s.check?.pass))
})

test('s04 is deterministic', () => {
  assert.deepEqual(s04.run(), s04.run())
})

test('s04 trace carries every spec-17 check step from the verifier', () => {
  const t = s04.run()
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

test('s04 objects carry non-empty hex, and a hash exactly where the type has one', () => {
  const t = s04.run()
  const objects = t.steps.flatMap((s) => s.objects ?? [])
  assert.ok(objects.length > 0)
  for (const object of objects) {
    assert.ok(object.hex.length > 0)
  }
  const hashByType = new Map<string, boolean>()
  for (const object of objects) {
    const hasHash = object.hash !== undefined && object.hash.length > 0
    const seen = hashByType.get(object.type)
    if (seen === undefined) {
      hashByType.set(object.type, hasHash)
    } else {
      assert.equal(
        hasHash,
        seen,
        `object type "${object.type}" mixes hash presence`,
      )
    }
  }
  assert.ok([...hashByType.values()].some(Boolean))
  assert.ok([...hashByType.values()].some((present) => !present))
})

test('s04 accept verdict carries a non-empty note', () => {
  const t = s04.run()
  assert.equal(t.verdict.kind, 'ACCEPT')
  assert.ok(t.verdict.note.length > 0)
})
