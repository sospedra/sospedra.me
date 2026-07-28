type ToneSpec = {
  from: number
  to: number
  duration: number
  peak: number
  shape?: OscillatorType
  attack?: number
}

const SAMPLE_URLS = {
  button: '/talks/sfx/button',
  insert: '/talks/sfx/vhs-insert',
} as const

type SampleName = keyof typeof SAMPLE_URLS

/* seconds skipped from each recording's head to sync with the visuals */
const SAMPLE_TRIM: Record<SampleName, number> = {
  button: 0.5,
  insert: 1,
}

const sampleExtension = (): string => {
  if (typeof document === 'undefined') return 'm4a'
  const probe = document.createElement('audio')
  return probe.canPlayType('audio/ogg; codecs=opus') ? 'opus' : 'm4a'
}

export type DeckAudio = ReturnType<typeof createDeckAudio>

export const createDeckAudio = () => {
  let ctx: AudioContext | null = null
  let hiss: { source: AudioBufferSourceNode; gain: GainNode } | null = null
  const fetched: Partial<Record<SampleName, Promise<ArrayBuffer>>> = {}
  const decoded: Partial<Record<SampleName, AudioBuffer>> = {}

  const ensure = (): AudioContext | null => {
    if (typeof window === 'undefined' || typeof AudioContext === 'undefined')
      return null
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  }

  const fetchSample = (name: SampleName): Promise<ArrayBuffer> => {
    fetched[name] ??= fetch(`${SAMPLE_URLS[name]}.${sampleExtension()}`).then(
      (response) => response.arrayBuffer(),
    )
    return fetched[name]
  }

  const decodeSample = async (
    ac: AudioContext,
    name: SampleName,
  ): Promise<AudioBuffer> => {
    if (decoded[name]) return decoded[name]
    // decodeAudioData detaches its input; hand it a copy
    const bytes = (await fetchSample(name)).slice(0)
    const buffer = await ac.decodeAudioData(bytes)
    decoded[name] = buffer
    return buffer
  }

  const playSample = async (name: SampleName, rate = 1) => {
    const ac = ensure()
    if (!ac) return
    const buffer = await decodeSample(ac, name)
    const source = ac.createBufferSource()
    source.buffer = buffer
    source.playbackRate.value = rate
    source.connect(ac.destination)
    source.start(0, SAMPLE_TRIM[name])
  }

  const sample = (name: SampleName, rate = 1) => {
    playSample(name, rate).catch(() => undefined)
  }

  const envelope = (
    ac: AudioContext,
    {
      peak,
      duration,
      attack = 0.004,
    }: Pick<ToneSpec, 'peak' | 'duration' | 'attack'>,
  ) => {
    const gain = ac.createGain()
    gain.gain.setValueAtTime(0.0001, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(peak, ac.currentTime + attack)
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration)
    gain.connect(ac.destination)
    return gain
  }

  const noiseSource = (ac: AudioContext, seconds: number) => {
    const length = Math.ceil(ac.sampleRate * seconds)
    const buffer = ac.createBuffer(1, length, ac.sampleRate)
    buffer
      .getChannelData(0)
      .set(Float32Array.from({ length }, () => Math.random() * 2 - 1))
    const source = ac.createBufferSource()
    source.buffer = buffer
    return source
  }

  const tone = (spec: ToneSpec) => {
    const ac = ensure()
    if (!ac) return
    const osc = ac.createOscillator()
    osc.type = spec.shape ?? 'sine'
    osc.frequency.setValueAtTime(spec.from, ac.currentTime)
    osc.frequency.exponentialRampToValueAtTime(
      spec.to,
      ac.currentTime + spec.duration,
    )
    osc.connect(envelope(ac, spec))
    osc.start()
    osc.stop(ac.currentTime + spec.duration + 0.05)
  }

  return {
    /* warm the sample cache before the first press needs it */
    preload: () => {
      for (const name of Object.keys(SAMPLE_URLS) as SampleName[]) {
        fetchSample(name).catch(() => undefined)
      }
    },
    /* recorded deck button, pitch-wobbled so repeats read as distinct */
    click: () => sample('button', 0.97 + Math.random() * 0.06),
    /* recorded cassette load: push, mechanism grab, settle */
    insert: () => sample('insert'),
    /* SMPTE color bars ship with a 1 kHz reference tone */
    beep: (duration: number) =>
      tone({ from: 1000, to: 1000, duration, peak: 0.045, attack: 0.02 }),
    powerOn: () => {
      sample('button')
      tone({ from: 45, to: 58, duration: 0.5, peak: 0.06, attack: 0.05 })
      tone({ from: 320, to: 1400, duration: 0.35, peak: 0.04, attack: 0.02 })
    },
    powerOff: () => {
      sample('button')
      tone({ from: 110, to: 34, duration: 0.28, peak: 0.12 })
    },
    staticOn: () => {
      const ac = ensure()
      if (!ac || hiss) return
      const source = noiseSource(ac, 1)
      source.loop = true
      const filter = ac.createBiquadFilter()
      filter.type = 'highpass'
      filter.frequency.value = 1200
      const gain = ac.createGain()
      gain.gain.setValueAtTime(0.0001, ac.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.03, ac.currentTime + 0.08)
      source.connect(filter)
      filter.connect(gain)
      gain.connect(ac.destination)
      source.start()
      hiss = { source, gain }
    },
    staticOff: () => {
      if (!ctx || !hiss) return
      const { source, gain } = hiss
      hiss = null
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12)
      source.stop(ctx.currentTime + 0.16)
    },
  }
}
