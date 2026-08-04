import assert from 'node:assert/strict'
import { test } from 'node:test'
import { backgroundFor, hueFor } from '../src/hue.ts'

test('hueFor maps the legacy keyCode range onto the hue wheel', () => {
  assert.equal(hueFor(0), 0)
  assert.equal(hueFor(255), 360)
  assert.equal(hueFor(65), (65 / 255) * 360)
})

test('backgroundFor renders the hsl color for a keyCode', () => {
  assert.equal(backgroundFor(255), 'hsl(360, 35%, 50%)')
})
