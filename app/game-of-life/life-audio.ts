import { audioContextClass, createMasterBus } from '../../services/audio/kit.ts'
import { createLogger } from '../../services/logger.ts'
import {
  createMotor,
  type Motor,
  rampMotorDown,
  tuneMotor,
} from './life-motor.ts'

export type LifeMechanicalSound =
  | 'cartridge'
  | 'key'
  | 'knob'
  | 'lever'
  | 'switch'

const logger = createLogger('game-of-life.audio')

const RESUME_RETRY_MS = 100

type AudioGraph = {
  context: AudioContext
  output: GainNode
}

export type LifeAudio = ReturnType<typeof createLifeAudio>

export type LifeAudioOptions = {
  createContext?: () => AudioContext | null
  onError?: (stage: string, error: unknown) => void
}

export const createLifeAudio = (options: LifeAudioOptions = {}) => {
  let context: AudioContext | null = null
  let output: GainNode | null = null
  let motor: Motor | null = null
  let enabled = true
  let shouldRun = false
  let lastKnobCue = 0
  let lastResumeAttempt = 0
  let nextCellCueAt = 0

  const createContext = () => {
    if (options.createContext) return options.createContext()
    const AudioContextClass = audioContextClass()
    return AudioContextClass ? new AudioContextClass() : null
  }

  const reportError = (stage: string, error: unknown) => {
    if (options.onError) {
      options.onError(stage, error)
      return
    }
    logger.warn(stage, { error })
  }

  const createGraph = (): AudioGraph | null => {
    if (!enabled) return null
    if (context && output && context.state !== 'closed') {
      return { context, output }
    }

    context = null
    output = null
    let nextContext: AudioContext | null = null
    try {
      nextContext = createContext()
      if (!nextContext) return null

      const nextOutput = createMasterBus(nextContext, {
        gain: 0.88,
        threshold: -10,
        knee: 8,
        ratio: 8,
        attack: 0.002,
        release: 0.12,
      })

      context = nextContext
      output = nextOutput
      nextCellCueAt = nextContext.currentTime
      lastResumeAttempt = 0
      return { context: nextContext, output: nextOutput }
    } catch (error) {
      const failedContext = nextContext
      if (failedContext && failedContext.state !== 'closed') {
        void failedContext.close().catch(() => undefined)
      }
      reportError('graph initialization failed', error)
      return null
    }
  }

  const requestResume = (audioContext: AudioContext, force = false) => {
    if (
      audioContext.state === 'running' ||
      audioContext.state === 'closed' ||
      audioContext !== context
    ) {
      return
    }

    const now = performance.now()
    const throttled =
      lastResumeAttempt !== 0 && now - lastResumeAttempt < RESUME_RETRY_MS
    if (!force && throttled) return
    lastResumeAttempt = now

    try {
      void audioContext.resume().then(
        () => {
          if (
            audioContext === context &&
            audioContext.state !== 'running' &&
            audioContext.state !== 'closed'
          ) {
            reportError(
              'context did not enter running state',
              new Error(`AudioContext state is ${audioContext.state}`),
            )
          }
        },
        (error) => reportError('context resume failed', error),
      )
    } catch (error) {
      reportError('context resume failed', error)
    }
  }

  const withAudioGraph = (render: (graph: AudioGraph) => void) => {
    const graph = createGraph()
    if (!graph) return

    try {
      // Schedule while still inside the trusted interaction. Suspended
      // contexts retain the source and begin it when resume succeeds.
      render(graph)
    } catch (error) {
      reportError('cue render failed', error)
    }
    requestResume(graph.context)
  }

  const envelope = (
    graph: AudioGraph,
    peak: number,
    duration: number,
    attack = 0.003,
    startAt?: number,
  ) => {
    const { context: audioContext, output: destination } = graph
    const gain = audioContext.createGain()
    const start = startAt ?? audioContext.currentTime
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(peak, start + attack)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    gain.connect(destination)
    return gain
  }

  const noise = (
    graph: AudioGraph,
    frequency: number,
    duration: number,
    peak: number,
    q = 0.8,
    startAt?: number,
  ) => {
    const { context: audioContext } = graph
    const start = startAt ?? audioContext.currentTime
    const length = Math.ceil(audioContext.sampleRate * duration)
    const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate)
    const data = buffer.getChannelData(0)
    for (let index = 0; index < data.length; index += 1) {
      data[index] =
        (Math.random() * 2 - 1) * (1 - index / Math.max(1, data.length))
    }

    const source = audioContext.createBufferSource()
    const filter = audioContext.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = frequency
    filter.Q.value = q
    source.buffer = buffer
    source
      .connect(filter)
      .connect(
        envelope(graph, peak, duration, Math.min(0.004, duration / 3), start),
      )
    source.start(start)
  }

  const tone = (
    graph: AudioGraph,
    from: number,
    to: number,
    duration: number,
    peak: number,
    shape: OscillatorType = 'triangle',
    startAt?: number,
  ) => {
    const { context: audioContext } = graph
    const oscillator = audioContext.createOscillator()
    const start = startAt ?? audioContext.currentTime
    oscillator.type = shape
    oscillator.frequency.setValueAtTime(from, start)
    oscillator.frequency.exponentialRampToValueAtTime(to, start + duration)
    oscillator.connect(envelope(graph, peak, duration, 0.003, start))
    oscillator.start(start)
    oscillator.stop(start + duration + 0.02)
  }

  const cellSequence = (
    graph: AudioGraph,
    alive: boolean,
    requestedCount: number,
  ) => {
    const count = Math.max(0, Math.floor(requestedCount))
    if (count === 0) return

    const { context: audioContext, output: destination } = graph
    const spacing = 0.01
    const noiseDuration = alive ? 0.007 : 0.009
    const start = Math.max(audioContext.currentTime, nextCellCueAt)
    const sequenceDuration = (count - 1) * spacing + noiseDuration
    const frameCount = Math.max(
      1,
      Math.ceil(audioContext.sampleRate * sequenceDuration),
    )
    const buffer = audioContext.createBuffer(
      1,
      frameCount,
      audioContext.sampleRate,
    )
    const data = buffer.getChannelData(0)

    for (let index = 0; index < data.length; index += 1) {
      const time = index / audioContext.sampleRate
      const cue = Math.floor(time / spacing)
      const phase = time - cue * spacing
      data[index] =
        cue < count && phase < noiseDuration
          ? (Math.random() * 2 - 1) * (1 - phase / noiseDuration)
          : 0
    }

    const source = audioContext.createBufferSource()
    const filter = audioContext.createBiquadFilter()
    const noiseGain = audioContext.createGain()
    const oscillator = audioContext.createOscillator()
    const toneGain = audioContext.createGain()
    const tonePeak = alive ? 0.018 : 0.024
    const toneDuration = alive ? 0.008 : 0.009

    source.buffer = buffer
    filter.type = 'bandpass'
    filter.frequency.value = alive ? 2980 : 470
    filter.Q.value = alive ? 1.3 : 0.65
    noiseGain.gain.value = alive ? 0.038 : 0.046
    oscillator.type = alive ? 'square' : 'triangle'
    toneGain.gain.setValueAtTime(0.0001, start)

    for (let index = 0; index < count; index += 1) {
      const cueStart = start + index * spacing
      const from = alive ? 540 : 200
      const to = alive ? 950 : 76
      toneGain.gain.setValueAtTime(0.0001, cueStart)
      toneGain.gain.exponentialRampToValueAtTime(tonePeak, cueStart + 0.0015)
      toneGain.gain.exponentialRampToValueAtTime(
        0.0001,
        cueStart + toneDuration,
      )
      oscillator.frequency.setValueAtTime(from, cueStart)
      oscillator.frequency.exponentialRampToValueAtTime(
        to,
        cueStart + toneDuration,
      )
    }

    source.connect(filter).connect(noiseGain).connect(destination)
    oscillator.connect(toneGain).connect(destination)
    source.start(start)
    oscillator.start(start)
    oscillator.stop(start + sequenceDuration + 0.02)
    nextCellCueAt = start + count * spacing
  }

  const stopMotor = (immediate = false) => {
    if (!context || !motor) return
    const current = motor
    motor = null
    rampMotorDown(context, current, immediate)
  }

  const setMotorSpeed = (speed: number) => {
    if (!context || !motor) return
    tuneMotor(context, motor, speed)
  }

  const startMotor = (graph: AudioGraph, speed: number) => {
    if (motor) {
      setMotorSpeed(speed)
      return
    }

    motor = createMotor(graph.context, graph.output, speed)
  }

  const cues: Record<LifeMechanicalSound, (graph: AudioGraph) => void> = {
    cartridge: (graph) => {
      noise(graph, 520, 0.09, 0.16, 0.65)
      tone(graph, 180, 65, 0.1, 0.09)
    },
    key: (graph) => {
      noise(graph, 1800 + Math.random() * 420, 0.035, 0.14, 0.8)
      tone(graph, 240, 105, 0.05, 0.065)
    },
    knob: (graph) => {
      noise(graph, 2600 + Math.random() * 350, 0.026, 0.08, 1.05)
    },
    lever: (graph) => {
      noise(graph, 900, 0.08, 0.16, 0.7)
      tone(graph, 220, 90, 0.085, 0.09)
    },
    switch: (graph) => {
      noise(graph, 680, 0.095, 0.19, 0.65)
      tone(graph, 230, 70, 0.11, 0.12)
    },
  }

  return {
    dispose() {
      shouldRun = false
      stopMotor(true)
      const closing = context
      context = null
      output = null
      lastResumeAttempt = 0
      nextCellCueAt = 0
      if (closing && closing.state !== 'closed') {
        void closing.close().catch(() => undefined)
      }
    },
    play(kind: LifeMechanicalSound) {
      if (kind === 'knob') {
        const now = performance.now()
        if (now - lastKnobCue < 34) return
        lastKnobCue = now
      }

      withAudioGraph(cues[kind])
    },
    playCells(alive: boolean, count = 1) {
      withAudioGraph((graph) => cellSequence(graph, alive, count))
    },
    setEnabled(value: boolean) {
      enabled = value
      if (context && output && context.state !== 'closed') {
        const now = context.currentTime
        output.gain.cancelScheduledValues(now)
        output.gain.setValueAtTime(enabled ? 0.88 : 0.0001, now)
      }
      if (!enabled) stopMotor()
    },
    setRunning(value: boolean, speed: number) {
      shouldRun = value
      if (!value) {
        stopMotor()
        return
      }
      withAudioGraph((graph) => {
        if (shouldRun) startMotor(graph, speed)
      })
    },
    setSpeed(speed: number) {
      setMotorSpeed(speed)
    },
    unlock() {
      const graph = createGraph()
      if (graph) requestResume(graph.context, true)
    },
  }
}
