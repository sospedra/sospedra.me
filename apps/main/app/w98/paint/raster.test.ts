import assert from 'node:assert/strict'
import test from 'node:test'
import type { Rgba } from './palette.ts'
import {
  type Bitmap,
  brushStroke,
  createBitmap,
  drawCurve,
  drawEllipse,
  drawLine,
  drawPolygon,
  drawRect,
  drawRoundedRect,
  getPixel,
  setPixel,
  spray,
  stampBrush,
  stampDisc,
} from './raster.ts'
import { traceLine } from './spans.ts'

const BLACK: Rgba = [0, 0, 0, 255]
const RED: Rgba = [255, 0, 0, 255]

const isWhite = (bitmap: Bitmap, x: number, y: number): boolean => {
  const pixel = getPixel(bitmap, x, y)
  return (
    pixel !== null && pixel[0] === 255 && pixel[1] === 255 && pixel[2] === 255
  )
}

const inked = (bitmap: Bitmap): number => {
  let count = 0
  for (let y = 0; y < bitmap.height; y++) {
    for (let x = 0; x < bitmap.width; x++) {
      if (!isWhite(bitmap, x, y)) count++
    }
  }
  return count
}

const dump = (bitmap: Bitmap): string => {
  const rows: string[] = []
  for (let y = 0; y < bitmap.height; y++) {
    let row = ''
    for (let x = 0; x < bitmap.width; x++) {
      row += isWhite(bitmap, x, y) ? '.' : '#'
    }
    rows.push(row)
  }
  return rows.join('\n')
}

const seededRng = (seed: number): (() => number) => {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

test('createBitmap starts fully white', () => {
  const bitmap = createBitmap(4, 3)
  assert.equal(bitmap.data.length, 48)
  assert.equal(inked(bitmap), 0)
})

test('setPixel ignores out-of-bounds writes', () => {
  const bitmap = createBitmap(4, 4)
  setPixel(bitmap, -1, 0, BLACK)
  setPixel(bitmap, 4, 0, BLACK)
  setPixel(bitmap, 0, 4, BLACK)
  assert.equal(inked(bitmap), 0)
  setPixel(bitmap, 3, 3, BLACK)
  assert.deepEqual(getPixel(bitmap, 3, 3), BLACK)
})

test('getPixel returns null outside the bitmap', () => {
  const bitmap = createBitmap(2, 2)
  assert.equal(getPixel(bitmap, 2, 0), null)
  assert.equal(getPixel(bitmap, 0, -1), null)
})

test('traceLine walks a horizontal run and includes both endpoints', () => {
  const seen: string[] = []
  traceLine({ x: 1, y: 2 }, { x: 4, y: 2 }, (x, y) => seen.push(`${x},${y}`))
  assert.deepEqual(seen, ['1,2', '2,2', '3,2', '4,2'])
})

test('traceLine walks a perfect diagonal as a staircase of one step', () => {
  const seen: string[] = []
  traceLine({ x: 3, y: 3 }, { x: 0, y: 0 }, (x, y) => seen.push(`${x},${y}`))
  assert.deepEqual(seen, ['3,3', '2,2', '1,1', '0,0'])
})

test('drawLine at size one inks exactly the bresenham path', () => {
  const bitmap = createBitmap(6, 6)
  drawLine(bitmap, { x: 0, y: 0 }, { x: 5, y: 5 }, { color: BLACK, size: 1 })
  assert.equal(inked(bitmap), 6)
  assert.deepEqual(getPixel(bitmap, 2, 2), BLACK)
})

test('drawLine at size three paints a thicker band', () => {
  const thin = createBitmap(12, 12)
  const thick = createBitmap(12, 12)
  drawLine(thin, { x: 1, y: 6 }, { x: 10, y: 6 }, { color: BLACK, size: 1 })
  drawLine(thick, { x: 1, y: 6 }, { x: 10, y: 6 }, { color: BLACK, size: 3 })
  assert.ok(inked(thick) > inked(thin) * 2)
  assert.deepEqual(getPixel(thick, 5, 5), BLACK)
  assert.deepEqual(getPixel(thick, 5, 7), BLACK)
})

test('drawRect outline matches the classic hollow box', () => {
  const bitmap = createBitmap(9, 7)
  drawRect(bitmap, { x: 1, y: 1 }, { x: 7, y: 5 }, { stroke: BLACK })
  assert.equal(
    dump(bitmap),
    [
      '.........',
      '.#######.',
      '.#.....#.',
      '.#.....#.',
      '.#.....#.',
      '.#######.',
      '.........',
    ].join('\n'),
  )
})

test('drawRect with stroke and fill keeps the border on top', () => {
  const bitmap = createBitmap(8, 8)
  drawRect(bitmap, { x: 1, y: 1 }, { x: 6, y: 6 }, { stroke: BLACK, fill: RED })
  assert.deepEqual(getPixel(bitmap, 1, 1), BLACK)
  assert.deepEqual(getPixel(bitmap, 3, 3), RED)
  assert.deepEqual(getPixel(bitmap, 6, 3), BLACK)
  assert.ok(isWhite(bitmap, 0, 0))
})

test('drawRect normalizes swapped corners', () => {
  const forward = createBitmap(9, 7)
  const backward = createBitmap(9, 7)
  drawRect(forward, { x: 1, y: 1 }, { x: 7, y: 5 }, { stroke: BLACK })
  drawRect(backward, { x: 7, y: 5 }, { x: 1, y: 1 }, { stroke: BLACK })
  assert.equal(dump(forward), dump(backward))
})

test('drawEllipse outline touches all four box midpoints and skips corners', () => {
  const bitmap = createBitmap(9, 7)
  drawEllipse(bitmap, { x: 0, y: 0 }, { x: 8, y: 6 }, { stroke: BLACK })
  assert.deepEqual(getPixel(bitmap, 4, 0), BLACK)
  assert.deepEqual(getPixel(bitmap, 4, 6), BLACK)
  assert.deepEqual(getPixel(bitmap, 0, 3), BLACK)
  assert.deepEqual(getPixel(bitmap, 8, 3), BLACK)
  assert.ok(isWhite(bitmap, 0, 0))
  assert.ok(isWhite(bitmap, 8, 6))
  assert.ok(isWhite(bitmap, 4, 3))
})

test('drawEllipse fill covers the center and respects the outline color', () => {
  const bitmap = createBitmap(9, 7)
  drawEllipse(
    bitmap,
    { x: 0, y: 0 },
    { x: 8, y: 6 },
    { stroke: BLACK, fill: RED },
  )
  assert.deepEqual(getPixel(bitmap, 4, 3), RED)
  assert.deepEqual(getPixel(bitmap, 4, 0), BLACK)
  assert.ok(isWhite(bitmap, 0, 0))
})

test('drawEllipse is symmetric across the vertical axis', () => {
  const bitmap = createBitmap(10, 8)
  drawEllipse(bitmap, { x: 0, y: 0 }, { x: 9, y: 7 }, { stroke: BLACK })
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 10; x++) {
      assert.equal(
        isWhite(bitmap, x, y),
        isWhite(bitmap, 9 - x, y),
        `${x},${y}`,
      )
    }
  }
})

