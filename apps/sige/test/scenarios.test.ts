import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildScenarios } from '../src/scenarios/scenarios.ts'
import { ES, GENERIC } from '../src/world/profile.ts'

const EXPECTED_IDS = [
  'enrollment',
  'unseal',
  'single-gate',
  'wrong-account',
  'k-reconstruction',
  'forged-order',
  'log-refusals',
  'timed-commitment',
  'delay-proof',
  'congestion',
  'equivocation',
  'roles',
  'bypass',
  'release-control',
  'epoch-rotation',
  'reconciliation',
]

function mustFind(id: string) {
  const scenario = buildScenarios(GENERIC).find((s) => s.id === id)
  if (!scenario) throw new Error(`scenario ${id} not found`)
  return scenario
}

test('the catalog is complete', () => {
  assert.deepEqual(
    buildScenarios(GENERIC).map((s) => s.id),
    EXPECTED_IDS,
  )
})

for (const id of EXPECTED_IDS) {
  test(`scenario ${id} passes under the generic profile`, async () => {
    const scenario = mustFind(id)
    const steps: boolean[] = []
    const ok = await scenario.run((step) => steps.push(step.ok))
    assert.ok(ok, `scenario ${id} returned false`)
    assert.ok(steps.every(Boolean), `scenario ${id} logged a failing step`)
  })
}

test('scenario roles passes under the es profile too', async () => {
  const scenario = buildScenarios(ES).find((s) => s.id === 'roles')
  if (!scenario) throw new Error('scenario roles not found')
  assert.ok(await scenario.run(() => {}))
})
