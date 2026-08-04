import assert from 'node:assert/strict'
import test from 'node:test'
import { DESTINATIONS } from './destinations.ts'
import { getRadioStations, RADIO_STATIONS } from './radio-stations.ts'

const FORMATS = new Set(['AAC', 'HLS', 'MP3', 'OGG'])

test('every station belongs to a destination, every destination has one', () => {
  const codes = new Set(DESTINATIONS.map((destination) => destination.code))
  for (const station of RADIO_STATIONS) {
    assert.ok(
      codes.has(station.destinationCode),
      `${station.station} points at unknown ${station.destinationCode}`,
    )
  }
  for (const code of codes) {
    assert.ok(getRadioStations(code).length > 0, `${code} has no stations`)
  }
})

test('station records ship verified https streams', () => {
  assert.ok(RADIO_STATIONS.length > 0)
  for (const station of RADIO_STATIONS) {
    assert.ok(station.streamUrl.startsWith('https://'), station.station)
    assert.ok(FORMATS.has(station.format))
    assert.equal(station.verification.working, true)
    assert.ok(Number.isFinite(Date.parse(station.verifiedAt)))
  }
})

test('getRadioStations partitions the catalogue by destination', () => {
  const codes = new Set(
    RADIO_STATIONS.map((station) => station.destinationCode),
  )
  const grouped = [...codes].flatMap((code) => [...getRadioStations(code)])
  assert.equal(grouped.length, RADIO_STATIONS.length)
  assert.deepEqual(getRadioStations('NOPE'), [])
  for (const station of getRadioStations('CAT')) {
    assert.equal(station.destinationCode, 'CAT')
  }
})
