import assert from 'node:assert/strict'
import { test } from 'node:test'
import { toMilliseconds, toTime } from './time.ts'

test('toMilliseconds converts minutes', () => {
  assert.equal(toMilliseconds(25), 1_500_000)
  assert.equal(toMilliseconds(0), 0)
})

test('toTime pads to mm:ss under one hour', () => {
  assert.equal(toTime(0), '00:00')
  assert.equal(toTime(5000), '00:05')
  assert.equal(toTime(59_999), '00:59')
  assert.equal(toTime(60_000), '01:00')
  assert.equal(toTime(1_500_000), '25:00')
  assert.equal(toTime(3_599_999), '59:59')
})

test('toTime shows hours for long tracks', () => {
  assert.equal(toTime(3_600_000), '1:00:00')
  assert.equal(toTime(5_400_000), '1:30:00')
})
