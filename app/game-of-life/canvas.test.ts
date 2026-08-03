import assert from 'node:assert/strict'
import test from 'node:test'
import { type Camera, keepCellInView } from './canvas.ts'

const camera: Camera = { x: 0, y: 0, zoom: 10 }
const rect = { width: 200, height: 100 }

test('keepCellInView returns the same camera when the cell is inside', () => {
  assert.equal(keepCellInView(camera, rect, [0, 0]), camera)
  assert.equal(keepCellInView(camera, rect, [5, 2]), camera)
})

test('keepCellInView pans toward a cell past the margin', () => {
  // half width 10, margin 2: cell x 20 needs the center at 12.5
  assert.deepEqual(keepCellInView(camera, rect, [20, 0]), {
    x: 12.5,
    y: 0,
    zoom: 10,
  })
  // half height 5, margin 2: cell y -9 needs the center at -5.5
  assert.deepEqual(keepCellInView(camera, rect, [0, -9]), {
    x: 0,
    y: -5.5,
    zoom: 10,
  })
})
