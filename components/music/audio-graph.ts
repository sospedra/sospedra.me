import { clamp } from 'es-toolkit'
import { dbToGain, EQ_FREQUENCIES } from './equalizer.ts'

export type AudioGraphSettings = {
  balance: number
  bands: readonly number[]
  enabled: boolean
  preamp: number
  volume: number
}

export type MusicAudioGraph = {
  analyser: AnalyserNode
  context: AudioContext
  filters: BiquadFilterNode[]
  output: GainNode
  panner: StereoPannerNode
  preamp: GainNode
  source: MediaElementAudioSourceNode
}

export const applyAudioGraphSettings = (
  graph: MusicAudioGraph,
  settings: AudioGraphSettings,
) => {
  const now = graph.context.currentTime

  graph.filters.forEach((filter, index) => {
    const gain = settings.enabled ? (settings.bands[index] ?? 0) : 0
    filter.gain.setTargetAtTime(gain, now, 0.012)
  })

  graph.preamp.gain.setTargetAtTime(
    settings.enabled ? dbToGain(settings.preamp) : 1,
    now,
    0.012,
  )
  graph.panner.pan.setTargetAtTime(clamp(settings.balance, -1, 1), now, 0.012)
  graph.output.gain.setTargetAtTime(clamp(settings.volume, 0, 1), now, 0.012)
}

export const createMusicAudioGraph = (
  context: AudioContext,
  audio: HTMLMediaElement,
): MusicAudioGraph => {
  const source = context.createMediaElementSource(audio)
  const filters = EQ_FREQUENCIES.map((frequency, index) => {
    const filter = context.createBiquadFilter()
    filter.type =
      index === 0
        ? 'lowshelf'
        : index === EQ_FREQUENCIES.length - 1
          ? 'highshelf'
          : 'peaking'
    filter.frequency.value = frequency
    filter.Q.value = 1.1
    return filter
  })
  const preamp = context.createGain()
  const panner = context.createStereoPanner()
  const output = context.createGain()
  const analyser = context.createAnalyser()

  analyser.fftSize = 256
  analyser.smoothingTimeConstant = 0.78

  source.connect(filters[0])
  filters.forEach((filter, index) => {
    const nextFilter = filters[index + 1]
    if (nextFilter) filter.connect(nextFilter)
  })
  filters.at(-1)?.connect(preamp)
  preamp.connect(panner)
  panner.connect(output)
  output.connect(analyser)
  analyser.connect(context.destination)

  return {
    analyser,
    context,
    filters,
    output,
    panner,
    preamp,
    source,
  }
}
