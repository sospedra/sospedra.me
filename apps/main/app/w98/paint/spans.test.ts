import assert from 'node:assert/strict'
import test from 'node:test'
import { curvePoints, ellipseSpans, linePoints, polygonSpans } from './spans.ts'

test('linePoints includes both endpoints of a horizontal run', () => {
  assert.deepEqual(linePoints({ x: 1, y: 2 }, { x: 4, y: 2 }), [
    { x: 1, y: 2 },
    { x: 2, y: 2 },
    { x: 3, y: 2 },
    { x: 4, y: 2 },
  ])
})

test('linePoints walks a perfect diagonal one step at a time', () => {
  assert.deepEqual(linePoints({ x: 3, y: 3 }, { x: 0, y: 0 }), [
    { x: 3, y: 3 },
    { x: 2, y: 2 },
    { x: 1, y: 1 },
    { x: 0, y: 0 },
  ])
})

test('linePoints advances every row of a steep line exactly once', () => {
  const points = linePoints({ x: 0, y: 0 }, { x: 2, y: 6 })
  assert.equal(points.length, 7)
  assert.deepEqual(points[0], { x: 0, y: 0 })
  assert.deepEqual(points.at(-1), { x: 2, y: 6 })
  for (let i = 1; i < points.length; i++) {
    assert.equal(points[i].y - points[i - 1].y, 1)
  }
})

test('ellipseSpans fills symmetrically across both axes', () => {
  const shape = ellipseSpans({ x0: 0, y0: 0, x1: 8, y1: 6 })
  assert.equal(shape.fill.length, 7)
  for (const span of shape.fill) {
    assert.equal(span.x0 + span.x1, 8, `row ${span.y}`)
    const mirrored = shape.fill.find((other) => other.y === 6 - span.y)
    assert.ok(mirrored)
    assert.equal(mirrored.x0, span.x0, `rows ${span.y} and ${6 - span.y}`)
  }
  assert.deepEqual(shape.fill[3], { y: 3, x0: 0, x1: 8 })
})

test('polygonSpans pairs even crossings into disjoint runs', () => {
  const points = [
    { x: 0, y: 0 },
    { x: 6, y: 0 },
    { x: 6, y: 4 },
    { x: 4, y: 4 },
    { x: 4, y: 2 },
    { x: 2, y: 2 },
    { x: 2, y: 4 },
    { x: 0, y: 4 },
  ]
  assert.deepEqual(polygonSpans(points), [
    { y: 0, x0: 0, x1: 6 },
    { y: 1, x0: 0, x1: 6 },
    { y: 2, x0: 0, x1: 2 },
    { y: 2, x0: 4, x1: 6 },
    { y: 3, x0: 0, x1: 2 },
    { y: 3, x0: 4, x1: 6 },
  ])
})

test('curvePoints starts at from and ends at to', () => {
  const points = curvePoints({
    from: { x: 0, y: 0 },
    to: { x: 11, y: 0 },
    c1: { x: 0, y: 10 },
    c2: { x: 11, y: 10 },
  })
  assert.deepEqual(points[0], { x: 0, y: 0 })
  assert.deepEqual(points.at(-1), { x: 11, y: 0 })
  assert.ok(points.length >= 9)
})
