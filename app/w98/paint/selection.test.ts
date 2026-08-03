import assert from 'node:assert/strict'
import test from 'node:test'
import type { Rgba } from './palette.ts'
import { createBitmap, getPx, setPx } from './raster.ts'
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
  assert.deepEqual(clipRect({ x: -5, y: -5, w: 10, h: 10 }, 20, 20), {
    x: 0,
    y: 0,
    w: 5,
    h: 5,
  })
  assert.deepEqual(clipRect({ x: 2, y: 2, w: 4, h: 4 }, 20, 20), {
    x: 2,
    y: 2,
    w: 4,
    h: 4,
  })
  assert.equal(clipRect({ x: 25, y: 0, w: 4, h: 4 }, 20, 20), null)
  assert.equal(clipRect({ x: -10, y: 0, w: 5, h: 5 }, 20, 20), null)
})

test('insideRect is inclusive of the top-left and exclusive past the extent', () => {
  const rect = { x: 2, y: 3, w: 4, h: 2 }
  assert.equal(insideRect(rect, { x: 2, y: 3 }), true)
  assert.equal(insideRect(rect, { x: 5, y: 4 }), true)
  assert.equal(insideRect(rect, { x: 6, y: 4 }), false)
  assert.equal(insideRect(rect, { x: 2, y: 5 }), false)
})

test('handleAt finds corners before edges and misses the interior', () => {
  const rect = { x: 10, y: 10, w: 11, h: 11 }
  assert.equal(handleAt(rect, { x: 10, y: 10 }, 2), 'nw')
  assert.equal(handleAt(rect, { x: 20, y: 20 }, 2), 'se')
  assert.equal(handleAt(rect, { x: 15, y: 10 }, 2), 'n')
  assert.equal(handleAt(rect, { x: 10, y: 15 }, 2), 'w')
  assert.equal(handleAt(rect, { x: 15, y: 15 }, 2), null)
})

test('lift copies the exact region', () => {
  const bmp = createBitmap(8, 8)
  setPx(bmp, 3, 3, BLACK)
  setPx(bmp, 4, 4, RED)
  const float = lift(bmp, { x: 3, y: 3, w: 2, h: 2 })
  assert.equal(float.w, 2)
  assert.equal(float.h, 2)
  assert.deepEqual(getPx(float, 0, 0), BLACK)
  assert.deepEqual(getPx(float, 1, 1), RED)
  assert.deepEqual(getPx(float, 1, 0), WHITE)
})

test('lift then stamp at the same spot restores the bitmap', () => {
  const bmp = createBitmap(6, 6)
  setPx(bmp, 2, 2, BLACK)
  const before = bmp.data.slice()
  const float = lift(bmp, { x: 1, y: 1, w: 3, h: 3 })
  stamp(bmp, float, { x: 1, y: 1 })
  assert.deepEqual(bmp.data, before)
})

test('stamp clips at every bitmap edge', () => {
  const bmp = createBitmap(4, 4)
  const float = lift(bmp, { x: 0, y: 0, w: 3, h: 3 })
  fillRect(float, { x: 0, y: 0, w: 3, h: 3 }, BLACK)
  stamp(bmp, float, { x: -1, y: -1 })
  stamp(bmp, float, { x: 3, y: 3 })
  assert.deepEqual(getPx(bmp, 0, 0), BLACK)
  assert.deepEqual(getPx(bmp, 3, 3), BLACK)
  assert.deepEqual(getPx(bmp, 2, 0), WHITE)
})

test('stamp with a skip color leaves those pixels untouched', () => {
  const canvas = createBitmap(4, 4)
  fillRect(canvas, { x: 0, y: 0, w: 4, h: 4 }, RED)
  const float = createBitmap(2, 2)
  setPx(float, 0, 0, BLACK)
  stamp(canvas, float, { x: 1, y: 1 }, { skip: WHITE })
  assert.deepEqual(getPx(canvas, 1, 1), BLACK)
  assert.deepEqual(getPx(canvas, 2, 1), RED)
  assert.deepEqual(getPx(canvas, 2, 2), RED)
})

test('fillRect paints only the clipped region', () => {
  const bmp = createBitmap(5, 5)
  fillRect(bmp, { x: 3, y: 3, w: 10, h: 10 }, BLACK)
  assert.deepEqual(getPx(bmp, 3, 3), BLACK)
  assert.deepEqual(getPx(bmp, 4, 4), BLACK)
  assert.deepEqual(getPx(bmp, 2, 2), WHITE)
})

test('scaleNearest doubles pixels without blending', () => {
  const src = createBitmap(2, 1)
  setPx(src, 0, 0, BLACK)
  setPx(src, 1, 0, RED)
  const scaled = scaleNearest(src, 4, 2)
  assert.deepEqual(getPx(scaled, 0, 0), BLACK)
  assert.deepEqual(getPx(scaled, 1, 1), BLACK)
  assert.deepEqual(getPx(scaled, 2, 0), RED)
  assert.deepEqual(getPx(scaled, 3, 1), RED)
})

test('scaleNearest shrinks by sampling', () => {
  const src = createBitmap(4, 4)
  fillRect(src, { x: 0, y: 0, w: 2, h: 4 }, BLACK)
  const scaled = scaleNearest(src, 2, 2)
  assert.deepEqual(getPx(scaled, 0, 0), BLACK)
  assert.deepEqual(getPx(scaled, 1, 0), WHITE)
})
