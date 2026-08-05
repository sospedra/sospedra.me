import { audioContextClass, noiseSourceFor } from 'services/audio/kit'
import { readLocal, writeLocal } from 'services/storage'
import type { BazaarStallId } from './stalls-manifest'

const SOUND_KEY = 'bazaar-sound'

type AudioBus = { context: AudioContext; master: GainNode }

let bus: AudioBus | null = null
let convolver: ConvolverNode | null = null
let enabled: boolean | null = null

const listeners = new Set<() => void>()

const isEnabled = () => {
  enabled ??= readLocal(SOUND_KEY) === 'on'
  return enabled
}

/* AudioContext must be created inside a user gesture */
const setEnabled = (next: boolean) => {
  enabled = next
  writeLocal(SOUND_KEY, next ? 'on' : 'off')
  if (next) ensure()
  for (const listener of listeners) listener()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const soundPreference = { isEnabled, setEnabled, subscribe }

function ensure(): AudioBus | null {
  if (!bus) {
    const AudioContextClass = audioContextClass()
    if (!AudioContextClass) return null
    const context = new AudioContextClass()
    const master = context.createGain()
    master.gain.value = 0.7
    master.connect(context.destination)
    bus = { context, master }
  }
  if (bus.context.state === 'suspended') void bus.context.resume()
  return bus
}

function reverb({ context, master }: AudioBus): ConvolverNode {
  if (convolver) return convolver
  convolver = context.createConvolver()
  const length = context.sampleRate * 1.6
  const impulse = context.createBuffer(2, length, context.sampleRate)
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel)
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2.8
    }
  }
  convolver.buffer = impulse
  const gain = context.createGain()
  gain.gain.value = 0.5
  convolver.connect(gain).connect(master)
  return convolver
}

type ToneSpec = {
  shape?: OscillatorType
  from?: number
  to?: number
  duration?: number
  peak?: number
  at?: number
  wet?: boolean
}

function tone(spec: ToneSpec) {
  if (!isEnabled()) return
  const active = ensure()
  if (!active) return
  const {
    shape = 'square',
    from = 440,
    to,
    duration = 0.1,
    peak = 0.08,
    at = 0,
    wet,
  } = spec
  const { context, master } = active
  const start = context.currentTime + at
  const oscillator = context.createOscillator()
  oscillator.type = shape
  oscillator.frequency.setValueAtTime(from, start)
  if (to) {
    oscillator.frequency.exponentialRampToValueAtTime(to, start + duration)
  }
  const gain = context.createGain()
  gain.gain.setValueAtTime(peak, start)
  gain.gain.exponentialRampToValueAtTime(0.0008, start + duration)
  oscillator.connect(gain).connect(master)
  if (wet) gain.connect(reverb(active))
  oscillator.start(start)
  oscillator.stop(start + duration + 0.02)
}

type NoiseSpec = {
  duration?: number
  peak?: number
  filter?: BiquadFilterType
  frequency?: number
  q?: number
  at?: number
  wet?: boolean
}

function noise(spec: NoiseSpec) {
  if (!isEnabled()) return
  const active = ensure()
  if (!active) return
  const {
    duration = 0.08,
    peak = 0.1,
    filter: filterType = 'lowpass',
    frequency = 1200,
    q = 1,
    at = 0,
    wet,
  } = spec
  const { context, master } = active
  const start = context.currentTime + at
  const { source, offset } = noiseSourceFor(context, duration)
  const filter = context.createBiquadFilter()
  filter.type = filterType
  filter.frequency.value = frequency
  filter.Q.value = q
  const gain = context.createGain()
  gain.gain.setValueAtTime(peak, start)
  gain.gain.exponentialRampToValueAtTime(0.0008, start + duration)
  source.connect(filter).connect(gain).connect(master)
  if (wet) gain.connect(reverb(active))
  source.start(start, offset, duration)
}

