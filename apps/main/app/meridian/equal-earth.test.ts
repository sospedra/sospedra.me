import assert from 'node:assert/strict'
import test from 'node:test'
import {
  EQUAL_EARTH_ASPECT,
  equalEarthForward,
  equalEarthInverse,
} from './equal-earth.ts'

test('projects the origin to the frame centre', () => {
  const origin = equalEarthForward(0, 0)
  assert.ok(Math.abs(origin.x - 0.5) < 1e-12)
  assert.ok(Math.abs(origin.y - 0.5) < 1e-12)
})

test('reaches the frame edges at the extremes', () => {
  const east = equalEarthForward(180, 0)
  assert.ok(Math.abs(east.x - 1) < 1e-12)
  const north = equalEarthForward(0, 90)
  assert.ok(Math.abs(north.y) < 1e-12)
  const south = equalEarthForward(0, -90)
  assert.ok(Math.abs(south.y - 1) < 1e-12)
})

test('matches the published aspect ratio', () => {
  assert.ok(Math.abs(EQUAL_EARTH_ASPECT - 2.05458) < 0.001)
})

test('round-trips coordinates through the inverse', () => {
  for (const [longitude, latitude] of [
    [0, 0],
    [-3.7, 40.42],
    [151.2, -33.87],
    [-73.56, 45.5],
    [37.62, 55.75],
    [-175, -85],
    [179.9, 64],
  ]) {
    const projected = equalEarthForward(longitude, latitude)
    const restored = equalEarthInverse(projected)
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
  const wrapped = equalEarthForward(190, 10)
  assert.ok(wrapped.x > 1)
})
