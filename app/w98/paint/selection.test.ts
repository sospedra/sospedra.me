import assert from 'node:assert/strict'
import test from 'node:test'
import type { Rgba } from './palette.ts'
import { createBitmap, getPixel, setPixel } from './raster.ts'
import {
  clipRect,
  fillRect,
  handleAt,
  insideRect,
  lift,
  scaleNearest,
  stamp,
} from './selection.ts'

const BLACK: Rgba = [0, 0, 0, 255]
const RED: Rgba = [255, 0, 0, 255]
const WHITE: Rgba = [255, 255, 255, 255]

test('clipRect intersects with the bitmap and rejects empty leftovers', () => {
  assert.deepEqual(clipRect({ x: -5, y: -5, width: 10, height: 10 }, 20, 20), {
    x: 0,
    y: 0,
    width: 5,
    height: 5,
  })
  assert.deepEqual(clipRect({ x: 2, y: 2, width: 4, height: 4 }, 20, 20), {
    x: 2,
    y: 2,
    width: 4,
    height: 4,
  })
  assert.equal(clipRect({ x: 25, y: 0, width: 4, height: 4 }, 20, 20), null)
  assert.equal(clipRect({ x: -10, y: 0, width: 5, height: 5 }, 20, 20), null)
})

test('insideRect is inclusive of the top-left and exclusive past the extent', () => {
  const rect = { x: 2, y: 3, width: 4, height: 2 }
  assert.equal(insideRect(rect, { x: 2, y: 3 }), true)
  assert.equal(insideRect(rect, { x: 5, y: 4 }), true)
  assert.equal(insideRect(rect, { x: 6, y: 4 }), false)
  assert.equal(insideRect(rect, { x: 2, y: 5 }), false)
})

test('handleAt finds corners before edges and misses the interior', () => {
  const rect = { x: 10, y: 10, width: 11, height: 11 }
  assert.equal(handleAt(rect, { x: 10, y: 10 }, 2), 'nw')
  assert.equal(handleAt(rect, { x: 20, y: 20 }, 2), 'se')
  assert.equal(handleAt(rect, { x: 15, y: 10 }, 2), 'n')
  assert.equal(handleAt(rect, { x: 10, y: 15 }, 2), 'w')
  assert.equal(handleAt(rect, { x: 15, y: 15 }, 2), null)
})

test('lift copies the exact region', () => {
  const bitmap = createBitmap(8, 8)
  setPixel(bitmap, 3, 3, BLACK)
  setPixel(bitmap, 4, 4, RED)
  const float = lift(bitmap, { x: 3, y: 3, width: 2, height: 2 })
  assert.equal(float.width, 2)
  assert.equal(float.height, 2)
  assert.deepEqual(getPixel(float, 0, 0), BLACK)
  assert.deepEqual(getPixel(float, 1, 1), RED)
  assert.deepEqual(getPixel(float, 1, 0), WHITE)
})

test('lift then stamp at the same spot restores the bitmap', () => {
  const bitmap = createBitmap(6, 6)
  setPixel(bitmap, 2, 2, BLACK)
  const before = bitmap.data.slice()
  const float = lift(bitmap, { x: 1, y: 1, width: 3, height: 3 })
  stamp(bitmap, float, { x: 1, y: 1 })
  assert.deepEqual(bitmap.data, before)
})

test('stamp clips at every bitmap edge', () => {
  const bitmap = createBitmap(4, 4)
  const float = lift(bitmap, { x: 0, y: 0, width: 3, height: 3 })
  fillRect(float, { x: 0, y: 0, width: 3, height: 3 }, BLACK)
  stamp(bitmap, float, { x: -1, y: -1 })
  stamp(bitmap, float, { x: 3, y: 3 })
  assert.deepEqual(getPixel(bitmap, 0, 0), BLACK)
  assert.deepEqual(getPixel(bitmap, 3, 3), BLACK)
  assert.deepEqual(getPixel(bitmap, 2, 0), WHITE)
})

test('stamp with a skip color leaves those pixels untouched', () => {
  const canvas = createBitmap(4, 4)
  fillRect(canvas, { x: 0, y: 0, width: 4, height: 4 }, RED)
  const float = createBitmap(2, 2)
  setPixel(float, 0, 0, BLACK)
  stamp(canvas, float, { x: 1, y: 1 }, { skip: WHITE })
  assert.deepEqual(getPixel(canvas, 1, 1), BLACK)
  assert.deepEqual(getPixel(canvas, 2, 1), RED)
  assert.deepEqual(getPixel(canvas, 2, 2), RED)
})

test('fillRect paints only the clipped region', () => {
  const bitmap = createBitmap(5, 5)
  fillRect(bitmap, { x: 3, y: 3, width: 10, height: 10 }, BLACK)
  assert.deepEqual(getPixel(bitmap, 3, 3), BLACK)
  assert.deepEqual(getPixel(bitmap, 4, 4), BLACK)
  assert.deepEqual(getPixel(bitmap, 2, 2), WHITE)
})

test('scaleNearest doubles pixels without blending', () => {
  const source = createBitmap(2, 1)
  setPixel(source, 0, 0, BLACK)
  setPixel(source, 1, 0, RED)
  const scaled = scaleNearest(source, 4, 2)
  assert.deepEqual(getPixel(scaled, 0, 0), BLACK)
  assert.deepEqual(getPixel(scaled, 1, 1), BLACK)
  assert.deepEqual(getPixel(scaled, 2, 0), RED)
  assert.deepEqual(getPixel(scaled, 3, 1), RED)
})

test('scaleNearest shrinks by sampling', () => {
  const source = createBitmap(4, 4)
  fillRect(source, { x: 0, y: 0, width: 2, height: 4 }, BLACK)
  const scaled = scaleNearest(source, 2, 2)
  assert.deepEqual(getPixel(scaled, 0, 0), BLACK)
  assert.deepEqual(getPixel(scaled, 1, 0), WHITE)
})
