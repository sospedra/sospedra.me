import assert from 'node:assert/strict'
import test from 'node:test'
import { discMask, slashMask, squareMask } from './brush-tips.ts'

test('discMask of an even size is symmetric around its half-pixel center', () => {
  const mask = discMask(4)
  assert.equal(mask.length, 12)
  const has = (x: number, y: number) =>
    mask.some((point) => point.x === x && point.y === y)
  for (const point of mask) {
    assert.ok(has(-1 - point.x, point.y), `mirror of ${point.x},${point.y}`)
    assert.ok(has(point.x, -1 - point.y), `mirror of ${point.x},${point.y}`)
  }
})

test('discMask degenerates to the anchor pixel at size one', () => {
  assert.deepEqual(discMask(1), [{ x: 0, y: 0 }])
})

test('squareMask covers the full box around the anchor', () => {
  assert.deepEqual(squareMask(2), [
    { x: -1, y: -1 },
    { x: 0, y: -1 },
    { x: -1, y: 0 },
    { x: 0, y: 0 },
  ])
})

test('slashMask rises or falls with the shape', () => {
  assert.deepEqual(slashMask('diagonal', 3), [
    { x: -1, y: 1 },
    { x: 0, y: 0 },
    { x: 1, y: -1 },
  ])
  assert.deepEqual(slashMask('reverseDiagonal', 3), [
    { x: -1, y: -1 },
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ])
})

test('masks memoize per shape and size', () => {
  assert.equal(discMask(7), discMask(7))
  assert.equal(squareMask(8), squareMask(8))
  assert.equal(slashMask('diagonal', 5), slashMask('diagonal', 5))
  assert.notEqual(slashMask('diagonal', 5), slashMask('reverseDiagonal', 5))
})
