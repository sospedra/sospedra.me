import assert from 'node:assert/strict'
import test from 'node:test'
import { haversineDistanceKm, isGeoCoordinate } from './distance.ts'

const MADRID = { latitude: 40.4168, longitude: -3.7038 }
const WASHINGTON = { latitude: 38.9072, longitude: -77.0369 }

test('haversine matches known city pairs', () => {
  const madridToWashington = haversineDistanceKm(MADRID, WASHINGTON)
  assert.ok(
    Math.abs(madridToWashington - 6094) < 30,
    `expected ~6094km, got ${madridToWashington}`,
  )
  assert.equal(haversineDistanceKm(MADRID, MADRID), 0)
})

test('haversine handles poles and the antimeridian', () => {
  const poleToPole = haversineDistanceKm(
    { latitude: 90, longitude: 0 },
    { latitude: -90, longitude: 0 },
  )
  assert.ok(Math.abs(poleToPole - 20_015) < 5)

  const acrossAntimeridian = haversineDistanceKm(
    { latitude: 0, longitude: 179.5 },
    { latitude: 0, longitude: -179.5 },
  )
  assert.ok(
    acrossAntimeridian < 120,
    `wrap distance should be short, got ${acrossAntimeridian}`,
  )
})

test('haversine rejects out-of-bounds coordinates', () => {
  assert.throws(
    () => haversineDistanceKm({ latitude: 91, longitude: 0 }, MADRID),
    RangeError,
  )
})

test('isGeoCoordinate accepts only finite world coordinates', () => {
  assert.equal(isGeoCoordinate(MADRID), true)
  assert.equal(isGeoCoordinate({ latitude: -90, longitude: 180 }), true)
  assert.equal(isGeoCoordinate({ latitude: 90.0001, longitude: 0 }), false)
  assert.equal(isGeoCoordinate({ latitude: 0, longitude: -180.5 }), false)
  assert.equal(isGeoCoordinate({ latitude: Number.NaN, longitude: 0 }), false)
  assert.equal(isGeoCoordinate({ latitude: '40', longitude: 0 }), false)
  assert.equal(isGeoCoordinate(null), false)
  assert.equal(isGeoCoordinate('40,-3'), false)
})
