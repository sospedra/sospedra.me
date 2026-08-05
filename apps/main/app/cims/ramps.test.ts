import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import {
  contourBrightness,
  hillshade,
  lineBrightness,
  rampColor,
} from './ramps.ts'

const vectors = JSON.parse(
  readFileSync(join(import.meta.dirname, 'golden-vectors.json'), 'utf8'),
)
const HMAX = vectors.ramp.hs.at(-1)

test('elevation ramp matches the prototype stops', () => {
  const rgb = vectors.ramp.hs.map((h: number) => [...rampColor(h, HMAX)])
  assert.deepEqual(rgb, vectors.ramp.rgb)
})

test('line brightness matches the prototype', () => {
  for (const [h, hs, expected] of vectors.lineB) {
    assert.equal(lineBrightness(h, hs, HMAX), expected)
  }
})

test('contour brightness matches the prototype', () => {
  for (const [lv, mj, expected] of vectors.contB) {
    assert.equal(contourBrightness(lv, mj, HMAX), expected)
  }
})

test('hillshade matches the prototype light direction', () => {
  for (const [x, y, z, expected] of vectors.hsOf) {
    assert.equal(hillshade(x, y, z), expected)
  }
})
