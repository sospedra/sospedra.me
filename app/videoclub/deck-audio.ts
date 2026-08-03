import { createSfxKit, type SfxBed } from 'services/audio/kit'

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
  const kit = createSfxKit({ attack: 0.004 })
  let hiss: SfxBed | null = null
  const fetched: Partial<Record<SampleName, Promise<ArrayBuffer>>> = {}
  const decoded: Partial<Record<SampleName, AudioBuffer>> = {}

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
    const ac = kit.ensure()
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
      kit.tone({ from: 1000, to: 1000, duration, peak: 0.045, attack: 0.02 }),
    powerOn: () => {
      sample('button')
      kit.tone({ from: 45, to: 58, duration: 0.5, peak: 0.06, attack: 0.05 })
      kit.tone({
        from: 320,
        to: 1400,
        duration: 0.35,
        peak: 0.04,
        attack: 0.02,
      })
    },
    powerOff: () => {
      sample('button')
      kit.tone({ from: 110, to: 34, duration: 0.28, peak: 0.12 })
    },
    staticOn: () => {
      hiss ??= kit.bed({
        filter: 'highpass',
        frequency: 1200,
        level: 0.03,
        fadeIn: 0.08,
      })
    },
    staticOff: () => {
      hiss?.stop()
      hiss = null
    },
  }
}
