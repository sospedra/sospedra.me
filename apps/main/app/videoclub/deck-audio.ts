import { type DeckSampleName, deckSampleUrl } from 'services/audio/deck-samples'
import { createSfxKit, type SfxBed } from 'services/audio/kit'

/* seconds skipped from each recording's head to sync with the visuals */
const SAMPLE_TRIM: Record<DeckSampleName, number> = {
  button: 0.5,
  insert: 0,
}

export type DeckAudio = ReturnType<typeof createDeckAudio>

export const createDeckAudio = () => {
  const kit = createSfxKit({ attack: 0.004 })
  let hiss: SfxBed | null = null
  const fetched: Partial<Record<DeckSampleName, Promise<ArrayBuffer>>> = {}
  const decoded: Partial<Record<DeckSampleName, AudioBuffer>> = {}

  const fetchSample = (name: DeckSampleName): Promise<ArrayBuffer> => {
    fetched[name] ??= fetch(deckSampleUrl(name)).then((response) =>
      response.arrayBuffer(),
    )
    return fetched[name]
  }

  const decodeSample = async (
    context: AudioContext,
    name: DeckSampleName,
  ): Promise<AudioBuffer> => {
    if (decoded[name]) return decoded[name]
    // decodeAudioData detaches its input; hand it a copy
    const bytes = (await fetchSample(name)).slice(0)
    const buffer = await context.decodeAudioData(bytes)
    decoded[name] = buffer
    return buffer
  }

  const playSample = async (name: DeckSampleName, rate = 1) => {
    const context = kit.ensure()
    if (!context) return
    const buffer = await decodeSample(context, name)
    const source = context.createBufferSource()
    source.buffer = buffer
    source.playbackRate.value = rate
    source.connect(context.destination)
    source.start(0, SAMPLE_TRIM[name])
  }

  const sample = (name: DeckSampleName, rate = 1) => {
    playSample(name, rate).catch(() => undefined)
  }

  return {
    // iOS denies AudioContext resume outside a gesture: the insert sample
    // fires from an animation callback, so the gesture must arm the context
    arm: () => {
      const context = kit.ensure()
      if (!context) return
      decodeSample(context, 'insert').catch(() => undefined)
    },
    preload: () => {
      // insert first: it is the longest sample and the first interaction plays it
      for (const name of ['insert', 'button'] as const) {
        fetchSample(name).catch(() => undefined)
      }
    },
    click: () => sample('button', 0.97 + Math.random() * 0.06),
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