const STALL_SFX: Record<BazaarStallId, () => void> = {
  uses: () => {
    tone({ shape: 'sine', from: 220, to: 55, duration: 0.18, peak: 0.14 })
    noise({ duration: 0.05, peak: 0.07, frequency: 900 })
    tone({ shape: 'sine', from: 162, duration: 0.25, peak: 0.02, at: 0.16 })
  },
  games: () => {
    tone({ from: 660, duration: 0.05, peak: 0.05 })
    tone({ from: 880, duration: 0.05, peak: 0.05, at: 0.06 })
    tone({ from: 587, duration: 0.08, peak: 0.05, at: 0.12 })
  },
  travel: () => {
    tone({ shape: 'sine', from: 1100, to: 1500, duration: 0.07, peak: 0.05 })
    tone({
      shape: 'sine',
      from: 1400,
      to: 900,
      duration: 0.09,
      peak: 0.05,
      at: 0.09,
    })
  },
  manual: () => {
    tone({ shape: 'triangle', from: 1568, duration: 0.12, peak: 0.06 })
    tone({ shape: 'triangle', from: 1662, duration: 0.1, peak: 0.03 })
    tone({
      shape: 'triangle',
      from: 1568,
      duration: 0.18,
      peak: 0.05,
      at: 0.15,
    })
  },
  console: () => {
    noise({ duration: 0.06, peak: 0.22, frequency: 500 })
    tone({ shape: 'sine', from: 150, to: 90, duration: 0.09, peak: 0.14 })
    noise({ duration: 0.04, peak: 0.1, frequency: 700, at: 0.11 })
  },
  w98: () => {
    tone({ shape: 'sine', from: 900, to: 320, duration: 0.08, peak: 0.07 })
    tone({
      shape: 'sine',
      from: 1300,
      to: 600,
      duration: 0.05,
      peak: 0.03,
      at: 0.1,
    })
  },
  talks: () => {
    noise({ duration: 0.03, peak: 0.14, filter: 'highpass', frequency: 2000 })
    tone({
      shape: 'sawtooth',
      from: 300,
      to: 1800,
      duration: 0.16,
      peak: 0.025,
      at: 0.05,
    })
  },
  papers: () => {
    noise({ duration: 0.05, peak: 0.16, frequency: 350 })
    tone({ shape: 'sine', from: 110, duration: 0.06, peak: 0.12 })
    noise({ duration: 0.07, peak: 0.2, frequency: 250, at: 0.12 })
    tone({ shape: 'sine', from: 75, duration: 0.1, peak: 0.16, at: 0.12 })
  },
  map: () => {
    tone({ shape: 'sine', from: 90, to: 60, duration: 0.28, peak: 0.1 })
    tone({ shape: 'triangle', from: 520, duration: 0.06, peak: 0.03, at: 0.06 })
  },
  jukebox: () => {
    tone({ shape: 'triangle', from: 1046, duration: 0.09, peak: 0.05 })
    tone({ shape: 'triangle', from: 784, duration: 0.12, peak: 0.05, at: 0.1 })
    noise({
      duration: 0.04,
      peak: 0.05,
      filter: 'highpass',
      frequency: 2400,
      at: 0.05,
    })
  },
}

let doorBuffer: AudioBuffer | null = null

async function loadDoorBuffer(): Promise<AudioBuffer> {
  if (doorBuffer) return doorBuffer
  const active = ensure()
  if (!active) throw new Error('AudioContext unavailable')
  const response = await fetch('/sounds/door.webm')
  doorBuffer = await active.context.decodeAudioData(
    await response.arrayBuffer(),
  )
  return doorBuffer
}

/* synth fallback if the webm fails to decode (older Safari) */
function doorSynth() {
  noise({ duration: 0.1, peak: 0.12, frequency: 1400, wet: true })
  tone({ from: 700, to: 500, duration: 0.08, peak: 0.035, wet: true })
  tone({
    shape: 'sine',
    from: 75,
    to: 30,
    duration: 0.6,
    peak: 0.35,
    at: 0.22,
    wet: true,
  })
  noise({ duration: 0.18, peak: 0.28, frequency: 220, at: 0.22, wet: true })
  noise({ duration: 0.1, peak: 0.1, frequency: 260, at: 0.5, wet: true })
  tone({
    shape: 'sine',
    from: 60,
    to: 38,
    duration: 0.25,
    peak: 0.1,
    at: 0.5,
    wet: true,
  })
}

function playDoorBuffer(buffer: AudioBuffer) {
  if (!isEnabled()) return
  const active = ensure()
  if (!active) return
  const { context, master } = active
  const source = context.createBufferSource()
  source.buffer = buffer
  const gain = context.createGain()
  gain.gain.value = 0.6
  source.connect(gain).connect(master)
  source.start()
}

function playDoorFile() {
  loadDoorBuffer().then(playDoorBuffer, doorSynth)
}

export const sfx = {
  hover: () => tone({ from: 1200, to: 900, duration: 0.035, peak: 0.035 }),
  click: () => {
    tone({ from: 660, duration: 0.06, peak: 0.06 })
    tone({ from: 990, duration: 0.1, peak: 0.06, at: 0.07 })
  },
  door: () => {
    if (!isEnabled()) return
    playDoorFile()
  },
  bus: () => {
    noise({ duration: 0.03, peak: 0.09, filter: 'highpass', frequency: 3000 })
    noise({
      duration: 0.03,
      peak: 0.09,
      filter: 'highpass',
      frequency: 3000,
      at: 0.09,
    })
    noise({
      duration: 0.04,
      peak: 0.11,
      filter: 'highpass',
      frequency: 2500,
      at: 0.2,
    })
    tone({ shape: 'sine', from: 120, duration: 0.5, peak: 0.025, at: 0.28 })
  },
  stall: (id: BazaarStallId) => STALL_SFX[id](),
}
