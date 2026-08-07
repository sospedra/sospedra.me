import assert from 'node:assert/strict'
import { test } from 'node:test'
import { closest, levenshtein } from './levenshtein.ts'

test('levenshtein computes edit distance', () => {
  assert.equal(levenshtein('kitten', 'sitting'), 3)
  assert.equal(levenshtein('flaw', 'lawn'), 2)
  assert.equal(levenshtein('same', 'same'), 0)
  assert.equal(levenshtein('', 'abc'), 3)
  assert.equal(levenshtein('abc', ''), 3)
})

test('closest picks the candidate with the smallest distance', () => {
  const candidates = ['valencia-newcastle', 'gremio-sao paulo']
  assert.equal(
    closest('valencia - newcastle', candidates),
    'valencia-newcastle',
  )
  assert.equal(closest('gremio - sao paulo', candidates), 'gremio-sao paulo')
})

test('closest returns the first candidate on ties', () => {
  assert.equal(closest('ab', ['ax', 'bx']), 'ax')
})

test('closest returns undefined without candidates', () => {
  assert.equal(closest('anything', []), undefined)
})
