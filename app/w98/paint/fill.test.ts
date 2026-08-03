import assert from 'node:assert/strict'
import test from 'node:test'
import { floodFill } from './fill.ts'
import type { Rgba } from './palette.ts'
import { createBitmap, drawRect, getPixel } from './raster.ts'

const BLACK: Rgba = [0, 0, 0, 255]
const RED: Rgba = [255, 0, 0, 255]
const WHITE: Rgba = [255, 255, 255, 255]

test('floodFill stops at a drawn border', () => {
  const bitmap = createBitmap(10, 10)
  drawRect(bitmap, { x: 2, y: 2 }, { x: 7, y: 7 }, { stroke: BLACK })
  assert.equal(floodFill(bitmap, { x: 4, y: 4 }, RED), true)
  assert.deepEqual(getPixel(bitmap, 3, 3), RED)
  assert.deepEqual(getPixel(bitmap, 6, 6), RED)
  assert.deepEqual(getPixel(bitmap, 2, 2), BLACK)
  assert.deepEqual(getPixel(bitmap, 0, 0), WHITE)
  assert.deepEqual(getPixel(bitmap, 9, 9), WHITE)
})

test('floodFill on the target color reports no change', () => {
  const bitmap = createBitmap(4, 4)
  assert.equal(floodFill(bitmap, { x: 1, y: 1 }, WHITE), false)
})

test('floodFill floods an open region edge to edge', () => {
  const bitmap = createBitmap(5, 5)
  assert.equal(floodFill(bitmap, { x: 2, y: 2 }, RED), true)
  assert.deepEqual(getPixel(bitmap, 0, 0), RED)
  assert.deepEqual(getPixel(bitmap, 4, 4), RED)
})

test('floodFill only replaces the exact color under the seed', () => {
  const bitmap = createBitmap(6, 3)
  drawRect(bitmap, { x: 3, y: 0 }, { x: 5, y: 2 }, { fill: BLACK })
  assert.equal(floodFill(bitmap, { x: 1, y: 1 }, RED), true)
  assert.deepEqual(getPixel(bitmap, 0, 0), RED)
  assert.deepEqual(getPixel(bitmap, 4, 1), BLACK)
})

test('floodFill refuses a seed outside the bitmap', () => {
  const bitmap = createBitmap(3, 3)
  assert.equal(floodFill(bitmap, { x: 3, y: 0 }, RED), false)
  assert.equal(floodFill(bitmap, { x: 0, y: -1 }, RED), false)
})

test('floodFill reaches around a concave wall', () => {
  const bitmap = createBitmap(7, 7)
  drawRect(bitmap, { x: 2, y: 0 }, { x: 2, y: 4 }, { fill: BLACK })
  assert.equal(floodFill(bitmap, { x: 0, y: 0 }, RED), true)
  assert.deepEqual(getPixel(bitmap, 6, 0), RED)
  assert.deepEqual(getPixel(bitmap, 0, 6), RED)
  assert.deepEqual(getPixel(bitmap, 2, 2), BLACK)
})
