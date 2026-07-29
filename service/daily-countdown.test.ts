import assert from 'node:assert/strict'
import test from 'node:test'
import { formatDailyCountdown, nextDailyBoundary } from './daily-countdown.ts'

test('boundary targets the next utc midnight', () => {
  const boundary = nextDailyBoundary(new Date('2026-07-29T21:30:05.000Z'))
  assert.equal(boundary.toISOString(), '2026-07-30T00:00:00.000Z')
})

test('boundary crosses month and year ends', () => {
  const yearEnd = nextDailyBoundary(new Date('2026-12-31T23:59:59.000Z'))
  assert.equal(yearEnd.toISOString(), '2027-01-01T00:00:00.000Z')
})

test('countdown formats zero-padded hours minutes seconds', () => {
  assert.equal(formatDailyCountdown(0), '00:00:00')
  assert.equal(formatDailyCountdown(-500), '00:00:00')
  assert.equal(formatDailyCountdown(1000), '00:00:01')
  assert.equal(formatDailyCountdown(61_000), '00:01:01')
  assert.equal(
    formatDailyCountdown(23 * 3_600_000 + 59 * 60_000 + 59_000),
    '23:59:59',
  )
})
