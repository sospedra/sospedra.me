export type FanfareVariant = 'full' | 'curt'

export type FanfareSpec = {
  destination?: AudioNode
  variant?: FanfareVariant
  volume?: number
}

export type FanfareEvent = {
  at: number
  frequency: number
  duration: number
  ratios: readonly number[]
  octave?: boolean
}

// rhythm and chord voicing measured from the FF7 victory fanfare; the tune is original
const MAJOR = [1, 0.75, 0.625] as const
const PLAGAL = [1, 0.8409, 0.6674] as const

const A4 = 440
const B4 = 493.88
const CS5 = 554.37
const E5 = 659.26

const FULL: readonly FanfareEvent[] = [
  { at: 0.0, frequency: A4, duration: 0.13, ratios: MAJOR },
  { at: 0.157, frequency: A4, duration: 0.13, ratios: MAJOR },
  { at: 0.308, frequency: A4, duration: 0.13, ratios: MAJOR },
  { at: 0.482, frequency: CS5, duration: 0.42, ratios: MAJOR },
  { at: 0.935, frequency: B4, duration: 0.42, ratios: MAJOR },
  { at: 1.397, frequency: E5, duration: 0.45, ratios: MAJOR },
  { at: 1.858, frequency: CS5, duration: 0.26, ratios: MAJOR },
  { at: 2.148, frequency: E5, duration: 0.15, ratios: MAJOR },
  { at: 2.322, frequency: A4, duration: 1.3, ratios: PLAGAL, octave: true },
]

const CURT: readonly FanfareEvent[] = [
  { at: 0.0, frequency: CS5, duration: 0.26, ratios: MAJOR },
  { at: 0.29, frequency: E5, duration: 0.15, ratios: MAJOR },
  { at: 0.464, frequency: A4, duration: 1.1, ratios: PLAGAL, octave: true },
]

const PHRASES = { full: FULL, curt: CURT } satisfies Record<
  FanfareVariant,
  readonly FanfareEvent[]
>

const RELEASE = 0.09
const TAIL = 1.6
const HELD_THRESHOLD = 0.3

export const fanfareEvents = (variant: FanfareVariant) => PHRASES[variant]

export const fanfareDuration = (variant: FanfareVariant): number => {
  const events = PHRASES[variant]
  const last = events[events.length - 1]
  return last.at + last.duration + RELEASE
}

type Sends = {
  dry: GainNode
  wet: GainNode
}

type VoiceSpec = {
  at: number
  frequency: number
  duration: number
  level: number
  vibrato: boolean
}

const createReverb = (context: AudioContext, dry: GainNode): GainNode => {
  const send = context.createGain()
  const delay = context.createDelay(0.3)
  delay.delayTime.value = 0.11
  const damp = context.createBiquadFilter()
  damp.type = 'lowpass'
  damp.frequency.value = 2600
  const feedback = context.createGain()
  feedback.gain.value = 0.32
  const level = context.createGain()
  level.gain.value = 0.22
  send.connect(delay)
  delay.connect(damp).connect(feedback).connect(delay)
  delay.connect(level).connect(dry)
  return send
}

const brassVoice = (context: AudioContext, sends: Sends, spec: VoiceSpec) => {
  const out = context.createGain()
  out.gain.setValueAtTime(0.0001, spec.at)
  out.gain.exponentialRampToValueAtTime(spec.level, spec.at + 0.012)
  out.gain.exponentialRampToValueAtTime(
    spec.level * 0.7,
    spec.at + spec.duration,
  )
  out.gain.exponentialRampToValueAtTime(
    0.0001,
    spec.at + spec.duration + RELEASE,
  )
  out.connect(sends.dry)
  out.connect(sends.wet)

  const blat = context.createBiquadFilter()
  blat.type = 'lowpass'
  blat.Q.value = 1
  blat.frequency.setValueAtTime(500, spec.at)
  blat.frequency.exponentialRampToValueAtTime(2800, spec.at + 0.04)
  blat.frequency.exponentialRampToValueAtTime(
    2100,
    spec.at + Math.max(0.25, spec.duration),
  )
  blat.connect(out)

  const wobble = context.createGain()
  if (spec.vibrato) {
    const lfo = context.createOscillator()
    lfo.frequency.value = 5.6
    wobble.gain.setValueAtTime(0, spec.at)
    wobble.gain.linearRampToValueAtTime(spec.frequency * 0.011, spec.at + 0.35)
    lfo.connect(wobble)
    lfo.start(spec.at)
    lfo.stop(spec.at + spec.duration + 0.1)
  }

  for (const cents of [-7, 7]) {
    const oscillator = context.createOscillator()
    oscillator.type = 'sawtooth'
    oscillator.frequency.value = spec.frequency
    oscillator.detune.value = cents
    if (spec.vibrato) wobble.connect(oscillator.frequency)
    oscillator.connect(blat)
    oscillator.start(spec.at)
    oscillator.stop(spec.at + spec.duration + 0.12)
  }
}

const subTone = (context: AudioContext, sends: Sends, spec: VoiceSpec) => {
  const gain = context.createGain()
  gain.gain.setValueAtTime(0.0001, spec.at)
  gain.gain.exponentialRampToValueAtTime(spec.level, spec.at + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, spec.at + spec.duration)
  gain.connect(sends.dry)
  const oscillator = context.createOscillator()
  oscillator.type = 'triangle'
  oscillator.frequency.setValueAtTime(spec.frequency, spec.at)
  oscillator.connect(gain)
  oscillator.start(spec.at)
  oscillator.stop(spec.at + spec.duration + 0.05)
}

const hit = (
  context: AudioContext,
  sends: Sends,
  at: number,
  event: FanfareEvent,
) => {
  const vibrato = event.duration > HELD_THRESHOLD
  const voice = (frequency: number, level: number) =>
    brassVoice(context, sends, {
      at,
      frequency,
      duration: event.duration,
      level,
      vibrato,
    })
  voice(event.frequency, 0.055)
  voice(event.frequency * event.ratios[1], 0.032)
  voice(event.frequency * event.ratios[2], 0.032)
  if (event.octave) voice(event.frequency * 2, 0.016)
  subTone(context, sends, {
    at,
    frequency: event.frequency / 2,
    duration: event.duration + 0.05,
    level: 0.05,
    vibrato: false,
  })
}

const scheduleTeardown = (context: AudioContext, sends: Sends, at: number) => {
  const sentinel = context.createOscillator()
  const mute = context.createGain()
  mute.gain.value = 0
  sentinel.connect(mute)
  mute.connect(sends.dry)
  sentinel.onended = () => {
    sends.wet.disconnect()
    sends.dry.disconnect()
  }
  sentinel.start(context.currentTime)
  sentinel.stop(at)
}

export const playFanfare = (context: AudioContext, spec: FanfareSpec = {}) => {
  const variant = spec.variant ?? 'full'
  const dry = context.createGain()
  dry.gain.value = 0.8 * (spec.volume ?? 1)
  dry.connect(spec.destination ?? context.destination)
  const sends: Sends = { dry, wet: createReverb(context, dry) }
  const start = context.currentTime + 0.02
  for (const event of PHRASES[variant]) {
    hit(context, sends, start + event.at, event)
  }
  scheduleTeardown(context, sends, start + fanfareDuration(variant) + TAIL)
}
