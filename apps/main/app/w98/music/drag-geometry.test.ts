import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clampDragOffset,
  clampPanelOffset,
  panelDragBounds,
} from './drag-geometry.ts'

test('derives drag bounds from the panel current offset and stage edges', () => {
  assert.deepEqual(
    panelDragBounds(
      { x: 40, y: -20 },
      { bottom: 390, left: 140, right: 440, top: 90 },
      { bottom: 400, left: 100, right: 500, top: 50 },
    ),
    { maxX: 100, maxY: -10, minX: 0, minY: -60 },
  )
})

test('re-clamps a stored offset after the stage becomes smaller', () => {
  assert.deepEqual(
    clampPanelOffset(
      { x: 140, y: 80 },
      { bottom: 340, left: 240, right: 540, top: 140 },
      { bottom: 300, left: 100, right: 400, top: 100 },
    ),
    { x: 0, y: 40 },
  )
})

test('centers an axis when the panel is larger than its stage', () => {
  assert.deepEqual(
    clampPanelOffset(
      { x: 0, y: 0 },
      { bottom: 260, left: 0, right: 500, top: 40 },
      { bottom: 300, left: 100, right: 400, top: 0 },
    ),
    { x: 0, y: 0 },
  )
})

test('clamps live pointer movement to captured bounds', () => {
  assert.deepEqual(
    clampDragOffset(
      { x: 180, y: -90 },
      { maxX: 90, maxY: 70, minX: -40, minY: -30 },
    ),
    { x: 90, y: -30 },
  )
})
