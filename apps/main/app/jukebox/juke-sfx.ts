import { audioContextClass } from 'services/audio/kit'
import { soundPreference } from '../bazaar/sounds'

const BPM = 150
const BEAT = 60 / BPM
const STEP = BEAT / 2
const BAR = BEAT * 4

export const TEMPO = { bpm: BPM, step: STEP, bar: BAR, barMs: BAR * 1000 }

type Graph = {
  context: AudioContext
  master: GainNode
  noiseBuffer: AudioBuffer
  analyserNode: AnalyserNode
}

let graph: Graph | null = null

function makeImpulse(
  context: AudioContext,
  seconds: number,
  decay: number,
): AudioBuffer {
  const length = Math.floor(context.sampleRate * seconds)
  const buffer = context.createBuffer(2, length, context.sampleRate)
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel)
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** decay
    }
  }
  return buffer
}

function makeNoiseBuffer(context: AudioContext): AudioBuffer {
  const length = Math.floor(context.sampleRate * 0.25)
  const buffer = context.createBuffer(1, length, context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i += 1) {
    data[i] = Math.random() * 2 - 1
  }
  return buffer
}

function buildGraph(context: AudioContext): Graph {
  const master = context.createGain()
  master.gain.value = 1
  const dry = context.createGain()
  dry.gain.value = 0.8
  const wet = context.createGain()
  wet.gain.value = 0.3
  const convolver = context.createConvolver()
  // synthesized impulse response, not a loaded sample
  convolver.buffer = makeImpulse(context, 0.2, 2.8)
  master.connect(dry)
  dry.connect(context.destination)
  master.connect(convolver)
  convolver.connect(wet)
  wet.connect(context.destination)

  const analyserNode = context.createAnalyser()
  analyserNode.fftSize = 1024
  master.connect(analyserNode)

  const noiseBuffer = makeNoiseBuffer(context)

  return { context, master, noiseBuffer, analyserNode }
}

function ensure(): void {
  if (!soundPreference.isEnabled()) return
  if (graph && graph.context.state === 'suspended') void graph.context.resume()
  if (graph) return
  const AudioContextClass = audioContextClass()
  if (!AudioContextClass) return
  graph = buildGraph(new AudioContextClass())
}

type EnvelopeSpec = {
  t0: number
  attack: number
  peak: number
  duration: number
}

