import assert from 'node:assert/strict'
import test from 'node:test'
import {
  centuryReducer,
  FULL_RANGE,
  initialCenturyState,
  isVisible,
  passesFilters,
  selectedId,
} from './century-state.ts'
import type { AtlasEclipse } from './eclipse-atlas.ts'

const eclipse = (
  over: Partial<AtlasEclipse> & Pick<AtlasEclipse, 'id'>,
): AtlasEclipse => ({
  date: '2026-08-12',
  kind: 'T',
  saros: 126,
  path: [[0, 0]],
  fraction: 2026.6,
  year: 2026,
  dayOfYear: 224,
  mid: [0, 0],
  midLatitude: 0,
  countries: ['ES'],
  ...over,
})

test('the map opens on the whole world and the whole century', () => {
  assert.deepEqual(initialCenturyState.range, FULL_RANGE)
  assert.equal(initialCenturyState.country, null)
  assert.equal(initialCenturyState.view, 'spiral')
})

test('turning a kind off hides it and drops the pin', () => {
  const pinned = centuryReducer(initialCenturyState, { type: 'pin', id: 7 })
  const state = centuryReducer(pinned, { type: 'kind', kind: 'A' })
  assert.equal(state.kinds.A, false)
  assert.equal(state.kinds.T, true)
  assert.equal(state.pinned, null)
})

test('a country filter keeps only the shadows that reached it', () => {
  const state = centuryReducer(initialCenturyState, {
    type: 'country',
    code: 'IS',
  })
  assert.equal(
    passesFilters(eclipse({ id: 1, countries: ['ES'] }), state),
    false,
  )
  assert.equal(
    passesFilters(eclipse({ id: 2, countries: ['ES', 'IS'] }), state),
    true,
  )
})

test('the year range gates the map but not the filters', () => {
  const state = centuryReducer(initialCenturyState, {
    type: 'range',
    range: [1960, 1980],
  })
  const modern = eclipse({ id: 3, year: 2026 })
  assert.equal(passesFilters(modern, state), true)
  assert.equal(isVisible(modern, state), false)
  assert.equal(isVisible(eclipse({ id: 4, year: 1971 }), state), true)
})

test('clearing the range restores the century and keeps the pin', () => {
  const narrowed = centuryReducer(initialCenturyState, {
    type: 'range',
    range: [1960, 1980],
  })
  const pinned = centuryReducer(narrowed, { type: 'pin', id: 21 })
  const cleared = centuryReducer(pinned, { type: 'clearRange' })
  assert.deepEqual(cleared.range, FULL_RANGE)
  assert.equal(cleared.pinned, 21)
})

test('pinning the pinned eclipse unpins it', () => {
  const once = centuryReducer(initialCenturyState, { type: 'pin', id: 12 })
  assert.equal(once.pinned, 12)
  assert.equal(centuryReducer(once, { type: 'pin', id: 12 }).pinned, null)
})

test('a pin outranks a hover, and a hover outranks the fallback', () => {
  const hovered = centuryReducer(initialCenturyState, { type: 'hover', id: 4 })
  assert.equal(selectedId(hovered, 99), 4)
  const pinned = centuryReducer(hovered, { type: 'pin', id: 8 })
  assert.equal(selectedId(pinned, 99), 8)
  assert.equal(selectedId(initialCenturyState, 99), 99)
})

test('repeating a hover or a view returns the same state', () => {
  const hovered = centuryReducer(initialCenturyState, { type: 'hover', id: 4 })
  assert.equal(centuryReducer(hovered, { type: 'hover', id: 4 }), hovered)
  assert.equal(
    centuryReducer(hovered, { type: 'view', view: 'spiral' }),
    hovered,
  )
})
