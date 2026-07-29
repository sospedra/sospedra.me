import assert from 'node:assert/strict'
import test from 'node:test'
import { lunarOrbitAtVisit } from './lunar-position.ts'

const MEAN_DISTANCE_KM = 384_400

/* Earth spins 360.9856°/day, the moon advances ~13.2°/day eastward */
const HOURLY_DRIFT_DEGREES = -14.49

const wrapSigned = (value: number): number => ((value + 540) % 360) - 180

const SAMPLE_DATES = Array.from(
  { length: 12 },
  (_, month) => new Date(Date.UTC(2026, month, 17, 9, 30)),
)

test('the visit is deterministic and echoes its timestamp', () => {
  const date = new Date('2026-07-29T12:00:00.000Z')
  assert.deepEqual(lunarOrbitAtVisit(date), lunarOrbitAtVisit(date))
  assert.equal(lunarOrbitAtVisit(date).observedAt, '2026-07-29T12:00:00.000Z')
})

test('the orbit ring closes on the current point', () => {
  const date = new Date('2026-07-29T12:00:00.000Z')
  const visit = lunarOrbitAtVisit(date, 24)
  assert.equal(visit.orbit.length, 25)
  assert.equal(visit.orbit.at(-1), visit.current)
  assert.equal(lunarOrbitAtVisit(date).orbit.length, 97)
})

test('every 2026 sample stays inside physical lunar bounds', () => {
  for (const date of SAMPLE_DATES) {
    const visit = lunarOrbitAtVisit(date, 8)
    assert.ok(visit.distanceKm > 356_000 && visit.distanceKm < 407_000)
    assert.ok(Math.abs(visit.sublunarLatitude) < 29.5)
    assert.ok(visit.sublunarLongitude >= -180 && visit.sublunarLongitude < 180)
    assert.equal(
      visit.current.distanceRatio,
      visit.distanceKm / MEAN_DISTANCE_KM,
    )
    for (const point of visit.orbit) {
      const [x, y, z] = point.vector
      const norm = Math.sqrt(x * x + y * y + z * z)
      assert.ok(Math.abs(norm - 1) < 1e-9)
      assert.ok(point.distanceRatio > 0.92 && point.distanceRatio < 1.06)
    }
  }
})

test('the sub-lunar point drifts west about 14.5 degrees per hour', () => {
  for (const date of SAMPLE_DATES) {
    const later = new Date(date.getTime() + 3_600_000)
    const drift = wrapSigned(
      lunarOrbitAtVisit(later, 4).sublunarLongitude -
        lunarOrbitAtVisit(date, 4).sublunarLongitude,
    )
    assert.ok(Math.abs(drift - HOURLY_DRIFT_DEGREES) < 0.6)
  }
})
