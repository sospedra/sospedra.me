import assert from 'node:assert/strict'
import test from 'node:test'
import type { RealStation } from './stations.ts'
import type { TunerEvent } from './tuner.ts'
import {
  createTunerController,
  type TunerAudioElement,
} from './tuner-controller.ts'

type PlayOutcome = { resolve: () => void; reject: (error: unknown) => void }

type FakeAudio = TunerAudioElement & {
  fire: (name: string) => void
  plays: PlayOutcome[]
  loads: number
  pauses: number
  listenerCount: () => number
}

const createFakeAudio = (): FakeAudio => {
  const listeners = new Map<string, Set<() => void>>()
  const plays: PlayOutcome[] = []
  const fake: FakeAudio = {
    src: '',
    volume: 1,
    muted: false,
    preload: 'auto',
    loads: 0,
    pauses: 0,
    plays,
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
      [...listeners.values()].reduce((total, bucket) => total + bucket.size, 0),
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

const station = (id: string): RealStation => ({
  id,
  name: id,
  icyName: id,
  streamUrl: `https://radio.example/${id}`,
  format: 'MP3',
  bitrateKbps: 128,
  verifiedAt: '2026-07-28T00:00:00.000Z',
  verification: { httpStatus: 200, contentType: 'audio/mpeg', working: true },
  tagline: '',
  badge: { mark: 'T', bg: '#000', fg: '#fff' },
})

const harness = () => {
  const fake = createFakeAudio()
  const clock = createManualClock()
  const events: TunerEvent[] = []
  const controller = createTunerController({
    createAudio: () => fake,
    dispatch: (event) => events.push(event),
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
  })
  return { fake, clock, events, controller }
}

const flushMicrotasks = () =>
  new Promise<void>((resolve) => setImmediate(resolve))

test('tune loads the stream, plays it and arms the connect timer', () => {
  const { fake, clock, events, controller } = harness()
  controller.tune(station('salsoul'))

  assert.equal(fake.src, 'https://radio.example/salsoul')
  assert.equal(fake.preload, 'none')
  assert.equal(fake.loads, 1)
  assert.equal(fake.plays.length, 1)
  assert.equal(clock.timers.length, 1)
  assert.deepEqual(events, [{ type: 'tune', stationId: 'salsoul', attempt: 1 }])
})

test('a playing echo clears the timer and reports with its session', () => {
  const { fake, clock, events, controller } = harness()
  controller.tune(station('salsoul'))
  fake.fire('playing')

  assert.equal(clock.timers[0].cleared, true)
  assert.deepEqual(events.at(-1), { type: 'audio-playing', attempt: 1 })
})

test('events from a replaced session never reach the reducer', () => {
  const { fake, events, controller } = harness()
  controller.tune(station('salsoul'))
  const firstSessionRejection = fake.plays[0]
  controller.tune(station('solar'))
  fake.fire('playing')

  assert.deepEqual(events.at(-1), { type: 'audio-playing', attempt: 2 })

  firstSessionRejection.reject(new Error('The play() request was interrupted'))
  return flushMicrotasks().then(() => {
    const errors = events.filter((event) => event.type === 'audio-error')
    assert.equal(errors.length, 0)
  })
})

test('a rejected play on the current session reports an error and silences', async () => {
  const { fake, events, controller } = harness()
  controller.tune(station('salsoul'))
  fake.plays[0].reject(new Error('decode failure'))
  await flushMicrotasks()

  assert.deepEqual(events.at(-1), { type: 'audio-error', attempt: 1 })
  assert.equal(fake.src, '')
  assert.equal(fake.listenerCount(), 0)
})

test('an autoplay block becomes a user pause, not an error', async () => {
  const { fake, events, controller } = harness()
  controller.tune(station('salsoul'))
  fake.plays[0].reject(new DOMException('blocked', 'NotAllowedError'))
  await flushMicrotasks()

  assert.deepEqual(events.at(-1), { type: 'user-pause' })
})

test('the connect timeout quiesces the element before reporting', () => {
  const { fake, clock, events, controller } = harness()
  controller.tune(station('salsoul'))
  clock.fireLast()

  assert.equal(fake.src, '')
  assert.equal(fake.listenerCount(), 0)
  assert.deepEqual(events.at(-1), { type: 'connect-timeout', attempt: 1 })
})

test('a superseded connect timeout does nothing', () => {
  const { fake, clock, events, controller } = harness()
  controller.tune(station('salsoul'))
  const firstTimer = clock.timers[0]
  controller.tune(station('solar'))
  firstTimer.cleared = false
  firstTimer.handler()

  assert.equal(fake.src, 'https://radio.example/solar')
  const timeouts = events.filter((event) => event.type === 'connect-timeout')
  assert.equal(timeouts.length, 0)
})

test('rebuffering re-arms the timer once', () => {
  const { fake, clock, controller } = harness()
  controller.tune(station('salsoul'))
  fake.fire('playing')
  fake.fire('waiting')
  fake.fire('waiting')

  const live = clock.timers.filter((timer) => !timer.cleared)
  assert.equal(live.length, 1)
})

test('a fetch stall alone never disturbs playback', () => {
  const { fake, clock, events, controller } = harness()
  controller.tune(station('salsoul'))
  fake.fire('playing')
  const before = events.length
  fake.fire('stalled')

  assert.equal(events.length, before)
  const live = clock.timers.filter((timer) => !timer.cleared)
  assert.equal(live.length, 0)
})

test('a stream that ends reports as an error', () => {
  const { fake, events, controller } = harness()
  controller.tune(station('salsoul'))
  fake.fire('playing')
  fake.fire('ended')

  assert.deepEqual(events.at(-1), { type: 'audio-error', attempt: 1 })
})

test('stop tears the element down and invalidates the session', () => {
  const { fake, events, controller } = harness()
  controller.tune(station('salsoul'))
  controller.stop()
  fake.fire('playing')

  assert.equal(fake.src, '')
  assert.deepEqual(events.at(-1), { type: 'stop', attempt: 2 })
})

test('volume and mute apply on creation and on later changes', () => {
  const { fake, controller } = harness()
  controller.setVolume(0.4)
  controller.setMuted(true)
  controller.tune(station('salsoul'))

  assert.equal(fake.volume, 0.4)
  assert.equal(fake.muted, true)

  controller.setVolume(0.9)
  controller.setMuted(false)
  assert.equal(fake.volume, 0.9)
  assert.equal(fake.muted, false)
})

test('user pause holds the element without tearing it down', () => {
  const { fake, events, controller } = harness()
  controller.tune(station('salsoul'))
  fake.fire('playing')
  controller.pauseUser()

  assert.equal(fake.pauses >= 2, true)
  assert.notEqual(fake.src, '')
  assert.deepEqual(events.at(-1), { type: 'user-pause' })
})

test('dispose silences and forgets the element', () => {
  const { fake, controller } = harness()
  controller.tune(station('salsoul'))
  controller.dispose()

  assert.equal(fake.src, '')
  assert.equal(fake.listenerCount(), 0)
})
