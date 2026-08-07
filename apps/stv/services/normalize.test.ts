import assert from 'node:assert/strict'
import { test } from 'node:test'
import { normalize } from './normalize.ts'

test('normalize lowercases and strips diacritics', () => {
  assert.equal(normalize('FÚTBOL'), 'futbol')
  assert.equal(normalize('São Paulo'), 'sao paulo')
  assert.equal(normalize('Taça'), 'taca')
  assert.equal(normalize('Vélez'), 'velez')
})

test('normalize keeps plain ascii untouched', () => {
  assert.equal(normalize('premier league'), 'premier league')
})
