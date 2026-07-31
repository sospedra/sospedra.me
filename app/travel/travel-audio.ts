import {
  audioContextClass,
  createMasterBus,
  noiseBufferFor,
} from 'service/audio/kit'

type TravelAudioCue = { kind: 'button' } | { direction: -1 | 1; kind: 'rotary' }

type TravelAudioGraph = {
  context: AudioContext
  noiseBuffer: AudioBuffer
  output: GainNode
}

type ReceiverStatic = {
  source: AudioBufferSourceNode
  highpass: BiquadFilterNode
  lowpass: BiquadFilterNode
  gain: GainNode
}

const ROTARY_CUE_INTERVAL_MS = 28

const hasActiveUserGesture = () => {
  if (typeof navigator === 'undefined') return false
  const activation = navigator.userActivation
  return !activation || activation.isActive
}

export type TravelAudio = ReturnType<typeof createTravelAudio>

export const createTravelAudio = () => {
  let context: AudioContext | null = null
  let graph: TravelAudioGraph | null = null
  let resumePromise: Promise<TravelAudioGraph | null> | null = null
  let pendingCue: TravelAudioCue | null = null
  let lastRotaryCueAt = 0
  let receiverStatic: ReceiverStatic | null = null

  const createGraph = (): TravelAudioGraph | null => {
    if (typeof window === 'undefined' || !hasActiveUserGesture()) return null
    if (graph && graph.context.state !== 'closed') return graph

    const AudioContextClass = audioContextClass()
    if (!AudioContextClass) return null

    try {
      context = new AudioContextClass({ latencyHint: 'interactive' })
      const output = createMasterBus(context, {
        gain: 0.66,
        threshold: -12,
        knee: 7,
        ratio: 8,
        attack: 0.002,
        release: 0.08,
      })
      graph = { context, noiseBuffer: noiseBufferFor(context), output }
      return graph
    } catch {
      context = null
      graph = null
      return null
    }
  }

  const resumeGraph = (currentGraph: TravelAudioGraph) => {
    if (currentGraph.context.state === 'running') {
      return Promise.resolve(currentGraph)
    }
    if (currentGraph.context.state === 'closed' || !hasActiveUserGesture()) {
      return Promise.resolve(null)
    }
    if (resumePromise) return resumePromise

    const pending = currentGraph.context
      .resume()
      .then(() =>
        currentGraph.context.state === 'running' &&
        currentGraph.context === context
          ? currentGraph
          : null,
      )
      .catch(() => null)
    resumePromise = pending
    void pending.finally(() => {
      if (resumePromise === pending) resumePromise = null
    })
    return pending
  }

  const noise = (
    currentGraph: TravelAudioGraph,
    frequency: number,
    duration: number,
    peak: number,
    q: number,
    startAt: number,
  ) => {
    const { context: audioContext, noiseBuffer, output } = currentGraph
    const source = audioContext.createBufferSource()
    const filter = audioContext.createBiquadFilter()
    const gain = audioContext.createGain()
    const offset = Math.random() * Math.max(0, noiseBuffer.duration - duration)

    source.buffer = noiseBuffer
    filter.type = 'bandpass'
    filter.frequency.value = frequency
    filter.Q.value = q
    gain.gain.setValueAtTime(0.0001, startAt)
    gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.002)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
    source.connect(filter).connect(gain).connect(output)
    source.start(startAt, offset, duration)
    source.stop(startAt + duration + 0.01)
  }

  const tone = (
    currentGraph: TravelAudioGraph,
    from: number,
    to: number,
    duration: number,
    peak: number,
    startAt: number,
  ) => {
    const { context: audioContext, output } = currentGraph
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()

    oscillator.type = 'triangle'
    oscillator.frequency.setValueAtTime(from, startAt)
    oscillator.frequency.exponentialRampToValueAtTime(to, startAt + duration)
    gain.gain.setValueAtTime(0.0001, startAt)
    gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.003)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
    oscillator.connect(gain).connect(output)
    oscillator.start(startAt)
    oscillator.stop(startAt + duration + 0.01)
  }

  const renderCue = (currentGraph: TravelAudioGraph, cue: TravelAudioCue) => {
    const start = currentGraph.context.currentTime

    if (cue.kind === 'rotary') {
      const directionOffset = cue.direction * 120
      noise(
        currentGraph,
        2540 + directionOffset + Math.random() * 240,
        0.022,
        0.065,
        1.2,
        start,
      )
      return
    }

    noise(currentGraph, 980 + Math.random() * 150, 0.064, 0.13, 0.72, start)
    tone(currentGraph, 205, 82, 0.074, 0.07, start)
  }

  const play = (cue: TravelAudioCue) => {
    const currentGraph = graph ?? createGraph()
    if (!currentGraph) return

    if (currentGraph.context.state === 'running') {
      renderCue(currentGraph, cue)
      return
    }
    if (!hasActiveUserGesture()) return

    if (!pendingCue || cue.kind === 'button') pendingCue = cue
    void resumeGraph(currentGraph).then((runningGraph) => {
      if (!runningGraph || !pendingCue) return
      const cueToRender = pendingCue
      pendingCue = null
      renderCue(runningGraph, cueToRender)
    })
  }

  const startReceiverStatic = () => {
    const currentGraph = graph
    if (!currentGraph) return
    if (currentGraph.context.state === 'closed' || receiverStatic) return

    const { context: audioContext, noiseBuffer, output } = currentGraph
    const source = audioContext.createBufferSource()
    const highpass = audioContext.createBiquadFilter()
    const lowpass = audioContext.createBiquadFilter()
    const gain = audioContext.createGain()

    source.buffer = noiseBuffer
    source.loop = true
    highpass.type = 'highpass'
    highpass.frequency.value = 950
    highpass.Q.value = 0.45
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 6800
    lowpass.Q.value = 0.35
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(
      0.035,
      audioContext.currentTime + 0.08,
    )
    source.connect(highpass).connect(lowpass).connect(gain).connect(output)
    source.start()
    receiverStatic = { source, highpass, lowpass, gain }
  }

  const stopReceiverStatic = () => {
    if (!graph || !receiverStatic) return
    const { context: audioContext } = graph
    const { source, highpass, lowpass, gain } = receiverStatic
    receiverStatic = null
    const now = audioContext.currentTime

    gain.gain.cancelScheduledValues(now)
    gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)
    source.stop(now + 0.16)
    source.addEventListener(
      'ended',
      () => {
        source.disconnect()
        highpass.disconnect()
        lowpass.disconnect()
        gain.disconnect()
      },
      { once: true },
    )
  }

  return {
    /**
     * Call on pointer down or key down before a continuous knob interaction.
     * The graph is created only while browser user activation is active.
     */
    arm() {
      const currentGraph = graph ?? createGraph()
      if (currentGraph) void resumeGraph(currentGraph)
    },
    dispose() {
      stopReceiverStatic()
      const closing = context
      context = null
      graph = null
      resumePromise = null
      pendingCue = null
      lastRotaryCueAt = 0
      if (closing && closing.state !== 'closed') {
        void closing.close().catch(() => undefined)
      }
    },
    playButtonPress() {
      play({ kind: 'button' })
    },
    playRotaryTick(direction: -1 | 1 = 1) {
      const now = performance.now()
      if (now - lastRotaryCueAt < ROTARY_CUE_INTERVAL_MS) return
      lastRotaryCueAt = now
      play({ direction, kind: 'rotary' })
    },
    startReceiverStatic,
    stopReceiverStatic,
  }
}
