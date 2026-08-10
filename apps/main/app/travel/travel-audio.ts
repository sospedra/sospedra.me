import {
  audioContextClass,
  createMasterBus,
  createSfxKit,
  noiseBufferFor,
  type SfxKit,
} from 'services/audio/kit'

type TravelAudioCue =
  | { kind: 'button' }
  | { kind: 'power-off' }
  | { direction: -1 | 1; kind: 'rotary' }

type TravelAudioGraph = {
  context: AudioContext
  kit: SfxKit
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
      graph = {
        context,
        kit: createSfxKit({ attack: 0.002, destination: output }),
        noiseBuffer: noiseBufferFor(context),
        output,
      }
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

  const renderCue = (currentGraph: TravelAudioGraph, cue: TravelAudioCue) => {
    if (cue.kind === 'rotary') {
      currentGraph.kit.burst({
        frequency: 2540 + cue.direction * 120 + Math.random() * 240,
        duration: 0.022,
        peak: 0.065,
        q: 1.2,
      })
      return
    }

    if (cue.kind === 'power-off') {
      currentGraph.kit.burst({
        frequency: 880,
        duration: 0.05,
        peak: 0.1,
        q: 0.9,
      })
      currentGraph.kit.tone({
        from: 240,
        to: 36,
        duration: 0.42,
        peak: 0.15,
        attack: 0.004,
      })
      currentGraph.kit.tone({
        from: 3400,
        to: 900,
        duration: 0.16,
        peak: 0.05,
        shape: 'triangle',
        at: 0.05,
      })
      return
    }

    currentGraph.kit.burst({
      frequency: 980 + Math.random() * 150,
      duration: 0.064,
      peak: 0.13,
      q: 0.72,
    })
    currentGraph.kit.tone({
      from: 205,
      to: 82,
      duration: 0.074,
      peak: 0.07,
      shape: 'triangle',
      attack: 0.003,
    })
  }

  const play = (cue: TravelAudioCue) => {
    const currentGraph = graph ?? createGraph()
    if (!currentGraph) return

    if (currentGraph.context.state === 'running') {
      renderCue(currentGraph, cue)
      return
    }
    if (!hasActiveUserGesture()) return

    if (!pendingCue || cue.kind !== 'rotary') pendingCue = cue
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
    playPowerOff() {
      play({ kind: 'power-off' })
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
