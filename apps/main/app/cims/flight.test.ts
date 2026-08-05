import assert from 'node:assert/strict'
import test from 'node:test'
import {
  arrivePose,
  flightPoint,
  orbitCameraPosition,
  planLaunch,
  showcaseTargets,
  slotViewFor,
  wrapStep,
} from './flight.ts'

const FLAT = () => 0

test('wrapStep wraps in both directions', () => {
  assert.equal(wrapStep(-1, 12), 11)
  assert.equal(wrapStep(12, 12), 0)
  assert.equal(wrapStep(5, 12), 5)
})

test('planLaunch places the end point on the approach ring', () => {
  const plan = planLaunch({
    cam: { x: 10000, y: 5000, z: 0 },
    targetX: 0,
    targetZ: 0,
    targetH: 1000,
    approachRange: 2600,
    altitudeOffset: 300,
    ex: 2.8,
    reduced: false,
    heightAtEx: FLAT,
  })
  assert.equal(plan.dist, 10000)
  assert.equal(plan.end.x, 2600)
  assert.equal(plan.end.z, 0)
  assert.equal(plan.end.y, 1000 * 2.8 + 300)
  assert.ok(Math.abs(plan.durationMs - (1 + 10000 / 60000) * 1000) < 1e-9)
  assert.equal(plan.arcHeight, 2200 - (5000 - plan.end.y))
})

test('planLaunch respects the terrain clearance floor and reduced motion', () => {
  const plan = planLaunch({
    cam: { x: 100, y: 0, z: 0 },
    targetX: 0,
    targetZ: 0,
    targetH: 0,
    approachRange: 2600,
    altitudeOffset: 300,
    ex: 2.8,
    reduced: true,
    heightAtEx: () => 9000,
  })
  assert.equal(plan.end.y, 9110)
  assert.equal(plan.durationMs, 1)
})

test('flightPoint interpolates with a parabolic arc', () => {
  const from = { x: 0, y: 0, z: 0 }
  const end = { x: 100, y: 0, z: 0 }
  assert.deepEqual(flightPoint(from, end, 1000, 0), from)
  assert.deepEqual(flightPoint(from, end, 1000, 1), end)
  assert.deepEqual(flightPoint(from, end, 1000, 0.5), {
    x: 50,
    y: 1000,
    z: 50 * 0,
  })
})

test('arrivePose recovers orbit parameters from the camera frame', () => {
  const pose = arrivePose({ x: 100, y: 380, z: 0 }, { x: 0, y: 100, z: 0 }, 2.8)
  assert.equal(pose.range, 300)
  assert.equal(pose.heading, Math.atan2(100, 0))
  assert.equal(pose.pitch, Math.asin(100 / 300))
})

test('showcaseTargets sweeps half a turn and breathes the range', () => {
  const start = showcaseTargets(0, 1, 2000)
  assert.equal(start.headingT, 1)
  assert.equal(start.rangeT, 2000)
  assert.equal(start.done, false)
  const end = showcaseTargets(9, 1, 2000)
  assert.equal(end.headingT, 1 + Math.PI)
  assert.equal(end.rangeT, 2000 * 1.18)
  assert.equal(end.done, true)
})

test('slotViewFor clamps the approach geometry', () => {
  assert.deepEqual(slotViewFor(1000), {
    approachRange: 2700,
    altitudeOffset: 320,
    peakSpan: 150,
  })
  assert.equal(slotViewFor(0).approachRange, 1500)
  assert.equal(slotViewFor(10000).approachRange, 4600)
})

test('orbitCameraPosition places the camera on the orbit sphere', () => {
  const cam = orbitCameraPosition(
    { range: 1000, heading: 0, pitch: Math.PI / 2 },
    { x: 5, y: 10, z: 7 },
    2,
  )
  assert.ok(Math.abs(cam.x - 5) < 1e-9)
  assert.ok(Math.abs(cam.y - (20 + 1000)) < 1e-9)
  assert.ok(Math.abs(cam.z - 7) < 1e-12)
})
