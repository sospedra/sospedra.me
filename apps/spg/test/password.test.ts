import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getLength, getMaxLength, getMinLength } from '../src/spg/password.ts'
import { stubs } from './stubs.ts'

test('getMaxLength returns the longest sentence length', () => {
  assert.equal(getMaxLength(Object.values(stubs)), stubs.html.length)
})

test('getMinLength returns the input or the 8-char floor', () => {
  assert.equal(getMinLength(20), 20)
  assert.equal(getMinLength(4), 8)
})

test('getLength caps the input length at the max length', () => {
  assert.equal(getLength(20, 40), 20)
  assert.equal(getLength(30, 10), 10)
})
