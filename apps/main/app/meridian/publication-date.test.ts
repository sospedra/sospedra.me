import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isUtcPublicationDate,
  latestPublicationDateOnOrBefore,
  resolveGeoPublicationDate,
  utcPublicationDate,
} from './publication-date.ts'

test('derives the publication date from UTC rather than local time', () => {
  const instant = new Date('2026-07-28T00:05:00.000Z')

  assert.equal(utcPublicationDate(instant), '2026-07-28')
  assert.equal(resolveGeoPublicationDate(undefined, instant), '2026-07-28')
})

test('accepts a reproducible build override', () => {
  assert.equal(
    resolveGeoPublicationDate(
      ' 2026-08-03 ',
      new Date('2026-07-28T00:05:00.000Z'),
    ),
    '2026-08-03',
  )
})

test('rejects malformed and impossible publication dates', () => {
  assert.equal(isUtcPublicationDate('2026-02-29'), false)
  assert.equal(isUtcPublicationDate('2026-2-9'), false)
  assert.throws(
    () => resolveGeoPublicationDate('2026-02-29'),
    /must use a real UTC date/u,
  )
})

test('selects the exact edition when the resolved date is inventoried', () => {
  assert.equal(
    latestPublicationDateOnOrBefore(
      ['2026-07-26', '2026-07-27', '2026-07-28'],
      '2026-07-27',
    ),
    '2026-07-27',
  )
})

test('falls back to the newest earlier edition after a UTC rollover', () => {
  assert.equal(
    latestPublicationDateOnOrBefore(['2026-07-26', '2026-07-27'], '2026-07-28'),
    '2026-07-27',
  )
})

test('ignores inventory order when picking the fallback edition', () => {
  assert.equal(
    latestPublicationDateOnOrBefore(['2026-07-27', '2026-07-25'], '2026-07-28'),
    '2026-07-27',
  )
})

test('yields no edition when the inventory is empty or future-only', () => {
  assert.equal(latestPublicationDateOnOrBefore([], '2026-07-28'), null)
  assert.equal(
    latestPublicationDateOnOrBefore(['2026-07-29'], '2026-07-28'),
    null,
  )
})
