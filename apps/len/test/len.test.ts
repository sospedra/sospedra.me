import assert from 'node:assert/strict'
import { test } from 'node:test'
import len from '../src/index.ts'

test('len returns the array length', () => {
  assert.equal(len([1, 2, 3]), 3)
  assert.equal(len([]), 0)
})

test('len returns 0 for non-array targets', () => {
  assert.equal(len({}), 0)
  assert.equal(len(9), 0)
  assert.equal(len('string'), 0)
  assert.equal(len(undefined), 0)
  assert.equal(len(null), 0)
})
