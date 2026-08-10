import assert from 'node:assert/strict'
import test from 'node:test'
import { sumBy } from 'es-toolkit'
import {
  createRadioController,
  type RadioAudioElement,
} from './radio-controller.ts'
import type { RadioStation } from './radio-stations.ts'
import type { RadioEvent } from './radio-tuner.ts'

type PlayOutcome = { resolve: () => void; reject: (error: unknown) => void }

type FakeAudio = RadioAudioElement & {
  fire: (name: string) => void
  plays: PlayOutcome[]
  loads: number
  pauses: number
  hlsSupport: string
  listenerCount: () => number
}

const createFakeAudio = (): FakeAudio => {
  const listeners = new Map<string, Set<() => void>>()
  const plays: PlayOutcome[] = []
  const fake: FakeAudio = {
    src: '',
    loads: 0,
    pauses: 0,
    plays,
    hlsSupport: '',
    play() {
      return new Promise<void>((resolve, reject) => {
        plays.push({ resolve, reject })
      })
    },
    pause() {
      fake.pauses += 1
    },
    load() {
      fake.loads += 1
    },
    removeAttribute(name) {
      if (name === 'src') fake.src = ''
    },
    canPlayType(mimeType) {
      return mimeType.toLowerCase().includes('mpegurl') ? fake.hlsSupport : ''
    },
    addEventListener(name, handler) {
      const bucket = listeners.get(name) ?? new Set()
      bucket.add(handler)
      listeners.set(name, bucket)
    },
    removeEventListener(name, handler) {
      listeners.get(name)?.delete(handler)
    },
    fire(name) {
      for (const handler of listeners.get(name) ?? []) handler()
    },
    listenerCount: () =>
      sumBy([...listeners.values()], (bucket) => bucket.size),
  }
  return fake
}

type PendingTimer = { handler: () => void; ms: number; cleared: boolean }

const createManualClock = () => {
  const timers: PendingTimer[] = []
  return {
    timers,
    setTimer: (handler: () => void, ms: number): unknown => {
      const pending: PendingTimer = { handler, ms, cleared: false }
      timers.push(pending)
      return pending
    },
    clearTimer: (handle: unknown) => {
      ;(handle as PendingTimer).cleared = true
    },
    fireLast: () => {
      const pending = timers.at(-1)
      if (pending && !pending.cleared) pending.handler()
    },
  }
}

const station = (
  name: string,
  overrides: Partial<RadioStation> = {},
): RadioStation => ({
  station: name,
  destinationCode: 'CAT',
  stationUuid: null,
  city: null,
  country: 'ES',
  latitude: null,
  longitude: null,
  streamUrl: `https://radio.example/${name}`,
  format: 'MP3',
  bitrateKbps: 128,
  homepage: null,
  directorySource: 'Radio Browser',
  verifiedAt: '2026-07-28T00:00:00.000Z',
  verification: { httpStatus: 200, contentType: 'audio/mpeg', working: true },
  ...overrides,
})

const harness = () => {
  const fake = createFakeAudio()
  const clock = createManualClock()
  const events: RadioEvent[] = []
  const controller = createRadioController({
    audio: () => fake,
    dispatch: (event) => events.push(event),
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
  })
  return { fake, clock, events, controller }
}

const flushMicrotasks = () =>
  new Promise<void>((resolve) => setImmediate(resolve))

test('start loads the stream, plays it and arms the recovery timer', () => {
  const { fake, clock, events, controller } = harness()
  controller.start(station('flaix'), 0)

  assert.equal(fake.src, 'https://radio.example/flaix')
  assert.equal(fake.loads, 1)
  assert.equal(fake.plays.length, 1)
  assert.equal(clock.timers.length, 1)
  assert.equal(clock.timers[0].ms, 12_000)
  assert.deepEqual(events, [{ type: 'start', stationIndex: 0, attempt: 1 }])
})

test('a playing echo clears the timer and reports with its attempt', () => {
  const { fake, clock, events, controller } = harness()
  controller.start(station('flaix'), 0)
  fake.fire('playing')

  assert.equal(clock.timers[0].cleared, true)
  assert.deepEqual(events.at(-1), { type: 'audio-playing', attempt: 1 })
})

test('events from a replaced attempt never reach the reducer', () => {
  const { fake, events, controller } = harness()
  controller.start(station('flaix'), 0)
  const firstAttemptRejection = fake.plays[0]
  controller.start(station('rac1'), 1)
  fake.fire('playing')

  assert.deepEqual(events.at(-1), { type: 'audio-playing', attempt: 2 })

  firstAttemptRejection.reject(new Error('The play() request was interrupted'))
  return flushMicrotasks().then(() => {
    const failures = events.filter((event) => event.type === 'station-failed')
    assert.equal(failures.length, 0)
  })
})

test('a rejected play on the current attempt fails and silences', async () => {
  const { fake, events, controller } = harness()
  controller.start(station('flaix'), 0)
  fake.plays[0].reject(new Error('decode failure'))
  await flushMicrotasks()

  assert.deepEqual(events.at(-1), { type: 'station-failed', attempt: 1 })
  assert.equal(fake.src, '')
  assert.equal(fake.listenerCount(), 0)
})

