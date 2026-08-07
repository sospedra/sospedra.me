import type { Note } from './signal.ts'

export type Synth = {
  play: (note: Note) => void
}

const MASTER_GAIN = 0.5
const LEAD_GAIN = 0.2
const SUB_GAIN = 0.08
const HIT_GAIN = 0.35
const TONE_SECONDS = 0.5
const HIT_SECONDS = 0.18
const ATTACK_SECONDS = 0.004
const RELEASE_FLOOR = 0.001
const VIBRATO_HZ = 6
const VIBRATO_CENTS = 12
const NOISE_SECONDS = 0.25
const HIT_Q = 1.4

type Engine = {
  ctx: AudioContext
  master: GainNode
  noise: AudioBuffer
}

const createNoiseBuffer = (ctx: AudioContext): AudioBuffer => {
  const length = Math.floor(ctx.sampleRate * NOISE_SECONDS)
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let index = 0; index < length; index++) {
    data[index] = Math.random() * 2 - 1
  }
  return buffer
}

const createEngine = (): Engine => {
  const ctx = new AudioContext()
  const master = ctx.createGain()
  master.gain.value = MASTER_GAIN
  const limiter = ctx.createDynamicsCompressor()
  master.connect(limiter)
  limiter.connect(ctx.destination)
  return { ctx, master, noise: createNoiseBuffer(ctx) }
}

const envelope = (
  ctx: AudioContext,
  seconds: number,
  peak: number,
): GainNode => {
  const gain = ctx.createGain()
  const now = ctx.currentTime
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(peak, now + ATTACK_SECONDS)
  gain.gain.exponentialRampToValueAtTime(RELEASE_FLOOR, now + seconds)
  return gain
}

const playTone = ({ ctx, master }: Engine, frequency: number): void => {
  const out = envelope(ctx, TONE_SECONDS, 1)
  out.connect(master)
  const stopAt = ctx.currentTime + TONE_SECONDS + 0.05

  const vibrato = ctx.createOscillator()
  vibrato.frequency.value = VIBRATO_HZ
  const vibratoDepth = ctx.createGain()
  vibratoDepth.gain.value = VIBRATO_CENTS
  vibrato.connect(vibratoDepth)

  const voices = [
    [frequency, LEAD_GAIN],
    [frequency / 2, SUB_GAIN],
  ] as const
  for (const [hz, level] of voices) {
    const osc = ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.value = hz
    vibratoDepth.connect(osc.detune)
    const voice = ctx.createGain()
    voice.gain.value = level
    osc.connect(voice)
    voice.connect(out)
    osc.onended = () => voice.disconnect()
    osc.start()
    osc.stop(stopAt)
  }

  vibrato.onended = () => out.disconnect()
  vibrato.start()
  vibrato.stop(stopAt)
}

const playHit = ({ ctx, master, noise }: Engine, center: number): void => {
  const out = envelope(ctx, HIT_SECONDS, HIT_GAIN)
  out.connect(master)
  const source = ctx.createBufferSource()
  source.buffer = noise
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = center
  filter.Q.value = HIT_Q
  source.connect(filter)
  filter.connect(out)
  source.onended = () => out.disconnect()
  source.start()
  source.stop(ctx.currentTime + HIT_SECONDS + 0.05)
}

export const createSynth = (): Synth => {
  let engine: Engine | null = null

  const ensureEngine = (): Engine => {
    engine ??= createEngine()
    if (engine.ctx.state === 'suspended') void engine.ctx.resume()
    return engine
  }

  return {
    play: (note) => {
      const live = ensureEngine()
      if (note.kind === 'tone') playTone(live, note.frequency)
      else playHit(live, note.center)
    },
  }
}