test('drawEllipse degenerates to a line on a flat box', () => {
  const bitmap = createBitmap(8, 4)
  drawEllipse(bitmap, { x: 1, y: 2 }, { x: 6, y: 2 }, { stroke: BLACK })
  assert.equal(inked(bitmap), 6)
  assert.deepEqual(getPixel(bitmap, 3, 2), BLACK)
})

test('drawRoundedRect clips the corners and keeps the edges', () => {
  const bitmap = createBitmap(14, 12)
  drawRoundedRect(bitmap, { x: 0, y: 0 }, { x: 13, y: 11 }, { stroke: BLACK })
  assert.ok(isWhite(bitmap, 0, 0))
  assert.ok(isWhite(bitmap, 13, 11))
  assert.deepEqual(getPixel(bitmap, 7, 0), BLACK)
  assert.deepEqual(getPixel(bitmap, 7, 11), BLACK)
  assert.deepEqual(getPixel(bitmap, 0, 6), BLACK)
  assert.deepEqual(getPixel(bitmap, 13, 6), BLACK)
  assert.ok(isWhite(bitmap, 7, 6))
})

test('drawRoundedRect fills the interior when asked', () => {
  const bitmap = createBitmap(14, 12)
  drawRoundedRect(
    bitmap,
    { x: 0, y: 0 },
    { x: 13, y: 11 },
    { stroke: BLACK, fill: RED },
  )
  assert.deepEqual(getPixel(bitmap, 7, 6), RED)
  assert.ok(isWhite(bitmap, 0, 0))
})

test('drawPolygon fills a concave L shape with even-odd spans', () => {
  const bitmap = createBitmap(8, 8)
  const points = [
    { x: 0, y: 0 },
    { x: 6, y: 0 },
    { x: 6, y: 2 },
    { x: 2, y: 2 },
    { x: 2, y: 6 },
    { x: 0, y: 6 },
  ]
  drawPolygon(bitmap, points, { fill: RED })
  assert.deepEqual(getPixel(bitmap, 1, 1), RED)
  assert.deepEqual(getPixel(bitmap, 5, 1), RED)
  assert.deepEqual(getPixel(bitmap, 1, 5), RED)
  assert.ok(isWhite(bitmap, 4, 4))
  assert.ok(isWhite(bitmap, 7, 7))
})

