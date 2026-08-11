import assert from 'node:assert/strict'
import test from 'node:test'
import {
  computeTrack,
  type Element,
  type LonLat,
  type Member,
} from './saros-path.ts'
import {
  distanceKm,
  formatApproach,
  formatPoint,
  nearestApproachKm,
  nearestPlace,
  PLACES,
} from './saros-places.ts'
import data from './saros126.json' with { type: 'json' }

const members = data.members as Member[]
const elements = data.elements as Record<string, Element>

const trackFor = (key: string) => {
  const member = members.find((entry) => entry.key === key)
  assert.ok(member, `${key} missing`)
  return computeTrack(elements[key], member.dT).line
}

const placeBy = (id: string) => {
  const place = PLACES.find((entry) => entry.id === id)
  assert.ok(place, `${id} missing`)
  return place
}

const approach = (key: string, id: string) => {
  const place = placeBy(id)
  const km = nearestApproachKm(trackFor(key), [place.lon, place.lat])
  assert.ok(km !== null)
  return km
}

// Quarter and half of a 6371 km sphere, so the check is independent of any
// gazetteer: pi * 6371 / 2 and pi * 6371.
test('distance matches exact geodesic constants', () => {
  const origin: LonLat = [0, 0]
  assert.equal(distanceKm(origin, origin), 0)
  assert.ok(Math.abs(distanceKm(origin, [0, 90]) - 10007.5) < 1)
  assert.ok(Math.abs(distanceKm(origin, [90, 0]) - 10007.5) < 1)
  assert.ok(Math.abs(distanceKm(origin, [180, 0]) - 20015.1) < 1)
})

test('distance is symmetric', () => {
  const a: LonLat = [10, 56]
  const b: LonLat = [-42, 71.7]
  assert.ok(Math.abs(distanceKm(a, b) - distanceKm(b, a)) < 1e-6)
})

test('the 2026 band runs over Spain and Iceland', () => {
  assert.ok(approach('20260812', 'es') < 300)
  assert.ok(approach('20260812', 'is') < 400)
})

test('the 1900 member crossed Iberia, as the paper claims', () => {
  assert.ok(approach('19000528', 'es') < 200)
  assert.ok(approach('19000528', 'pt') < 200)
})

// The saros walk: consecutive members land a third of the planet apart, so the
// nearest country changes between 2008 and 2026.
test('the nearest country moves from Russia to Spain in one saros', () => {
  const closestTo = (key: string) =>
    PLACES.map((place) => ({ id: place.id, km: approach(key, place.id) })).sort(
      (left, right) => left.km - right.km,
    )[0].id

  assert.equal(closestTo('20080801'), 'ru')
  assert.equal(closestTo('20260812'), 'es')
  assert.ok(approach('20080801', 'es') > 4000)
  assert.ok(approach('20260812', 'ru') > 1500)
})

test('an empty line reports no central line', () => {
  assert.equal(nearestApproachKm([], [-3.7, 40.4]), null)
  assert.equal(formatApproach(null), 'no central line')
})

test('approach wording switches at the crossing threshold', () => {
  assert.equal(formatApproach(20), 'crosses here')
  assert.equal(formatApproach(1234), '1230 km away')
})

test('a tap near a country adopts it, mid-ocean stays raw', () => {
  assert.equal(nearestPlace([-3.9, 41.1])?.id, 'es')
  assert.equal(nearestPlace([-21.9, 64.1])?.id, 'is')
  assert.equal(nearestPlace([-35, 45]), null)
})

test('formatPoint writes hemispheres, not signs', () => {
  assert.equal(formatPoint([-25.2, 65.2]), '65°N 25°W')
  assert.equal(formatPoint([151.2, -33.9]), '34°S 151°E')
})
