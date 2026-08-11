import assert from 'node:assert/strict'
import test from 'node:test'
import {
  centralPoint,
  computeTrack,
  type Element,
  hoursFromEpoch,
  type Member,
  wrapLongitude,
} from './saros-path.ts'
import data from './saros126.json' with { type: 'json' }

const members = data.members as Member[]
const elements = data.elements as Record<string, Element>
const umbral = members.filter((member) => 'ATH'.includes(member.type[0]))

const separation = (aLon: number, aLat: number, bLon: number, bLat: number) =>
  Math.hypot(aLat - bLat, wrapLongitude(aLon - bLon))

test('the series is the whole of saros 126', () => {
  assert.equal(members.length, 72)
  assert.equal(members[0].date, '1179 Mar 10')
  assert.equal(members.at(-1)?.date, '2459 May 03')
  assert.equal(umbral.length, 41)
})

test('the 2026 member is ordinal 48 of 72', () => {
  const target = members.find((member) => member.key === '20260812')
  assert.ok(target)
  assert.equal(target.ord, 48)
  assert.equal(target.type, 'T')
  assert.equal(target.width, 294)
})

test('every central line hits its catalogued greatest eclipse', () => {
  for (const member of umbral) {
    const element = elements[member.key]
    assert.ok(element, `${member.date} has no elements`)
    const point = centralPoint(
      element,
      member.dT,
      hoursFromEpoch(member, element),
    )
    assert.ok(point, `${member.date} produced no central point`)
    const off = separation(point.lon, point.lat, member.lon, member.lat)
    assert.ok(off < 0.1, `${member.date} is ${off.toFixed(3)} deg off catalog`)
  }
})

test('umbra width matches the catalogued path width', () => {
  for (const member of umbral) {
    if (!member.width) continue
    const element = elements[member.key]
    const point = centralPoint(
      element,
      member.dT,
      hoursFromEpoch(member, element),
    )
    assert.ok(point)
    const error = Math.abs(point.halfWidthKm * 2 - member.width) / member.width
    assert.ok(
      error < 0.05,
      `${member.date} width ${(point.halfWidthKm * 2).toFixed(0)} vs ${member.width}`,
    )
  }
})

test('every umbral member yields a drawable track', () => {
  for (const member of umbral) {
    const track = computeTrack(elements[member.key], member.dT)
    assert.ok(
      track.line.length >= 20,
      `${member.date} line has ${track.line.length} points`,
    )
    assert.equal(track.band.length, track.line.length * 2)
  }
})

// gamma is the axis miss distance in Earth radii, so a grazing member crosses
// far less ground than a central one. Guards against a constant-length track.
test('track length falls away as gamma approaches the limb', () => {
  const memberFor = (key: string) => {
    const member = umbral.find((entry) => entry.key === key)
    assert.ok(member, `${key} is not an umbral member`)
    return member
  }
  const grazing = memberFor('13230604')
  const central = memberFor('15931122')
  assert.ok(Math.abs(grazing.gamma) > 0.9, 'expected a limb-grazing member')
  assert.ok(Math.abs(central.gamma) < 0.2, 'expected a near-central member')

  const grazingPoints = computeTrack(elements[grazing.key], grazing.dT).line
  const centralPoints = computeTrack(elements[central.key], central.dT).line
  assert.ok(
    centralPoints.length > grazingPoints.length * 2,
    `central ${centralPoints.length} vs grazing ${grazingPoints.length}`,
  )
})

test('longitudes stay inside the datum', () => {
  for (const member of umbral) {
    const track = computeTrack(elements[member.key], member.dT)
    for (const [lon, lat] of track.line) {
      assert.ok(lon >= -180 && lon <= 180, `lon ${lon} out of range`)
      assert.ok(lat >= -90 && lat <= 90, `lat ${lat} out of range`)
    }
  }
})

test('the shadow walks west between consecutive members', () => {
  const y2008 = members.find((member) => member.key === '20080801')
  const y2026 = members.find((member) => member.key === '20260812')
  assert.ok(y2008 && y2026)
  const walked = wrapLongitude(y2008.lon - y2026.lon)
  assert.ok(walked > 90 && walked < 110, `walked ${walked.toFixed(1)} deg`)
  assert.ok(Math.abs(y2008.lat - y2026.lat) < 1)
})
