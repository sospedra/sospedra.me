import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { formatCountdown, momentOf, phasesFor } from './companion-phases.ts'
import { createShadowEngine } from './shadow-engine.ts'

const { b64 } = JSON.parse(
  readFileSync(join(import.meta.dirname, 'data/shadow.json'), 'utf8'),
)
const engine = createShadowEngine(b64)

const oviedo = engine.circumstances(43.3619, -5.8494)
const madrid = engine.circumstances(40.4168, -3.7038)
const capeTown = engine.circumstances(-33.92, 18.42)

test('a band site runs the eight-phase evening in order', () => {
  const phases = phasesFor(oviedo)
  assert.deepEqual(
    phases.map((phase) => phase.id),
    [
      'bite',
      'dimming',
      'purkinje',
      'bands',
      'diamond',
      'totality',
      'second-diamond',
      'waning',
    ],
  )
  for (let index = 1; index < phases.length; index += 1) {
    assert.equal(phases[index].start, phases[index - 1].end, phases[index].id)
    assert.ok(phases[index].end > phases[index].start)
  }
})

test('glasses come off exactly for totality', () => {
  const phases = phasesFor(oviedo)
  const off = phases.filter((phase) => phase.glasses === 'off')
  assert.equal(off.length, 1)
  assert.equal(off[0].id, 'totality')
  assert.ok(oviedo.totality)
  assert.equal(off[0].start, oviedo.totality.start)
  assert.equal(off[0].end, oviedo.totality.end)
})

test('a partial site never takes the glasses off', () => {
  const phases = phasesFor(madrid)
  assert.ok(phases.length > 0)
  assert.ok(phases.every((phase) => phase.glasses === 'on'))
  assert.ok(phases.every((phase) => phase.id !== 'totality'))
})

test('a site the shadow never visits gets nowhere', () => {
  assert.deepEqual(phasesFor(capeTown), [])
  assert.deepEqual(momentOf([], 0), { kind: 'nowhere' })
})

test('the moment resolves before, during and after', () => {
  const phases = phasesFor(oviedo)
  const timeline = oviedo.timeline
  assert.ok(timeline && oviedo.totality)

  const before = momentOf(phases, timeline.firstContact - 3600)
  assert.equal(before.kind, 'before')
  if (before.kind === 'before') {
    assert.equal(before.secondsToFirst, 3600)
  }

  const during = momentOf(phases, oviedo.totality.start + 10)
  assert.equal(during.kind, 'during')
  if (during.kind === 'during') {
    assert.equal(during.phase.id, 'totality')
    assert.ok(Math.abs(during.secondsLeft - (oviedo.totality.seconds - 10)) < 1)
    assert.equal(during.next?.id, 'second-diamond')
  }

  assert.equal(momentOf(phases, timeline.lastContact + 1).kind, 'after')
})

test('phase boundaries belong to the phase they open', () => {
  const phases = phasesFor(oviedo)
  assert.ok(oviedo.totality)
  const atSecondContact = momentOf(phases, oviedo.totality.start)
  assert.equal(atSecondContact.kind, 'during')
  if (atSecondContact.kind === 'during') {
    assert.equal(atSecondContact.phase.id, 'totality')
  }
})

test('countdowns read in the largest useful unit', () => {
  assert.equal(formatCountdown(2 * 86_400 + 3 * 3600 + 60), '2 d 03 h 01 m')
  assert.equal(formatCountdown(3 * 3600 + 5 * 60 + 7), '3 h 05 m 07 s')
  assert.equal(formatCountdown(95), '1 m 35 s')
  assert.equal(formatCountdown(-4), '0 m 00 s')
})
