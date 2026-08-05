import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import {
  decodeMasked,
  type GridSpec,
  gridX,
  gridZ,
  sampleBounded,
  sampleClamped,
  smoothGrid,
} from './decode.ts'

const vectors = JSON.parse(
  readFileSync(join(import.meta.dirname, 'golden-vectors.json'), 'utf8'),
)

test('decodeMasked matches the prototype on the synthetic grid', () => {
  const { syntheticB64, hmin, hmax, h, mask } = vectors.decode
  const decoded = decodeMasked(syntheticB64, hmin, hmax)
  assert.deepEqual([...decoded.h], h)
  assert.deepEqual([...decoded.mask], mask)
})

test('decode plus two smooth passes matches the prototype on real terrain', () => {
  const terrain = JSON.parse(
    readFileSync(
      join(import.meta.dirname, '../../public/cims/terrain.json'),
      'utf8',
    ),
  )
  const mountain = terrain.mountains[0]
  assert.equal(mountain.id, vectors.smooth.mountain)
  const { h, mask } = decodeMasked(mountain.b64, mountain.hmin, mountain.hmax)
  const preSmooth = vectors.smooth.sampleIdx.map((q: number) => h[q])
  assert.deepEqual(preSmooth, vectors.smooth.preSmooth)
  smoothGrid(h, mask, terrain.grid, terrain.grid, 2)
  const postSmooth = vectors.smooth.sampleIdx.map((q: number) => h[q])
  assert.deepEqual(postSmooth, vectors.smooth.postSmooth)
})

const FLAT: GridSpec = { nx: 3, nz: 3, ox: 0, oz: 0, cellX: 10, cellZ: 10 }

test('grid coordinates center on the origin', () => {
  assert.equal(gridX(FLAT, 0), -10)
  assert.equal(gridX(FLAT, 2), 10)
  assert.equal(gridZ(FLAT, 1), 0)
})

test('bilinear sampling interpolates and clamps', () => {
  const h = new Float32Array([0, 0, 0, 0, 100, 0, 0, 0, 0])
  assert.equal(sampleClamped(FLAT, h, 0, 0), 100)
  assert.equal(sampleClamped(FLAT, h, 5, 0), 50)
  assert.equal(sampleClamped(FLAT, h, -500, -500), 0)
})

test('bounded sampling rejects points outside the grid', () => {
  const h = new Float32Array(9).fill(7)
  assert.equal(sampleBounded(FLAT, h, 0, 0), 7)
  assert.equal(sampleBounded(FLAT, h, 11, 0), Number.NEGATIVE_INFINITY)
  assert.equal(sampleBounded(FLAT, h, 0, -11), Number.NEGATIVE_INFINITY)
})
