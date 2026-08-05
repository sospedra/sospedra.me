import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { dampFactor, padDigits, smoother, sstep, wrapPI } from './easing.ts'

const vectors = JSON.parse(
  readFileSync(join(import.meta.dirname, 'golden-vectors.json'), 'utf8'),
)

test('smoother matches the prototype quintic', () => {
  assert.deepEqual(vectors.easing.t.map(smoother), vectors.easing.smoother)
})

test('sstep matches the prototype smoothstep with clamping', () => {
  assert.deepEqual(vectors.easing.sstepIn.map(sstep), vectors.easing.sstep)
})

test('wrapPI matches the prototype wrap', () => {
  assert.deepEqual(vectors.easing.wrapPIIn.map(wrapPI), vectors.easing.wrapPI)
})

test('padDigits renders telemetry digits', () => {
  assert.equal(padDigits(42.4, 5), '00042')
  assert.equal(padDigits(359.6, 3), '360')
  assert.equal(padDigits(0, 2), '00')
})

test('dampFactor approaches one as dt grows', () => {
  assert.ok(dampFactor(0.016, 0.15) > 0.1)
  assert.ok(dampFactor(10, 0.15) > 0.999)
  assert.ok(dampFactor(0, 0.15) === 0)
})
