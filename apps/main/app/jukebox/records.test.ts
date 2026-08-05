import assert from 'node:assert/strict'
import test from 'node:test'
import { RECORDS, selectorCode } from './records.ts'

test('selectorCode walks columns of six', () => {
  assert.equal(selectorCode(0), 'A1')
  assert.equal(selectorCode(5), 'A6')
  assert.equal(selectorCode(6), 'B1')
  assert.equal(selectorCode(10), 'B5')
})

test('records carry unique ids and codes', () => {
  const ids = new Set(RECORDS.map((record) => record.id))
  assert.equal(ids.size, RECORDS.length)
  const codes = new Set(RECORDS.map((_, index) => selectorCode(index)))
  assert.equal(codes.size, RECORDS.length)
})

test('every url is https on a sospedra.me subdomain', () => {
  for (const record of RECORDS) {
    const parsed = new URL(record.url)
    assert.equal(parsed.protocol, 'https:')
    assert.ok(parsed.hostname.endsWith('.sospedra.me'))
    assert.notEqual(parsed.hostname, 'sospedra.me')
  }
})

test('eleven records today', () => {
  assert.equal(RECORDS.length, 11)
})
