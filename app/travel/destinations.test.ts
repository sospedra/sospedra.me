import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DESTINATIONS,
  flagOf,
  flagPaletteOf,
  HOME,
  REGIONS,
} from './destinations.ts'

const DEFAULT_PALETTE = ['#62d6c3', '#e2622b']

test('flagOf maps ISO codes to regional indicator pairs', () => {
  assert.equal(flagOf('ES'), '🇪🇸')
  assert.equal(flagOf('JP'), '🇯🇵')
})

test('flagPaletteOf knows every visited country and has a fallback', () => {
  assert.deepEqual(flagPaletteOf('ES'), ['#ffd447', '#ef4d5e'])
  assert.deepEqual(flagPaletteOf('XX'), DEFAULT_PALETTE)
  for (const destination of DESTINATIONS) {
    assert.notDeepEqual(
      flagPaletteOf(destination.country),
      DEFAULT_PALETTE,
      `${destination.code} rides the fallback palette`,
    )
  }
})

test('destination codes are unique and coordinates are on the globe', () => {
  const codes = new Set(DESTINATIONS.map((destination) => destination.code))
  assert.equal(codes.size, DESTINATIONS.length)
  for (const destination of DESTINATIONS) {
    assert.ok(destination.lat >= -90 && destination.lat <= 90)
    assert.ok(destination.lon >= -180 && destination.lon <= 180)
    assert.equal(destination.country.length, 2)
  }
})

test('every destination belongs to a signalscope region', () => {
  const regionIds = new Set(REGIONS.map((region) => region.id))
  assert.equal(regionIds.size, REGIONS.length)
  for (const destination of DESTINATIONS) {
    assert.ok(regionIds.has(destination.region))
  }
})

test('home is Catalunya and appears in the log exactly once', () => {
  assert.equal(HOME.code, 'CAT')
  const homes = DESTINATIONS.filter((destination) => destination.home)
  assert.deepEqual(homes, [HOME])
})
