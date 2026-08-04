import assert from 'node:assert/strict'
import test from 'node:test'
import {
  INITIAL_TUNER,
  reduceTuner,
  type TunerEvent,
  type TunerState,
} from './tuner.ts'

const run = (events: TunerEvent[], from: TunerState = INITIAL_TUNER) =>
  events.reduce(reduceTuner, from)

test('tune moves any state to connecting with the new attempt', () => {
  const state = run([{ type: 'tune', stationId: 'salsoul', attempt: 1 }])
  assert.deepEqual(state, {
    status: 'connecting',
    stationId: 'salsoul',
    attempt: 1,
  })
})

test('a matching playing echo confirms the connection', () => {
  const state = run([
    { type: 'tune', stationId: 'salsoul', attempt: 1 },
    { type: 'audio-playing', attempt: 1 },
  ])
  assert.equal(state.status, 'playing')
})

test('a stale playing echo from the previous station is dropped', () => {
  const state = run([
    { type: 'tune', stationId: 'salsoul', attempt: 1 },
    { type: 'tune', stationId: 'solar', attempt: 2 },
    { type: 'audio-playing', attempt: 1 },
  ])
  assert.deepEqual(state, {
    status: 'connecting',
    stationId: 'solar',
    attempt: 2,
  })
})

test('a stale abort error after a fast retune is dropped', () => {
  const state = run([
    { type: 'tune', stationId: 'salsoul', attempt: 1 },
    { type: 'tune', stationId: 'solar', attempt: 2 },
    { type: 'audio-error', attempt: 1 },
  ])
  assert.equal(state.status, 'connecting')
  assert.equal(state.stationId, 'solar')
})

test('an error echo while user-paused is dropped', () => {
  const state = run([
    { type: 'tune', stationId: 'salsoul', attempt: 1 },
    { type: 'user-pause' },
    { type: 'audio-error', attempt: 1 },
  ])
  assert.equal(state.status, 'paused')
})

test('a current error while connecting surfaces', () => {
  const state = run([
    { type: 'tune', stationId: 'salsoul', attempt: 1 },
    { type: 'audio-error', attempt: 1 },
  ])
  assert.equal(state.status, 'error')
})

test('connect timeout only fires while still connecting', () => {
  const timedOut = run([
    { type: 'tune', stationId: 'salsoul', attempt: 1 },
    { type: 'connect-timeout', attempt: 1 },
  ])
  assert.equal(timedOut.status, 'error')

  const paused = run([
    { type: 'tune', stationId: 'salsoul', attempt: 1 },
    { type: 'user-pause' },
    { type: 'connect-timeout', attempt: 1 },
  ])
  assert.equal(paused.status, 'paused')

  const stale = run([
    { type: 'tune', stationId: 'salsoul', attempt: 1 },
    { type: 'tune', stationId: 'solar', attempt: 2 },
    { type: 'connect-timeout', attempt: 1 },
  ])
  assert.equal(stale.status, 'connecting')
})

test('rebuffering drops playing back to connecting, not from paused', () => {
  const rebuffering = run([
    { type: 'tune', stationId: 'salsoul', attempt: 1 },
    { type: 'audio-playing', attempt: 1 },
    { type: 'audio-waiting', attempt: 1 },
  ])
  assert.equal(rebuffering.status, 'connecting')

  const paused = run([
    { type: 'tune', stationId: 'salsoul', attempt: 1 },
    { type: 'user-pause' },
    { type: 'audio-waiting', attempt: 1 },
  ])
  assert.equal(paused.status, 'paused')
})

test('user pause holds connecting or playing and nothing else', () => {
  const fromConnecting = run([
    { type: 'tune', stationId: 'salsoul', attempt: 1 },
    { type: 'user-pause' },
  ])
  assert.equal(fromConnecting.status, 'paused')

  const fromIdle = run([{ type: 'user-pause' }])
  assert.equal(fromIdle.status, 'idle')

  const fromError = run([
    { type: 'tune', stationId: 'salsoul', attempt: 1 },
    { type: 'audio-error', attempt: 1 },
    { type: 'user-pause' },
  ])
  assert.equal(fromError.status, 'error')
})

test('an element pause echo of our own tune sequence is dropped', () => {
  const state = run([
    { type: 'tune', stationId: 'salsoul', attempt: 1 },
    { type: 'audio-pause', attempt: 1 },
  ])
  assert.equal(state.status, 'connecting')
})

test('media keys can pause and resume a playing stream', () => {
  const paused = run([
    { type: 'tune', stationId: 'salsoul', attempt: 1 },
    { type: 'audio-playing', attempt: 1 },
    { type: 'audio-pause', attempt: 1 },
  ])
  assert.equal(paused.status, 'paused')

  const resumed = run([{ type: 'audio-playing', attempt: 1 }], paused)
  assert.equal(resumed.status, 'playing')
})

test('stop returns to idle but keeps the tuned channel selected', () => {
  const state = run([
    { type: 'tune', stationId: 'salsoul', attempt: 1 },
    { type: 'audio-playing', attempt: 1 },
    { type: 'stop', attempt: 2 },
  ])
  assert.deepEqual(state, { status: 'idle', stationId: 'salsoul', attempt: 2 })
})

test('restore selects a channel only on a virgin idle state', () => {
  const restored = run([{ type: 'restore', stationId: 'monte-carlo' }])
  assert.deepEqual(restored, {
    status: 'idle',
    stationId: 'monte-carlo',
    attempt: 0,
  })

  const afterStop = run([
    { type: 'tune', stationId: 'salsoul', attempt: 1 },
    { type: 'stop', attempt: 2 },
    { type: 'restore', stationId: 'monte-carlo' },
  ])
  assert.equal(afterStop.stationId, 'salsoul')

  const whilePlaying = run([
    { type: 'tune', stationId: 'salsoul', attempt: 1 },
    { type: 'audio-playing', attempt: 1 },
    { type: 'restore', stationId: 'monte-carlo' },
  ])
  assert.equal(whilePlaying.stationId, 'salsoul')
  assert.equal(whilePlaying.status, 'playing')
})

test('switching channels mid-play reconnects to the new channel', () => {
  const state = run([
    { type: 'tune', stationId: 'salsoul', attempt: 1 },
    { type: 'audio-playing', attempt: 1 },
    { type: 'tune', stationId: 'eurodance', attempt: 2 },
  ])
  assert.deepEqual(state, {
    status: 'connecting',
    stationId: 'eurodance',
    attempt: 2,
  })
})
