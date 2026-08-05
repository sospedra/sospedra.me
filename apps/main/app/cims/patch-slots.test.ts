import assert from 'node:assert/strict'
import test from 'node:test'
import type { GridSpec, MaskedGrid } from './decode.ts'
import {
  contourSegmentCapacity,
  FADE_CELLS,
  fadePatchEdges,
  fillPatchContours,
  fillPatchMesh,
  fillPatchPoints,
  patchLineSegmentCount,
  patchVertexCount,
} from './patch-slots.ts'
import type { Mountain } from './terrain-schema.ts'

const HMAX = 3334.3

const specOf = (n: number): GridSpec => ({
  nx: n,
  nz: n,
  ox: 0,
  oz: 0,
  cellX: 10,
  cellZ: 10,
})

const gridOf = (n: number, height: number): MaskedGrid => ({
  h: new Float32Array(n * n).fill(height),
  mask: new Uint8Array(n * n).fill(1),
})

test('patch capacities match the prototype formulas', () => {
  assert.equal(patchVertexCount(256), 255 * 255 * 6)
  assert.equal(patchLineSegmentCount(256), 2 * 86 * 85)
})

test('contourSegmentCapacity skips levels the base already draws', () => {
  const mountains = [
    {
      contours: [
        { lv: 100, mj: 0, p: [[0, 0, 1, 1, 2, 2]] },
        { lv: 200, mj: 1, p: [[0, 0, 1, 1, 2, 2, 3, 3]] },
      ],
    },
    { contours: [{ lv: 150, mj: 0, p: [[0, 0, 1, 1]] }] },
  ] as unknown as Mountain[]
  assert.equal(contourSegmentCapacity(mountains), 2)
})

test('fadePatchEdges pins the border row onto the base height', () => {
  const n = FADE_CELLS * 2 + 2
  const grid = gridOf(n, 1000)
  fadePatchEdges(grid, specOf(n), () => 200)
  assert.equal(grid.h[0], 200)
  const center = (n / 2) * n + n / 2
  assert.equal(grid.h[center], 1000)
  const ringTwo = 2 * n + 2
  assert.ok(grid.h[ringTwo] > 200)
  assert.ok(grid.h[ringTwo] < 1000)
})

test('fillPatchMesh writes triangle soup and zeroes masked quads', () => {
  const n = 3
  const grid = gridOf(n, 700)
  grid.mask[8] = 0
  const verts = patchVertexCount(n) * 3
  const out = {
    pos: new Float32Array(verts),
    col: new Float32Array(verts),
    nrm: new Float32Array(verts),
  }
  const vN = new Float32Array(n * n * 3)
  const vC = new Float32Array(n * n * 3).fill(0.5)
  for (let q = 0; q < n * n; q++) vN[q * 3 + 1] = 1
  fillPatchMesh(out, grid, specOf(n), vN, vC)
  assert.equal(out.pos[0], -10)
  assert.equal(out.pos[1], 700)
  assert.equal(out.col[0], 0.5)
  const lastQuad = 3 * 18
  assert.equal(out.pos[lastQuad], 0)
  assert.equal(out.nrm[lastQuad + 1], 1)
})

test('fillPatchContours fades near the rim and zero-fills the tail', () => {
  const spec = specOf(101)
  const contours = [
    { lv: 150, mj: 0 as const, p: [[0, 0, 10, 0]] },
    { lv: 200, mj: 1 as const, p: [[0, 0, 10, 0, 20, 0]] },
  ]
  const out = { pos: new Float32Array(30), col: new Float32Array(30) }
  fillPatchContours(out, contours, spec, HMAX)
  assert.equal(out.pos[1], 156)
  assert.ok(out.col[0] > 0)
  assert.equal(out.pos[7], 0)
  assert.equal(out.col[6], 0)
})

test('fillPatchPoints hides masked vertices', () => {
  const n = 3
  const grid = gridOf(n, 700)
  grid.mask[0] = 0
  const out = {
    pos: new Float32Array(n * n * 3),
    col: new Float32Array(n * n * 3),
  }
  fillPatchPoints(out, grid, specOf(n), new Float32Array(n * n * 3), HMAX)
  assert.equal(out.pos[0], 0)
  assert.equal(out.col[0], 0)
  assert.equal(out.pos[4], 702.5)
})
