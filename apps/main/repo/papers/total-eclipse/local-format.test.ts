import assert from 'node:assert/strict'
import test from 'node:test'
import {
  bearingFrom,
  compassPoint,
  formatAltitude,
  formatClock,
  formatClockMinutes,
  formatCoordinates,
  formatDuration,
  formatObscuration,
  greatCircleKm,
  horizonAdvice,
  zoneAbbreviation,
} from './local-format.ts'

const HOUR = 3600

test('clocks read in the country zone, not in UTC', () => {
  assert.equal(formatClock(18.5 * HOUR, 'Europe/Madrid'), '20:30:00')
  assert.equal(formatClock(18.5 * HOUR, 'Atlantic/Reykjavik'), '18:30:00')
  assert.equal(formatClock(18.5 * HOUR, 'Europe/Lisbon'), '19:30:00')
})

test('a maximum after local midnight carries the day', () => {
  const russianMaximum = 17 * HOUR
  assert.equal(
    formatClock(russianMaximum, 'Asia/Krasnoyarsk'),
    '00:00:00 (13th)',
  )
  assert.equal(
    formatClockMinutes(russianMaximum, 'Asia/Yakutsk'),
    '02:00 (13th)',
  )
  assert.equal(formatClockMinutes(russianMaximum, 'Europe/Madrid'), '19:00')
})

test('zone abbreviations name the offset the reader lives in', () => {
  assert.equal(zoneAbbreviation('Europe/Madrid'), 'CEST')
  assert.equal(zoneAbbreviation('Europe/London'), 'BST')
})

test('durations read as minutes and seconds, seconds alone under a minute', () => {
  assert.equal(formatDuration(110), '1 m 50 s')
  assert.equal(formatDuration(20.4), '20 s')
  assert.equal(formatDuration(134), '2 m 14 s')
  assert.equal(formatDuration(120), '2 m 00 s')
})

test('obscuration keeps two decimals inside the last percent', () => {
  assert.equal(formatObscuration(1), '100%')
  assert.equal(formatObscuration(0.9997), '100%')
  assert.equal(formatObscuration(0.9984), '99.84%')
  assert.equal(formatObscuration(0.9462), '94.6%')
})

test('the compass names the sunset quarter the umbra arrives from', () => {
  assert.equal(compassPoint(0), 'N')
  assert.equal(compassPoint(281), 'W')
  assert.equal(compassPoint(295), 'WNW')
  assert.equal(compassPoint(-90), 'W')
})

test('coordinates carry a hemisphere letter', () => {
  assert.equal(formatCoordinates(43.3619, -5.8494), '43.362°N · 5.849°W')
  assert.equal(formatCoordinates(-33.92, 18.42), '33.920°S · 18.420°E')
  assert.equal(formatAltitude(10.24), '10.2°')
})

test('horizon advice escalates as the sun drops', () => {
  assert.match(horizonAdvice(24), /well clear/)
  assert.match(horizonAdvice(10), /rooftops/)
  assert.match(horizonAdvice(5), /west-northwest/)
  assert.match(horizonAdvice(1.5), /shoreline or a ridge/)
  assert.match(horizonAdvice(-2), /below the horizon/)
})

test('distance and bearing hold against known city pairs', () => {
  const madridToSoria = greatCircleKm(40.4168, -3.7038, 41.7643, -2.4649)
  assert.ok(Math.abs(madridToSoria - 182) < 4, `${madridToSoria} km`)
  const bearing = bearingFrom(40.4168, -3.7038, 41.7643, -2.4649)
  assert.equal(compassPoint(bearing), 'NE')
})
