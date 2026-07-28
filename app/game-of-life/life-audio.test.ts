import assert from 'node:assert/strict'
import test from 'node:test'
import { createLifeAudio } from './life-audio.ts'

type AudioFixtureOptions = {
  resume?: () => Promise<void>
  throwDuringGraphSetup?: boolean
}

type AudioFixture = {
  context: AudioContext
  order: string[]
  sourceStarts: number
  closed: boolean
}

type RecordedAudioParam = AudioParam & {
  value: number
}

const audioParam = (value = 0): RecordedAudioParam =>
  ({
    value,
    cancelScheduledValues(this: RecordedAudioParam) {
      return this
    },
    exponentialRampToValueAtTime(this: RecordedAudioParam, nextValue: number) {
      this.value = nextValue
      return this
    },
    setTargetAtTime(this: RecordedAudioParam, nextValue: number) {
      this.value = nextValue
      return this
    },
    setValueAtTime(this: RecordedAudioParam, nextValue: number) {
      this.value = nextValue
      return this
    },
  }) as unknown as RecordedAudioParam

const audioNode = (): AudioNode =>
  ({
    connect(destination: AudioNode) {
      return destination
    },
    disconnect() {},
  }) as unknown as AudioNode

const createAudioFixture = (
  options: AudioFixtureOptions = {},
): AudioFixture => {
  const order: string[] = []
  let sourceStarts = 0
  let closed = false
  let state: AudioContextState = 'suspended'
  const destination = audioNode()

  const context = {
    currentTime: 0,
    destination,
    sampleRate: 1000,
    get state() {
      return state
    },
    close() {
      closed = true
      state = 'closed'
      order.push('close')
      return Promise.resolve()
    },
    createBiquadFilter() {
      return Object.assign(audioNode(), {
        frequency: audioParam(),
        Q: audioParam(),
        type: 'bandpass',
      })
    },
    createBuffer(_channels: number, length: number) {
      return {
        getChannelData: () => new Float32Array(length),
      }
    },
    createBufferSource() {
      return Object.assign(audioNode(), {
        buffer: null,
        loop: false,
        start() {
          sourceStarts += 1
          order.push('source:start')
        },
        stop() {
          order.push('source:stop')
        },
      })
    },
    createDynamicsCompressor() {
      if (options.throwDuringGraphSetup) {
        throw new Error('limiter unavailable')
      }
      return Object.assign(audioNode(), {
        attack: audioParam(),
        knee: audioParam(),
        ratio: audioParam(),
        release: audioParam(),
        threshold: audioParam(),
      })
    },
    createGain() {
      return Object.assign(audioNode(), {
        gain: audioParam(),
      })
    },
    createOscillator() {
      return Object.assign(audioNode(), {
        frequency: audioParam(),
        type: 'triangle',
        start() {
          order.push('oscillator:start')
        },
        stop() {
          order.push('oscillator:stop')
        },
      })
    },
    resume() {
      order.push('resume')
      return options.resume?.() ?? Promise.resolve()
    },
  } as unknown as AudioContext

  return {
    context,
    order,
    get sourceStarts() {
      return sourceStarts
    },
    get closed() {
      return closed
    },
  }
}

test('schedules the first cue before a suspended context finishes resuming', () => {
  const fixture = createAudioFixture({
    resume: () => new Promise<void>(() => undefined),
  })
  const audio = createLifeAudio({
    createContext: () => fixture.context,
  })

  audio.play('key')

  assert.ok(fixture.order.includes('source:start'))
  assert.ok(fixture.order.includes('resume'))
  assert.ok(
    fixture.order.indexOf('source:start') < fixture.order.indexOf('resume'),
  )
  audio.dispose()
})

test('retries resume from the activated pointer-up phase', () => {
  const fixture = createAudioFixture({
    resume: () => new Promise<void>(() => undefined),
  })
  const audio = createLifeAudio({
    createContext: () => fixture.context,
  })

  audio.play('key')
  audio.unlock()

  assert.equal(fixture.order.filter((entry) => entry === 'resume').length, 2)
  audio.dispose()
})

test('rebuilds after graph initialization fails instead of caching a dead output', () => {
  const failed = createAudioFixture({ throwDuringGraphSetup: true })
  const recovered = createAudioFixture()
  const errors: string[] = []
  let attempts = 0
  const audio = createLifeAudio({
    createContext: () => {
      attempts += 1
      return attempts === 1 ? failed.context : recovered.context
    },
    onError: (stage) => errors.push(stage),
  })

  audio.play('key')
  audio.play('key')

  assert.equal(attempts, 2)
  assert.equal(failed.closed, true)
  assert.deepEqual(errors, ['graph initialization failed'])
  assert.equal(recovered.sourceStarts, 1)
  audio.dispose()
})

test('renders a multi-cell stroke with one buffer source', () => {
  const fixture = createAudioFixture()
  const audio = createLifeAudio({
    createContext: () => fixture.context,
  })

  audio.playCells(true, 40)

  assert.equal(fixture.sourceStarts, 1)
  assert.equal(
    fixture.order.filter((entry) => entry === 'oscillator:start').length,
    1,
  )
  audio.dispose()
})
