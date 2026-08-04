import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clipRect,
  distance,
  handleAt,
  handleTolerance,
  orderedBounds,
  rectFromPoints,
} from './geometry.ts'

test('clipRect clamps a rect that overflows every edge', () => {
  assert.deepEqual(clipRect({ x: -3, y: -2, width: 30, height: 30 }, 20, 20), {
    x: 0,
    y: 0,
    width: 20,
    height: 20,
  })
  assert.deepEqual(clipRect({ x: 5, y: 19, width: 3, height: 4 }, 20, 20), {
    x: 5,
    y: 19,
    width: 3,
    height: 1,
  })
})

test('clipRect returns null when nothing overlaps', () => {
  assert.equal(clipRect({ x: 20, y: 0, width: 5, height: 5 }, 20, 20), null)
  assert.equal(clipRect({ x: 0, y: -5, width: 5, height: 5 }, 20, 20), null)
  assert.equal(clipRect({ x: 0, y: 0, width: 0, height: 5 }, 20, 20), null)
})

test('handleAt honors the tolerance radius', () => {
  const rect = { x: 10, y: 10, width: 11, height: 11 }
  assert.equal(handleAt(rect, { x: 12, y: 12 }, 2), 'nw')
  assert.equal(handleAt(rect, { x: 12, y: 12 }, 1), null)
  assert.equal(handleAt(rect, { x: 13, y: 13 }, 2), null)
  assert.equal(handleAt(rect, { x: 19, y: 21 }, 2), 'se')
})

test('handleAt prefers corners over edge midpoints', () => {
  const rect = { x: 10, y: 10, width: 11, height: 11 }
  assert.equal(handleAt(rect, { x: 12, y: 10 }, 3), 'nw')
})

test('handleTolerance widens as the zoom shrinks and floors at two', () => {
  assert.equal(handleTolerance(1), 3)
  assert.equal(handleTolerance(2), 2)
  assert.equal(handleTolerance(8), 2)
})

test('orderedBounds sorts each axis independently', () => {
  assert.deepEqual(orderedBounds({ x: 7, y: 2 }, { x: 3, y: 9 }), {
    x0: 3,
    y0: 2,
    x1: 7,
    y1: 9,
  })
  assert.deepEqual(orderedBounds({ x: 4, y: 4 }, { x: 4, y: 4 }), {
    x0: 4,
    y0: 4,
    x1: 4,
    y1: 4,
  })
})

test('rectFromPoints spans both corners inclusively', () => {
  assert.deepEqual(rectFromPoints({ x: 5, y: 5 }, { x: 2, y: 3 }), {
    x: 2,
    y: 3,
    width: 4,
    height: 3,
  })
  assert.deepEqual(rectFromPoints({ x: 1, y: 1 }, { x: 1, y: 1 }), {
    x: 1,
    y: 1,
    width: 1,
    height: 1,
  })
})

test('distance is euclidean', () => {
  assert.equal(distance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5)
  assert.equal(distance({ x: 2, y: 2 }, { x: 2, y: 2 }), 0)
})
