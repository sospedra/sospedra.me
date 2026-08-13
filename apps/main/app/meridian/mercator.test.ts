import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MERCATOR_ASPECT,
  MERCATOR_NORTH_LATITUDE,
  MERCATOR_SOUTH_LATITUDE,
  mercatorForward,
  mercatorInverse,
} from './mercator.ts'

test('projects the prime meridian to the horizontal centre', () => {
  const origin = mercatorForward(0, 0)
  assert.ok(Math.abs(origin.x - 0.5) < 1e-12)
})

test('reaches the frame edges at the crop limits', () => {
  const east = mercatorForward(180, 0)
  assert.ok(Math.abs(east.x - 1) < 1e-12)
  const west = mercatorForward(-180, 0)
  assert.ok(Math.abs(west.x) < 1e-12)
  const north = mercatorForward(0, MERCATOR_NORTH_LATITUDE)
  assert.ok(Math.abs(north.y) < 1e-12)
  const south = mercatorForward(0, MERCATOR_SOUTH_LATITUDE)
  assert.ok(Math.abs(south.y - 1) < 1e-12)
})

test('clamps latitudes beyond the crop to the frame edges', () => {
  assert.ok(Math.abs(mercatorForward(0, 90).y) < 1e-12)
  assert.ok(Math.abs(mercatorForward(0, -90).y - 1) < 1e-12)
})

test('matches the cropped web-mercator aspect ratio', () => {
  assert.ok(Math.abs(MERCATOR_ASPECT - 1.40924) < 0.001)
})

test('round-trips coordinates through the inverse', () => {
  for (const [longitude, latitude] of [
    [0, 0],
    [-3.7, 40.42],
    [151.2, -33.87],
    [-73.56, 45.5],
    [37.62, 55.75],
    [-175, -59.9],
    [179.9, 64],
    [-21.94, 64.15],
  ]) {
    const projected = mercatorForward(longitude, latitude)
    const restored = mercatorInverse(projected)
    assert.ok(
      Math.abs(restored.longitude - longitude) < 1e-6,
      `longitude drifted for ${longitude},${latitude}: ${restored.longitude}`,
    )
    assert.ok(
      Math.abs(restored.latitude - latitude) < 1e-6,
      `latitude drifted for ${longitude},${latitude}: ${restored.latitude}`,
    )
  }
})

test('keeps antimeridian wraps beyond the frame edge', () => {
  const wrapped = mercatorForward(190, 10)
  assert.ok(wrapped.x > 1)
})

test('inverse clamps frame overshoot onto the crop', () => {
  const above = mercatorInverse({ x: 0.5, y: -0.2 })
  assert.ok(Math.abs(above.latitude - MERCATOR_NORTH_LATITUDE) < 1e-9)
  const below = mercatorInverse({ x: 0.5, y: 1.2 })
  assert.ok(Math.abs(below.latitude - MERCATOR_SOUTH_LATITUDE) < 1e-9)
})