function envelope(
  gain: GainNode,
  { t0, attack, peak, duration }: EnvelopeSpec,
): void {
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.linearRampToValueAtTime(peak, t0 + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
}

type BlipSpec = {
  freq: number
  t0: number
  duration: number
  type: OscillatorType
  peak: number
}

function blip({ freq, t0, duration, type, peak }: BlipSpec): void {
  if (!graph) return
  const oscillator = graph.context.createOscillator()
  const gain = graph.context.createGain()
  oscillator.type = type
  oscillator.frequency.value = freq
  envelope(gain, { t0, attack: 0.005, peak, duration })
  oscillator.connect(gain).connect(graph.master)
  oscillator.start(t0)
  oscillator.stop(t0 + duration + 0.05)
}

type NoiseBurstSpec = {
  t0: number
  duration: number
  peak: number
  frequency: number
  type?: BiquadFilterType
}

function noiseBurst({
  t0,
  duration,
  peak,
  frequency,
  type = 'lowpass',
}: NoiseBurstSpec): void {
  if (!graph) return
  const source = graph.context.createBufferSource()
  source.buffer = graph.noiseBuffer
  const filter = graph.context.createBiquadFilter()
  filter.type = type
  filter.frequency.value = frequency
  const gain = graph.context.createGain()
  envelope(gain, { t0, attack: 0.003, peak, duration })
  source.connect(filter)
  filter.connect(gain)
  gain.connect(graph.master)
  source.start(t0)
  source.stop(t0 + duration + 0.05)
}

function tick(): void {
  if (!soundPreference.isEnabled()) return
  if (!graph) return
  noiseBurst({
    t0: graph.context.currentTime,
    duration: 0.03,
    peak: 0.07,
    frequency: 3200,
    type: 'highpass',
  })
}

function thump(): void {
  if (!soundPreference.isEnabled()) return
  if (!graph) return
  const t = graph.context.currentTime
  const oscillator = graph.context.createOscillator()
  const gain = graph.context.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(140, t)
  oscillator.frequency.exponentialRampToValueAtTime(45, t + 0.12)
  envelope(gain, { t0: t, attack: 0.004, peak: 0.5, duration: 0.16 })
  oscillator.connect(gain).connect(graph.master)
  oscillator.start(t)
  oscillator.stop(t + 0.2)
  noiseBurst({ t0: t, duration: 0.07, peak: 0.18, frequency: 900 })
}

function whoosh(): void {
  if (!soundPreference.isEnabled()) return
  if (!graph) return
  noiseBurst({
    t0: graph.context.currentTime,
    duration: 0.28,
    peak: 0.08,
    frequency: 1100,
  })
}

function clack(): void {
  if (!soundPreference.isEnabled()) return
  if (!graph) return
  const t = graph.context.currentTime
  const oscillator = graph.context.createOscillator()
  const gain = graph.context.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(300, t)
  oscillator.frequency.exponentialRampToValueAtTime(110, t + 0.07)
  envelope(gain, { t0: t, attack: 0.003, peak: 0.3, duration: 0.09 })
  oscillator.connect(gain).connect(graph.master)
  oscillator.start(t)
  oscillator.stop(t + 0.12)
  noiseBurst({
    t0: t,
    duration: 0.04,
    peak: 0.12,
    frequency: 1800,
    type: 'bandpass',
  })
}

function buzz(): void {
  if (!soundPreference.isEnabled()) return
  if (!graph) return
  blip({
    freq: 92,
    t0: graph.context.currentTime,
    duration: 0.16,
    type: 'square',
    peak: 0.12,
  })
}

function crackle(seconds = 0.3): void {
  if (!soundPreference.isEnabled()) return
  if (!graph) return
  const t = graph.context.currentTime
  const bursts = Math.floor(seconds * 14)
  for (let i = 0; i < bursts; i += 1) {
    noiseBurst({
      t0: t + Math.random() * seconds,
      duration: 0.02,
      peak: 0.02 + Math.random() * 0.05,
      frequency: 2500,
      type: 'highpass',
    })
  }
}

function bar(): void {
  if (!soundPreference.isEnabled()) return
  if (!graph) return
  const t = graph.context.currentTime + 0.03
  const lead = [523.25, 659.25, 784, 987.77, 1046.5, 784, 659.25, 784]
  for (const [index, freq] of lead.entries()) {
    blip({
      freq,
      t0: t + index * TEMPO.step,
      duration: TEMPO.step * 0.85,
      type: 'square',
      peak: 0.1,
    })
  }
  const bass = [
    [130.81, 0],
    [130.81, 2],
    [98, 4],
    [130.81, 6],
  ] as const
  for (const [freq, beat] of bass) {
    blip({
      freq,
      t0: t + beat * TEMPO.step,
      duration: TEMPO.step * 1.7,
      type: 'triangle',
      peak: 0.16,
    })
  }
  for (let i = 0; i < 8; i += 1) {
    noiseBurst({
      t0: t + i * TEMPO.step + TEMPO.step / 2,
      duration: TEMPO.step * 0.15,
      peak: 0.03,
      frequency: 6000,
      type: 'highpass',
    })
  }
}

function analyser(): AnalyserNode | null {
  if (!soundPreference.isEnabled()) return null
  return graph?.analyserNode ?? null
}

export const jukeSfx = {
  ensure,
  tick,
  buzz,
  thump,
  whoosh,
  clack,
  crackle,
  bar,
  analyser,
}
