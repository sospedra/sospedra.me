import assert from 'node:assert/strict'
import test from 'node:test'
import type { GridSpec, MaskedGrid } from './decode.ts'
import { rampColor } from './ramps.ts'
import {
  buildBaseField,
  buildBorderSegments,
  buildContourSegments,
  buildGridLineSegments,
  buildMaskedQuadIndex,
  buildRiverSegments,
  computeGridNormals,
} from './terrain-build.ts'

const HMAX = 3334.3

const specOf = (nx: number, nz: number): GridSpec => ({
  nx,
  nz,
  ox: 0,
  oz: 0,
  cellX: 10,
  cellZ: 10,
})

const gridOf = (heights: number[], maskOn = true): MaskedGrid => ({
  h: new Float32Array(heights),
  mask: new Uint8Array(heights.length).fill(maskOn ? 1 : 0),
})

test('computeGridNormals points up on flat terrain', () => {
  const spec = specOf(3, 3)
  const out = new Float32Array(27)
  computeGridNormals(new Float32Array(9).fill(50), spec, out)
  for (let q = 0; q < 9; q++) {
    assert.equal(Math.abs(out[q * 3]), 0)
    assert.equal(out[q * 3 + 1], 1)
    assert.equal(Math.abs(out[q * 3 + 2]), 0)
  }
})

test('computeGridNormals tilts against an eastward slope', () => {
  const spec = specOf(3, 3)
  const h = new Float32Array([0, 10, 20, 0, 10, 20, 0, 10, 20])
  const out = new Float32Array(27)
  computeGridNormals(h, spec, out)
  const inv = 1 / Math.sqrt(2)
  assert.ok(Math.abs(out[3] - -inv) < 1e-6)
  assert.ok(Math.abs(out[4] - inv) < 1e-6)
  assert.equal(Math.abs(out[5]), 0)
})

test('buildBaseField sinks the mesh and paints the ramp', () => {
  const spec = specOf(3, 3)
  const grid = gridOf(Array(9).fill(1000))
  const field = buildBaseField(spec, grid, HMAX)
  assert.equal(field.pos.length, 27)
  assert.equal(field.pos[1], 1000 - 6)
  assert.equal(field.pos[0], -10)
  const expected = rampColor(1000, HMAX)
  assert.ok(Math.abs(field.col[0] - expected[0]) < 1e-6)
  assert.ok(Math.abs(field.col[1] - expected[1]) < 1e-6)
  assert.ok(Math.abs(field.col[2] - expected[2]) < 1e-6)
})

test('buildMaskedQuadIndex skips quads touching masked cells', () => {
  const full = buildMaskedQuadIndex(new Uint8Array(9).fill(1), 3, 3)
  assert.equal(full.length, 24)
  assert.deepEqual([...full.slice(0, 6)], [0, 3, 1, 1, 3, 4])
  const holed = new Uint8Array(9).fill(1)
  holed[4] = 0
  assert.equal(buildMaskedQuadIndex(holed, 3, 3).length, 0)
})

test('buildGridLineSegments strides the lattice', () => {
  const spec = specOf(11, 11)
  const grid = gridOf(Array(121).fill(500))
  const lines = buildGridLineSegments(spec, grid, new Float32Array(363), HMAX)
  assert.equal(lines.pos.length, 12 * 2 * 3)
  assert.equal(lines.pos[1], 500 - 10)
})

test('buildContourSegments expands polylines into segment pairs', () => {
  const levels = [{ lv: 100, mj: 1 as const, p: [[0, 0, 10, 0, 20, 0]] }]
  const segments = buildContourSegments(levels, HMAX)
  assert.equal(segments.pos.length, 12)
  assert.equal(segments.pos[1], 108)
  assert.deepEqual(
    [...segments.pos].filter((_, i) => i % 3 === 0),
    [0, 10, 10, 20],
  )
})

test('buildBorderSegments drapes rings over the sampled ground', () => {
  const borders = [{ id: 'cat', rings: [[0, 0, 10, 0, 20, 0]] }]
  const segments = buildBorderSegments(borders, () => 30)
  assert.equal(segments.pos.length, 12)
  assert.equal(segments.pos[1], 44)
})

test('buildRiverSegments accumulates flow distance', () => {
  const rivers = [{ id: 'ebre', p: [0, 0, 3, 4, 6, 8] }]
  const river = buildRiverSegments(rivers, () => 0)
  assert.equal(river.pos.length, 12)
  assert.equal(river.pos[1], 12)
  assert.deepEqual([...river.dist], [0, 5, 5, 10])
})
