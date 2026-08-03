import assert from 'node:assert/strict'
import test from 'node:test'
import {
  timeGaugeProgress,
  volumeGaugeBackground,
  volumeGaugeProgress,
} from './player-gauge.ts'

const panelRect = { height: 1254, left: 0, top: 0, width: 1254 }
const volumeRect = { height: 464, left: 0, top: 0, width: 197 }

test('maps pointer angles onto the time gauge sweep', () => {
  assert.equal(
    timeGaugeProgress(panelRect, { x: 0, y: 619.68 }),
    0.2279715830770862,
  )
  assert.equal(
    timeGaugeProgress(panelRect, { x: 189.47, y: 869.68 }),
    0.5460791833403392,
  )
  assert.equal(timeGaugeProgress(panelRect, { x: 622.47, y: 0 }), 1)
  assert.equal(timeGaugeProgress(panelRect, { x: 300, y: 100 }), 0)
})

test('normalizes the time gauge by panel rect, not by pixels', () => {
  const scaledRect = { height: 627, left: 100, top: 50, width: 627 }
  assert.equal(
    timeGaugeProgress(scaledRect, { x: 150, y: 359.84 }),
    0.2279715830770862,
  )
})

test('maps pointers across the volume linear and conic regions', () => {
  const emptyRect = { height: 464, left: 0, top: 0, width: 0 }
  assert.equal(volumeGaugeProgress(panelRect, emptyRect, { x: 10, y: 10 }), 0)
  assert.equal(
    volumeGaugeProgress(panelRect, volumeRect, { x: 100, y: 100 }),
    0.25945933417781536,
  )
  assert.equal(volumeGaugeProgress(panelRect, volumeRect, { x: 190, y: 0 }), 0)
  assert.equal(
    volumeGaugeProgress(panelRect, volumeRect, { x: 800, y: 800 }),
    0.8296559000710395,
  )
  assert.equal(volumeGaugeProgress(panelRect, volumeRect, { x: 30, y: 440 }), 1)
})

test('paints the volume gauge as a clamped linear-then-conic gradient', () => {
  assert.equal(
    volumeGaugeBackground(0.3),
    'linear-gradient(206.86596deg, var(--music-orange) 0 29.877938999999998%, var(--music-orange-deep) 29.877938999999998%)',
  )
  assert.equal(
    volumeGaugeBackground(0.8),
    'conic-gradient(from 59.5deg at -60.67% 35.29%, var(--music-orange) 0 73.23200000000001deg, var(--music-orange-deep) 73.23200000000001deg)',
  )
  assert.equal(
    volumeGaugeBackground(1.5),
    'conic-gradient(from 59.5deg at -60.67% 35.29%, var(--music-orange) 0 91.54deg, var(--music-orange-deep) 91.54deg)',
  )
})