test('drawPolygon strokes every edge including the closing one', () => {
  const bitmap = createBitmap(9, 9)
  const points = [
    { x: 1, y: 1 },
    { x: 7, y: 1 },
    { x: 4, y: 7 },
  ]
  drawPolygon(bitmap, points, { stroke: BLACK })
  assert.deepEqual(getPixel(bitmap, 4, 1), BLACK)
  assert.deepEqual(getPixel(bitmap, 2, 3), BLACK)
  assert.deepEqual(getPixel(bitmap, 6, 3), BLACK)
  assert.ok(isWhite(bitmap, 4, 4))
})

test('drawPolygon with fewer than two points is a no-op', () => {
  const bitmap = createBitmap(4, 4)
  drawPolygon(bitmap, [{ x: 1, y: 1 }], { stroke: BLACK, fill: RED })
  assert.equal(inked(bitmap), 0)
})

test('drawCurve hits both endpoints and stays inside the control hull box', () => {
  const bitmap = createBitmap(12, 12)
  drawCurve(bitmap, {
    from: { x: 0, y: 0 },
    to: { x: 11, y: 0 },
    c1: { x: 0, y: 10 },
    c2: { x: 11, y: 10 },
    color: BLACK,
    size: 1,
  })
  assert.deepEqual(getPixel(bitmap, 0, 0), BLACK)
  assert.deepEqual(getPixel(bitmap, 11, 0), BLACK)
  const sagged = [...Array(12).keys()].some((x) => !isWhite(bitmap, x, 6))
  assert.ok(sagged)
})

test('stampDisc size four drops the box corners', () => {
  const bitmap = createBitmap(9, 9)
  stampDisc(bitmap, { x: 4, y: 4 }, 4, BLACK)
  assert.equal(inked(bitmap), 12)
  assert.ok(isWhite(bitmap, 2, 2))
  assert.deepEqual(getPixel(bitmap, 3, 2), BLACK)
})

test('stampBrush square covers the full box', () => {
  const bitmap = createBitmap(8, 8)
  stampBrush(bitmap, { x: 4, y: 4 }, { shape: 'square', size: 2, color: BLACK })
  assert.equal(inked(bitmap), 4)
  assert.deepEqual(getPixel(bitmap, 3, 3), BLACK)
  assert.deepEqual(getPixel(bitmap, 4, 4), BLACK)
})

test('stampBrush diagonal rises to the right', () => {
  const bitmap = createBitmap(9, 9)
  stampBrush(
    bitmap,
    { x: 4, y: 4 },
    { shape: 'diagonal', size: 3, color: BLACK },
  )
  assert.deepEqual(getPixel(bitmap, 3, 5), BLACK)
  assert.deepEqual(getPixel(bitmap, 4, 4), BLACK)
  assert.deepEqual(getPixel(bitmap, 5, 3), BLACK)
  assert.equal(inked(bitmap), 3)
})

test('stampBrush reverse diagonal falls to the right', () => {
  const bitmap = createBitmap(9, 9)
  stampBrush(
    bitmap,
    { x: 4, y: 4 },
    { shape: 'reverseDiagonal', size: 3, color: BLACK },
  )
  assert.deepEqual(getPixel(bitmap, 3, 3), BLACK)
  assert.deepEqual(getPixel(bitmap, 4, 4), BLACK)
  assert.deepEqual(getPixel(bitmap, 5, 5), BLACK)
  assert.equal(inked(bitmap), 3)
})

test('brushStroke stamps the tip along the whole path', () => {
  const bitmap = createBitmap(10, 6)
  brushStroke(
    bitmap,
    { x: 2, y: 3 },
    { x: 7, y: 3 },
    { shape: 'square', size: 2, color: BLACK },
  )
  assert.equal(inked(bitmap), 14)
  assert.deepEqual(getPixel(bitmap, 1, 2), BLACK)
  assert.deepEqual(getPixel(bitmap, 7, 3), BLACK)
})

test('spray is deterministic under a seeded rng and stays inside its radius', () => {
  const a = createBitmap(30, 30)
  const b = createBitmap(30, 30)
  spray(a, { x: 15, y: 15 }, { size: 16, color: BLACK, rng: seededRng(7) })
  spray(b, { x: 15, y: 15 }, { size: 16, color: BLACK, rng: seededRng(7) })
  assert.equal(dump(a), dump(b))
  assert.ok(inked(a) > 0)
  for (let y = 0; y < 30; y++) {
    for (let x = 0; x < 30; x++) {
      if (isWhite(a, x, y)) continue
      assert.ok(Math.hypot(x - 15, y - 15) <= 8.5, `${x},${y}`)
    }
  }
})
