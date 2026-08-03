import assert from 'node:assert/strict'
import test from 'node:test'
import { floodFill } from './fill.ts'
import type { Rgba } from './palette.ts'
import { createBitmap, drawRect, getPx } from './raster.ts'

const BLACK: Rgba = [0, 0, 0, 255]
const RED: Rgba = [255, 0, 0, 255]
const WHITE: Rgba = [255, 255, 255, 255]

test('floodFill stops at a drawn border', () => {
  const bmp = createBitmap(10, 10)
  drawRect(bmp, { x: 2, y: 2 }, { x: 7, y: 7 }, { stroke: BLACK })
  assert.equal(floodFill(bmp, { x: 4, y: 4 }, RED), true)
  assert.deepEqual(getPx(bmp, 3, 3), RED)
  assert.deepEqual(getPx(bmp, 6, 6), RED)
  assert.deepEqual(getPx(bmp, 2, 2), BLACK)
  assert.deepEqual(getPx(bmp, 0, 0), WHITE)
  assert.deepEqual(getPx(bmp, 9, 9), WHITE)
})

test('floodFill on the target color reports no change', () => {
  const bmp = createBitmap(4, 4)
  assert.equal(floodFill(bmp, { x: 1, y: 1 }, WHITE), false)
})

test('floodFill floods an open region edge to edge', () => {
  const bmp = createBitmap(5, 5)
  assert.equal(floodFill(bmp, { x: 2, y: 2 }, RED), true)
  assert.deepEqual(getPx(bmp, 0, 0), RED)
  assert.deepEqual(getPx(bmp, 4, 4), RED)
})

test('floodFill only replaces the exact color under the seed', () => {
  const bmp = createBitmap(6, 3)
  drawRect(bmp, { x: 3, y: 0 }, { x: 5, y: 2 }, { fill: BLACK })
  assert.equal(floodFill(bmp, { x: 1, y: 1 }, RED), true)
  assert.deepEqual(getPx(bmp, 0, 0), RED)
  assert.deepEqual(getPx(bmp, 4, 1), BLACK)
})

test('floodFill refuses a seed outside the bitmap', () => {
  const bmp = createBitmap(3, 3)
  assert.equal(floodFill(bmp, { x: 3, y: 0 }, RED), false)
  assert.equal(floodFill(bmp, { x: 0, y: -1 }, RED), false)
})

test('floodFill reaches around a concave wall', () => {
  const bmp = createBitmap(7, 7)
  drawRect(bmp, { x: 2, y: 0 }, { x: 2, y: 4 }, { fill: BLACK })
  assert.equal(floodFill(bmp, { x: 0, y: 0 }, RED), true)
  assert.deepEqual(getPx(bmp, 6, 0), RED)
  assert.deepEqual(getPx(bmp, 0, 6), RED)
  assert.deepEqual(getPx(bmp, 2, 2), BLACK)
})
