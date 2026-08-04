type EnvelopeSpec = {
  peak: number
  duration: number
  at?: number
  attack?: number
}

export type SfxToneSpec = EnvelopeSpec & {
  from: number
  to?: number
  shape?: OscillatorType
}

export type SfxBurstSpec = EnvelopeSpec & {
  frequency: number
  q: number
}

export type SfxSweepSpec = EnvelopeSpec & {
  from: number
  to: number
  q: number
  ramp?: number
}

export type SfxBedSpec = {
  filter: BiquadFilterType
  frequency: number
  level: number
  fadeIn: number
}

export type SfxBed = { stop: () => void }

// AudioContext arrived prefixed in older WebKit
export const audioContextClass = (): typeof AudioContext | null => {
  if (typeof window === 'undefined') return null
  return (
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext ??
    null
  )
}

export type MasterBusSpec = {
  gain: number
  threshold: number
  knee: number
  ratio: number
  attack: number
  release: number
}

export const createMasterBus = (
  context: AudioContext,
  spec: MasterBusSpec,
): GainNode => {
  const output = context.createGain()
  output.gain.value = spec.gain
  const limiter = context.createDynamicsCompressor()
  limiter.threshold.value = spec.threshold
  limiter.knee.value = spec.knee
  limiter.ratio.value = spec.ratio
  limiter.attack.value = spec.attack
  limiter.release.value = spec.release
  output.connect(limiter).connect(context.destination)
  return output
}

const NOISE_SECONDS = 2

let sharedNoise: AudioBuffer | null = null

// one white-noise buffer for every cue: per-keystroke allocation is the cost this removes
export const noiseBufferFor = (context: AudioContext): AudioBuffer => {
  if (!sharedNoise || sharedNoise.sampleRate !== context.sampleRate) {
    const length = Math.ceil(context.sampleRate * NOISE_SECONDS)
    sharedNoise = context.createBuffer(1, length, context.sampleRate)
    const data = sharedNoise.getChannelData(0)
    for (let index = 0; index < length; index += 1) {
      data[index] = Math.random() * 2 - 1
    }
  }
  return sharedNoise
}

export const noiseSourceFor = (context: AudioContext, seconds: number) => {
  const buffer = noiseBufferFor(context)
  const source = context.createBufferSource()
  source.buffer = buffer
  const offset = Math.random() * Math.max(0, buffer.duration - seconds)
  return { source, offset }
}

export type SfxKit = ReturnType<typeof createSfxKit>

export const createSfxKit = ({
  attack = 0.005,
  destination,
}: {
  attack?: number
  destination?: AudioNode
} = {}) => {
  let audioContext: AudioContext | null = destination
    ? (destination.context as AudioContext)
    : null
  let enabled = true

  const ensure = (): AudioContext | null => {
    if (!enabled) return null
    if (!audioContext) {
      const AudioContextClass = audioContextClass()
      if (!AudioContextClass) return null
      audioContext = new AudioContextClass()
    }
    if (audioContext.state === 'suspended') void audioContext.resume()
    return audioContext
  }

  const envelope = (context: AudioContext, spec: EnvelopeSpec) => {
    const start = context.currentTime + (spec.at ?? 0)
    const gain = context.createGain()
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(
      spec.peak,
      start + (spec.attack ?? attack),
    )
    gain.gain.exponentialRampToValueAtTime(0.0001, start + spec.duration)
    gain.connect(destination ?? context.destination)
    return gain
  }

  const tone = (spec: SfxToneSpec) => {
    const context = ensure()
    if (!context) return
    const start = context.currentTime + (spec.at ?? 0)
    const oscillator = context.createOscillator()
    oscillator.type = spec.shape ?? 'sine'
    oscillator.frequency.setValueAtTime(spec.from, start)
    if (spec.to !== undefined) {
      oscillator.frequency.exponentialRampToValueAtTime(
        spec.to,
        start + spec.duration,
      )
    }
    oscillator.connect(envelope(context, spec))
    oscillator.start(start)
    oscillator.stop(start + spec.duration + 0.05)
  }

  const burst = (spec: SfxBurstSpec) => {
    const context = ensure()
    if (!context) return
    const start = context.currentTime + (spec.at ?? 0)
    const { source, offset } = noiseSourceFor(context, spec.duration)
    const filter = context.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = spec.frequency
    filter.Q.value = spec.q
    source.connect(filter)
    filter.connect(envelope(context, spec))
    source.start(start, offset, spec.duration)
  }

  const sweep = (spec: SfxSweepSpec) => {
    const context = ensure()
    if (!context) return
    const start = context.currentTime + (spec.at ?? 0)
    const { source, offset } = noiseSourceFor(context, spec.duration)
    const filter = context.createBiquadFilter()
    filter.type = 'bandpass'
    filter.Q.value = spec.q
    filter.frequency.setValueAtTime(spec.from, start)
    filter.frequency.exponentialRampToValueAtTime(
      spec.to,
      start + (spec.ramp ?? spec.duration),
    )
    source.connect(filter)
    filter.connect(envelope(context, spec))
    source.start(start, offset, spec.duration)
  }

  const bed = (spec: SfxBedSpec): SfxBed | null => {
    const context = ensure()
    if (!context) return null
    const { source } = noiseSourceFor(context, NOISE_SECONDS)
    source.loop = true
    const filter = context.createBiquadFilter()
    filter.type = spec.filter
    filter.frequency.value = spec.frequency
    const gain = context.createGain()
    gain.gain.setValueAtTime(0.0001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(
      spec.level,
      context.currentTime + spec.fadeIn,
    )
    source.connect(filter)
    filter.connect(gain)
    gain.connect(destination ?? context.destination)
    source.start()
    return {
      stop: () => {
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          context.currentTime + 0.12,
        )
        source.stop(context.currentTime + 0.16)
      },
    }
  }

  const setEnabled = (value: boolean) => {
    enabled = value
  }

  return { bed, burst, ensure, setEnabled, sweep, tone }
}
