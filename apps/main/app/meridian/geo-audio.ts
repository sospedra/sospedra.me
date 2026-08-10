import { playFanfare } from 'services/audio/fanfare'
import { audioContextClass, createMasterBus } from 'services/audio/kit'

export type GeoSound =
  | 'correct'
  | 'incorrect'
  | 'key'
  | 'pass'
  | 'perfect'
  | 'start'
  | 'timeout'

const MASTER_GAIN = 0.82

type AudioGraph = {
  context: AudioContext
  output: GainNode
}

type Note = {
  at: number
  duration: number
  frequency: number
  peak: number
  shape: OscillatorType
  to?: number
}

const CUES: Record<GeoSound, readonly Note[]> = {
  key: [
    {
      at: 0,
      duration: 0.035,
      frequency: 1400,
      peak: 0.03,
      shape: 'square',
      to: 900,
    },
  ],
  start: [
    {
      at: 0,
      duration: 0.07,
      frequency: 420,
      peak: 0.045,
      shape: 'square',
      to: 560,
    },
    {
      at: 0.075,
      duration: 0.1,
      frequency: 630,
      peak: 0.05,
      shape: 'square',
      to: 760,
    },
  ],
  correct: [
    {
      at: 0,
      duration: 0.07,
      frequency: 660,
      peak: 0.055,
      shape: 'square',
      to: 790,
    },
    {
      at: 0.075,
      duration: 0.12,
      frequency: 990,
      peak: 0.06,
      shape: 'square',
      to: 1180,
    },
  ],
  perfect: [
    {
      at: 0,
      duration: 0.06,
      frequency: 660,
      peak: 0.05,
      shape: 'square',
      to: 705,
    },
    {
      at: 0.07,
      duration: 0.06,
      frequency: 880,
      peak: 0.055,
      shape: 'square',
      to: 935,
    },
    {
      at: 0.14,
      duration: 0.07,
      frequency: 1100,
      peak: 0.06,
      shape: 'square',
      to: 1175,
    },
    {
      at: 0.22,
      duration: 0.18,
      frequency: 1320,
      peak: 0.065,
      shape: 'square',
      to: 1580,
    },
  ],
  incorrect: [
    {
      at: 0,
      duration: 0.09,
      frequency: 220,
      peak: 0.05,
      shape: 'sawtooth',
      to: 170,
    },
    {
      at: 0.085,
      duration: 0.13,
      frequency: 145,
      peak: 0.045,
      shape: 'sawtooth',
      to: 92,
    },
  ],
  pass: [
    {
      at: 0,
      duration: 0.07,
      frequency: 440,
      peak: 0.035,
      shape: 'triangle',
      to: 390,
    },
  ],
  timeout: [
    {
      at: 0,
      duration: 0.1,
      frequency: 180,
      peak: 0.05,
      shape: 'square',
      to: 135,
    },
    {
      at: 0.12,
      duration: 0.14,
      frequency: 150,
      peak: 0.045,
      shape: 'square',
      to: 88,
    },
  ],
}

const MASTER_BUS_SETTINGS = {
  gain: MASTER_GAIN,
  threshold: -12,
  knee: 5,
  ratio: 8,
  attack: 0.002,
  release: 0.1,
}

export type GeoAudio = ReturnType<typeof createGeoAudio>

export const createGeoAudio = () => {
  let context: AudioContext | null = null
  let output: GainNode | null = null
  let unlockPromise: Promise<AudioGraph | null> | null = null
  let enabled = true

  const ensureMasterBus = (
    AudioContextClass: NonNullable<ReturnType<typeof audioContextClass>>,
  ) => {
    if (context && context.state !== 'closed') return
    context = new AudioContextClass()
    output = createMasterBus(context, MASTER_BUS_SETTINGS)
  }

  const createGraph = (): AudioGraph | null => {
    if (!enabled || typeof window === 'undefined') return null

    const AudioContextClass = audioContextClass()
    if (!AudioContextClass) return null

    try {
      ensureMasterBus(AudioContextClass)
      return context && output ? { context, output } : null
    } catch {
      return null
    }
  }

  const resumeGraph = (graph: AudioGraph) => {
    if (graph.context.state === 'running') return Promise.resolve(graph)
    if (graph.context.state === 'closed') return Promise.resolve(null)
    if (unlockPromise) return unlockPromise

    const pending = graph.context
      .resume()
      .then(() =>
        graph.context.state === 'running' && graph.context === context
          ? graph
          : null,
      )
      .catch(() => null)
    unlockPromise = pending
    void pending.finally(() => {
      if (unlockPromise === pending) unlockPromise = null
    })
    return pending
  }

  const renderCue = (graph: AudioGraph, cue: GeoSound) => {
    const zero = graph.context.currentTime + 0.008

    for (const note of CUES[cue]) {
      const oscillator = graph.context.createOscillator()
      const envelope = graph.context.createGain()
      const start = zero + note.at
      const end = start + note.duration
      oscillator.type = note.shape
      oscillator.frequency.setValueAtTime(note.frequency, start)
      if (note.to) {
        oscillator.frequency.exponentialRampToValueAtTime(note.to, end)
      }
      envelope.gain.setValueAtTime(0.0001, start)
      envelope.gain.exponentialRampToValueAtTime(note.peak, start + 0.006)
      envelope.gain.exponentialRampToValueAtTime(0.0001, end)
      oscillator.connect(envelope).connect(graph.output)
      oscillator.start(start)
      oscillator.stop(end + 0.02)
    }
  }

  return {
    dispose() {
      const closing = context
      context = null
      output = null
      unlockPromise = null
      if (closing && closing.state !== 'closed') {
        void closing.close().catch(() => undefined)
      }
    },
    play(cue: GeoSound) {
      const graph = createGraph()
      if (!graph) return
      if (graph.context.state === 'running') {
        renderCue(graph, cue)
        return
      }
      void resumeGraph(graph).then((runningGraph) => {
        if (runningGraph && enabled) renderCue(runningGraph, cue)
      })
    },
    fanfare() {
      const graph = createGraph()
      if (!graph) return
      const render = (running: AudioGraph) =>
        playFanfare(running.context, { destination: running.output })
      if (graph.context.state === 'running') {
        render(graph)
        return
      }
      void resumeGraph(graph).then((runningGraph) => {
        if (runningGraph && enabled) render(runningGraph)
      })
    },
    setEnabled(value: boolean) {
      enabled = value
      if (!output || !context || context.state === 'closed') return
      const now = context.currentTime
      output.gain.cancelScheduledValues(now)
      output.gain.setTargetAtTime(value ? MASTER_GAIN : 0.0001, now, 0.01)
      if (value) {
        const graph = createGraph()
        if (graph) void resumeGraph(graph)
      }
    },
  }
}