test('an autoplay block becomes a hold, not a failure', async () => {
  const { fake, clock, events, controller } = harness()
  controller.start(station('flaix'), 0)
  fake.plays[0].reject(new DOMException('blocked', 'NotAllowedError'))
  await flushMicrotasks()

  assert.deepEqual(events.at(-1), { type: 'hold' })
  assert.notEqual(fake.src, '')
  assert.equal(clock.timers[0].cleared, true)
})

test('the recovery timeout silences the element before reporting', () => {
  const { fake, clock, events, controller } = harness()
  controller.start(station('flaix'), 0)
  clock.fireLast()

  assert.equal(fake.src, '')
  assert.equal(fake.listenerCount(), 0)
  assert.deepEqual(events.at(-1), { type: 'station-failed', attempt: 1 })
})

test('a superseded recovery timeout does nothing', () => {
  const { fake, clock, events, controller } = harness()
  controller.start(station('flaix'), 0)
  const firstTimer = clock.timers[0]
  controller.start(station('rac1'), 1)
  firstTimer.cleared = false
  firstTimer.handler()

  assert.equal(fake.src, 'https://radio.example/rac1')
  const failures = events.filter((event) => event.type === 'station-failed')
  assert.equal(failures.length, 0)
})

test('rebuffering re-arms the recovery timer once', () => {
  const { fake, clock, controller } = harness()
  controller.start(station('flaix'), 0)
  fake.fire('playing')
  fake.fire('waiting')
  fake.fire('waiting')

  const live = clock.timers.filter((timer) => !timer.cleared)
  assert.equal(live.length, 1)
})

test('a fetch stall alone never disturbs playback', () => {
  const { fake, clock, events, controller } = harness()
  controller.start(station('flaix'), 0)
  fake.fire('playing')
  const before = events.length
  fake.fire('stalled')

  assert.equal(events.length, before)
  const live = clock.timers.filter((timer) => !timer.cleared)
  assert.equal(live.length, 0)
})

test('a stream that ends reports a station failure', () => {
  const { fake, events, controller } = harness()
  controller.start(station('flaix'), 0)
  fake.fire('playing')
  fake.fire('ended')

  assert.deepEqual(events.at(-1), { type: 'station-failed', attempt: 1 })
})

test('an unplayable hls stream fails fast without loading', () => {
  const { fake, events, controller } = harness()
  controller.start(station('hls-only', { format: 'HLS' }), 0)

  assert.deepEqual(events, [
    { type: 'start', stationIndex: 0, attempt: 1 },
    { type: 'station-failed', attempt: 1 },
  ])
  assert.equal(fake.src, '')
  assert.equal(fake.plays.length, 0)
})

test('an m3u8 url counts as hls whatever the declared format', () => {
  const { fake, controller } = harness()
  controller.start(
    station('sneaky', { streamUrl: 'https://radio.example/live.M3U8' }),
    0,
  )
  assert.equal(fake.src, '')
  assert.equal(fake.plays.length, 0)
})

test('a native hls capable element plays hls streams', () => {
  const { fake, controller } = harness()
  fake.hlsSupport = 'maybe'
  controller.start(station('hls-only', { format: 'HLS' }), 0)

  assert.equal(fake.src, 'https://radio.example/hls-only')
  assert.equal(fake.plays.length, 1)
})

test('hold pauses the element without tearing the stream down', () => {
  const { fake, events, controller } = harness()
  controller.start(station('flaix'), 0)
  fake.fire('playing')
  controller.hold()
  fake.fire('playing')

  assert.equal(fake.pauses >= 2, true)
  assert.notEqual(fake.src, '')
  assert.deepEqual(events.at(-1), { type: 'hold' })
})

test('quiesce silences without reporting', () => {
  const { fake, events, controller } = harness()
  controller.start(station('flaix'), 0)
  controller.quiesce()
  fake.fire('playing')

  assert.equal(fake.src, '')
  assert.equal(fake.listenerCount(), 0)
  assert.deepEqual(events, [{ type: 'start', stationIndex: 0, attempt: 1 }])
})

test('quiesce still silences after the ref detaches on unmount', () => {
  const fake = createFakeAudio()
  const clock = createManualClock()
  let mounted = true
  const controller = createRadioController({
    audio: () => (mounted ? fake : null),
    dispatch: () => {},
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
  })
  controller.start(station('flaix'), 0)
  fake.fire('playing')
  mounted = false
  controller.quiesce()

  assert.equal(fake.src, '')
  assert.equal(fake.pauses >= 2, true)
  assert.equal(fake.listenerCount(), 0)
})

test('a missing element reports the attempt as failed', () => {
  const events: RadioEvent[] = []
  const clock = createManualClock()
  const controller = createRadioController({
    audio: () => null,
    dispatch: (event) => events.push(event),
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
  })
  controller.start(station('flaix'), 0)

  assert.deepEqual(events, [
    { type: 'start', stationIndex: 0, attempt: 1 },
    { type: 'station-failed', attempt: 1 },
  ])
})
