import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { gunzipSync } from 'node:zlib'
import {
  assembleTerrain,
  decodeMasked,
  type GridSpec,
  gridX,
  gridZ,
  sampleBounded,
  sampleClamped,
  smoothGrid,
  undeltaGrid,
  undeltaPairs,
} from './decode.ts'

const vectors = JSON.parse(
  readFileSync(join(import.meta.dirname, 'golden-vectors.json'), 'utf8'),
)

const b64Cells = (b64: string): Uint16Array => {
  const bytes = Uint8Array.from(Buffer.from(b64, 'base64'))
  return new Uint16Array(bytes.buffer)
}

test('decodeMasked matches the prototype on the synthetic grid', () => {
  const { syntheticB64, hmin, hmax, h, mask } = vectors.decode
  const decoded = decodeMasked(b64Cells(syntheticB64), hmin, hmax)
  assert.deepEqual([...decoded.h], h)
  assert.deepEqual([...decoded.mask], mask)
})

test('undeltaPairs restores absolute coordinates', () => {
  assert.deepEqual(
    undeltaPairs([10, -20, 5, 5, -3, 0]),
    [10, -20, 15, -15, 12, -15],
  )
  assert.deepEqual(undeltaPairs([]), [])
})

test('undeltaGrid folds mod-65536 deltas back to the source cells', () => {
  const cells = Uint16Array.from([7, 65530, 3, 3])
  const deltas = Uint16Array.from(cells)
  for (let i = deltas.length - 1; i > 0; i--) deltas[i] -= deltas[i - 1]
  assert.deepEqual([...undeltaGrid(deltas)], [...cells])
})

const loadV2 = () => {
  const dir = join(import.meta.dirname, '../../public/cims')
  const meta = JSON.parse(readFileSync(join(dir, 'terrain.json'), 'utf8'))
  const inflated = gunzipSync(readFileSync(join(dir, 'terrain.bin')))
  const grids = new Uint16Array(Uint8Array.from(inflated).buffer)
  return { meta, grids }
}

test('decode plus two smooth passes matches the pinned real-terrain vectors', () => {
  const { meta, grids } = loadV2()
  const terrain = assembleTerrain(meta, grids)
  const mountain = terrain.mountains[0]
  assert.equal(mountain.id, vectors.smooth.mountain)
  const { h, mask } = decodeMasked(mountain.q, mountain.hmin, mountain.hmax)
  const preSmooth = vectors.smooth.sampleIdx.map((q: number) => h[q])
  assert.deepEqual(preSmooth, vectors.smooth.preSmooth)
  smoothGrid(h, mask, terrain.grid, terrain.grid, 2)
  const postSmooth = vectors.smooth.sampleIdx.map((q: number) => h[q])
  assert.deepEqual(postSmooth, vectors.smooth.postSmooth)
})

test('assembleTerrain rejects a bin that disagrees with the meta', () => {
  const { meta, grids } = loadV2()
  assert.throws(
    () => assembleTerrain(meta, grids.subarray(0, grids.length - 1)),
    /length mismatch/,
  )
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
