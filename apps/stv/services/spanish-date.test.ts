import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseSpanishDate } from './spanish-date.ts'

test('parseSpanishDate returns the UTC epoch of the Spanish date', () => {
  assert.equal(
    parseSpanishDate('7 de Agosto de 2026', '01:05'),
    Date.UTC(2026, 7, 7, 1, 5),
  )
  assert.equal(
    parseSpanishDate('1 de Enero de 2027', '00:00'),
    Date.UTC(2027, 0, 1, 0, 0),
  )
  assert.equal(
    parseSpanishDate('31 de Diciembre de 2026', '23:59'),
    Date.UTC(2026, 11, 31, 23, 59),
  )
})

test('parseSpanishDate accepts padded days and any casing', () => {
  const unix = Date.UTC(2026, 7, 7, 10, 0)
  assert.equal(parseSpanishDate('07 de AGOSTO de 2026', '10:00'), unix)
  assert.equal(parseSpanishDate(' 7 de agosto de 2026 ', '10:00'), unix)
})

test('parseSpanishDate returns null on malformed input', () => {
  assert.equal(parseSpanishDate('7 de Augustus de 2026', '10:00'), null)
  assert.equal(parseSpanishDate('7 de agosto', '10:00'), null)
  assert.equal(parseSpanishDate('', '10:00'), null)
  assert.equal(parseSpanishDate('7 de agosto de 2026', ''), null)
  assert.equal(parseSpanishDate('7 de agosto de 2026', '10:00:00'), null)
  assert.equal(parseSpanishDate('x de agosto de y', '10:00'), null)
})
