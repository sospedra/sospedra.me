import assert from 'node:assert/strict'
import test from 'node:test'
import type { CimsSnapshot } from './cims-store.ts'
import { captionText, seqText, stepTitle, titleMain } from './tour-copy.ts'

const names = {
  mountains: [
    { title: 'LA MOLA', elev: 1104, cap: 'THE MOLA CAPTION' },
    { title: 'PEDRAFORCA', elev: 2506, cap: 'FORKED STONE' },
  ],
  cities: [{ name: 'BARCELONA' }],
}

const snap = (patch: Partial<CimsSnapshot>): CimsSnapshot => ({
  ready: true,
  target: { kind: 'mountain', index: 0 },
  seqIndex: 0,
  enRoute: false,
  distanceKm: 0,
  autoOn: true,
  surfaceMode: 'contour',
  exaggeration: 2.8,
  peakLabels: [],
  ...patch,
})

test('mountain copy matches the prototype formats', () => {
  const arrived = snap({ target: { kind: 'mountain', index: 1 }, seqIndex: 1 })
  assert.equal(titleMain(arrived, names), 'PEDRAFORCA · 2506 M')
  assert.equal(stepTitle(arrived, names), '02 · PEDRAFORCA')
  assert.equal(captionText(arrived, names), 'FORKED STONE')
  assert.equal(seqText(arrived, 12), '02/12')
})

test('en-route copy carries the arrow and distance', () => {
  const flying = snap({
    target: { kind: 'mountain', index: 0 },
    enRoute: true,
    distanceKm: 42,
  })
  assert.equal(titleMain(flying, names), '→ LA MOLA · 1104 M')
  assert.equal(captionText(flying, names), 'EN ROUTE → LA MOLA · 42 KM')
})

test('city copy keeps the previous mountain in the sequence', () => {
  const city = snap({ target: { kind: 'city', index: 0 }, seqIndex: 4 })
  assert.equal(titleMain(city, names), 'BARCELONA')
  assert.equal(stepTitle(city, names), 'CIUTAT · BARCELONA')
  assert.equal(captionText(city, names), 'CIUTAT · BARCELONA')
  assert.equal(seqText(city, 12), '05/12')
})
