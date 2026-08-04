import assert from 'node:assert/strict'
import test from 'node:test'
import { type OrbitPoint, orbitPaths } from './orbit-paths.ts'

const point = (front: boolean, x: number, y: number): OrbitPoint => ({
  front,
  x,
  y,
})

test('an empty orbit yields empty trails', () => {
  assert.deepEqual(orbitPaths([]), { back: '', front: '' })
})

test('a single point opens its own trail only', () => {
  assert.deepEqual(orbitPaths([point(true, 1, 2)]), {
    back: '',
    front: 'M 1.0 2.0',
  })
  assert.deepEqual(orbitPaths([point(false, 1, 2)]), {
    back: 'M 1.0 2.0',
    front: '',
  })
})

test('same-side points chain into one polyline', () => {
  const trails = orbitPaths([
    point(true, 0, 0),
    point(true, 1, 0),
    point(true, 2, 1),
  ])
  assert.deepEqual(trails, {
    back: '',
    front: 'M 0.0 0.0 L 1.0 0.0 L 2.0 1.0',
  })
})

test('a limb crossing draws the shared segment on both trails', () => {
  const trails = orbitPaths([point(true, 0, 0), point(false, 1, 0)])
  assert.deepEqual(trails, {
    back: ' M 0.0 0.0 L 1.0 0.0',
    front: 'M 0.0 0.0 L 1.0 0.0',
  })
})

test('re-entry opens a fresh subpath from the last hidden point', () => {
  const trails = orbitPaths([
    point(true, 0, 0),
    point(true, 1, 0),
    point(false, 2, 0),
    point(false, 3, 0),
    point(true, 4, 0),
  ])
  assert.deepEqual(trails, {
    back: ' M 1.0 0.0 L 2.0 0.0 L 3.0 0.0 L 4.0 0.0',
    front: 'M 0.0 0.0 L 1.0 0.0 L 2.0 0.0 M 3.0 0.0 L 4.0 0.0',
  })
})

test('coordinates keep one signed decimal', () => {
  assert.deepEqual(orbitPaths([point(false, 1.26, -0.04)]), {
    back: 'M 1.3 -0.0',
    front: '',
  })
})
