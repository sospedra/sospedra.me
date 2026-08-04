import assert from 'node:assert/strict'
import test from 'node:test'
import {
  initialRadio,
  type RadioEvent,
  type RadioState,
  reduceRadio,
  wantsPlayback,
} from './radio-tuner.ts'

const run = (events: RadioEvent[], from: RadioState = initialRadio(3)) =>
  events.reduce(reduceRadio, from)

const start = (stationIndex: number, attempt: number): RadioEvent => ({
  type: 'start',
  stationIndex,
  attempt,
})

test('start moves to loading and marks the station attempted', () => {
  const state = run([start(0, 1)])
  assert.deepEqual(state, {
    phase: 'loading',
    attempt: 1,
    attempted: new Set([0]),
    stationCount: 3,
    stationIndex: 0,
  })
})

test('a matching playing echo locks the signal', () => {
  const state = run([start(0, 1), { type: 'audio-playing', attempt: 1 }])
  assert.equal(state.phase, 'playing')
  assert.equal(wantsPlayback(state), true)
})

test('a played station clears the attempted set', () => {
  const state = run([
    start(0, 1),
    { type: 'station-failed', attempt: 1 },
    start(1, 2),
    { type: 'audio-playing', attempt: 2 },
  ])
  assert.equal(state.phase, 'playing')
  assert.deepEqual(state.attempted, new Set())
})

test('a stale playing echo from a replaced attempt is dropped', () => {
  const state = run([
    start(0, 1),
    start(1, 2),
    { type: 'audio-playing', attempt: 1 },
  ])
  assert.equal(state.phase, 'loading')
  assert.equal(state.stationIndex, 1)
})

test('a failure advances to the lowest unattempted station', () => {
  const state = run([start(2, 1), { type: 'station-failed', attempt: 1 }])
  assert.deepEqual(state, {
    phase: 'recovering',
    attempt: 1,
    attempted: new Set([2]),
    stationCount: 3,
    stationIndex: 0,
  })
})

test('failures walk every station once and then surface error', () => {
  const state = run([
    start(0, 1),
    { type: 'station-failed', attempt: 1 },
    start(1, 2),
    { type: 'station-failed', attempt: 2 },
    start(2, 3),
    { type: 'station-failed', attempt: 3 },
  ])
  assert.equal(state.phase, 'error')
  assert.deepEqual(state.attempted, new Set([0, 1, 2]))
  assert.equal(wantsPlayback(state), false)
})

test('a duplicate failure echo while recovering is dropped', () => {
  const state = run([
    start(0, 1),
    { type: 'station-failed', attempt: 1 },
    { type: 'station-failed', attempt: 1 },
  ])
  assert.equal(state.phase, 'recovering')
  assert.equal(state.stationIndex, 1)
  assert.deepEqual(state.attempted, new Set([0]))
})

test('a mid-play failure recovers through previously attempted stations', () => {
  const state = run([
    start(1, 1),
    { type: 'station-failed', attempt: 1 },
    start(0, 2),
    { type: 'audio-playing', attempt: 2 },
    { type: 'station-failed', attempt: 2 },
  ])
  assert.equal(state.phase, 'recovering')
  assert.equal(state.stationIndex, 1)
})

test('a fresh start after error or hold resets the attempted set', () => {
  const errored = run([
    start(0, 1),
    { type: 'station-failed', attempt: 1 },
    start(1, 2),
    { type: 'station-failed', attempt: 2 },
    start(2, 3),
    { type: 'station-failed', attempt: 3 },
  ])
  assert.deepEqual(run([start(1, 4)], errored).attempted, new Set([1]))

  const held = run([
    start(0, 1),
    { type: 'station-failed', attempt: 1 },
    start(1, 2),
    { type: 'hold' },
  ])
  assert.deepEqual(run([start(1, 3)], held).attempted, new Set([1]))
})

test('hold parks a live attempt and nothing else', () => {
  const parked = run([start(0, 1), { type: 'hold' }])
  assert.deepEqual(parked, {
    phase: 'off',
    held: true,
    attempt: 1,
    attempted: new Set([0]),
    stationCount: 3,
    stationIndex: 0,
  })

  const idle = initialRadio(3)
  assert.equal(reduceRadio(idle, { type: 'hold' }), idle)

  const errored = run(
    [start(0, 1), { type: 'station-failed', attempt: 1 }],
    initialRadio(1),
  )
  assert.equal(errored.phase, 'error')
  assert.equal(reduceRadio(errored, { type: 'hold' }), errored)
})

test('rebuffering drops playing back to loading, nothing else moves', () => {
  const rebuffering = run([
    start(0, 1),
    { type: 'audio-playing', attempt: 1 },
    { type: 'audio-waiting', attempt: 1 },
  ])
  assert.equal(rebuffering.phase, 'loading')

  const loading = run([start(0, 1)])
  assert.equal(
    reduceRadio(loading, { type: 'audio-waiting', attempt: 1 }),
    loading,
  )

  const stale = run([start(0, 1), { type: 'audio-playing', attempt: 1 }])
  assert.equal(reduceRadio(stale, { type: 'audio-waiting', attempt: 9 }), stale)
})

test('tuning while live retunes fresh, while parked it only selects', () => {
  const live = run([
    start(0, 1),
    { type: 'audio-playing', attempt: 1 },
    { type: 'tune', stationIndex: 2 },
  ])
  assert.deepEqual(live, {
    phase: 'tuning',
    attempt: 1,
    attempted: new Set(),
    stationCount: 3,
    stationIndex: 2,
  })

  const loading = run([start(0, 1)])
  assert.equal(reduceRadio(loading, { type: 'tune', stationIndex: 0 }), loading)

  const parked = run([{ type: 'tune', stationIndex: 2 }])
  assert.deepEqual(parked, { ...initialRadio(3), stationIndex: 2 })
})

test('tuning the dial releases a hold back to signal-ready', () => {
  const state = run([
    start(0, 1),
    { type: 'hold' },
    { type: 'tune', stationIndex: 1 },
  ])
  assert.deepEqual(state, {
    phase: 'off',
    held: false,
    attempt: 1,
    attempted: new Set([0]),
    stationCount: 3,
    stationIndex: 1,
  })
})

test('a station list swap restarts a live intent from the top', () => {
  const live = run([
    start(2, 1),
    { type: 'audio-playing', attempt: 1 },
    { type: 'stations', stationCount: 4 },
  ])
  assert.deepEqual(live, {
    phase: 'tuning',
    attempt: 1,
    attempted: new Set(),
    stationCount: 4,
    stationIndex: 0,
  })
})

test('a station list swap while parked or errored lands on signal-ready', () => {
  const parked = run([
    start(0, 1),
    { type: 'hold' },
    { type: 'stations', stationCount: 2 },
  ])
  assert.deepEqual(parked, { ...initialRadio(2), attempt: 1 })

  const errored = run([
    start(0, 1),
    { type: 'station-failed', attempt: 1 },
    start(1, 2),
    { type: 'station-failed', attempt: 2 },
    start(2, 3),
    { type: 'station-failed', attempt: 3 },
    { type: 'stations', stationCount: 2 },
  ])
  assert.deepEqual(errored, { ...initialRadio(2), attempt: 3 })
})

test('an empty station list kills a live intent with an error', () => {
  const state = run([
    start(0, 1),
    { type: 'audio-playing', attempt: 1 },
    { type: 'stations', stationCount: 0 },
  ])
  assert.equal(state.phase, 'error')
  assert.equal(wantsPlayback(state), false)
})
