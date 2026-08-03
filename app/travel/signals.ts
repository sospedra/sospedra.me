import type { Region } from './destinations'

type SignalGraph = { context: AudioContext; master: GainNode }

let graph: SignalGraph | null = null

/* AudioContext must be created inside a user gesture */
function ensure(): SignalGraph {
  if (!graph) {
    const context = new AudioContext()
    const master = context.createGain()
    master.gain.value = 0.5
    master.connect(context.destination)
    graph = { context, master }
  }
  if (graph.context.state === 'suspended') void graph.context.resume()
  return graph
}

type ToneSpec = {
  type?: OscillatorType
  frequency: number
  to?: number
  t?: number
  peak?: number
  delay?: number
  attack?: number
}

function tone(spec: ToneSpec) {
  const {
    type = 'sine',
    frequency,
    to,
    t = 0.2,
    peak = 0.05,
    delay = 0,
    attack = 0,
  } = spec
  const { context, master } = ensure()
  const now = context.currentTime + delay
  const oscillator = context.createOscillator()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, now)
  if (to) oscillator.frequency.exponentialRampToValueAtTime(to, now + t)
  const gain = context.createGain()
  gain.gain.setValueAtTime(0.0008, now)
  gain.gain.linearRampToValueAtTime(peak, now + Math.max(attack, 0.004))
  gain.gain.exponentialRampToValueAtTime(0.0008, now + t)
  oscillator.connect(gain).connect(master)
  oscillator.start(now)
  oscillator.stop(now + t + 0.02)
}

function thump(frequency: number, delay: number) {
  const { context, master } = ensure()
  const now = context.currentTime + delay
  const oscillator = context.createOscillator()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, now)
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.4, now + 0.12)
  const gain = context.createGain()
  gain.gain.setValueAtTime(0.11, now)
  gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.14)
  oscillator.connect(gain).connect(master)
  oscillator.start(now)
  oscillator.stop(now + 0.16)
}

/* Each traveler plays their instrument: harmonica, banjo, drums, flute */
const MOTIFS: Record<Region, () => void> = {
  americas: () => {
    tone({
      type: 'sawtooth',
      frequency: 392,
      t: 0.22,
      peak: 0.024,
      attack: 0.05,
    })
    tone({
      type: 'sawtooth',
      frequency: 396,
      t: 0.22,
      peak: 0.014,
      attack: 0.05,
    })
    tone({
      type: 'sawtooth',
      frequency: 494,
      t: 0.22,
      peak: 0.024,
      attack: 0.04,
      delay: 0.2,
    })
    tone({
      type: 'sawtooth',
      frequency: 440,
      t: 0.3,
      peak: 0.022,
      attack: 0.04,
      delay: 0.42,
    })
  },
  europe: () => {
    tone({ type: 'triangle', frequency: 294, t: 0.16, peak: 0.09 })
    tone({ type: 'triangle', frequency: 440, t: 0.16, peak: 0.08, delay: 0.11 })
    tone({ type: 'triangle', frequency: 370, t: 0.26, peak: 0.08, delay: 0.22 })
  },
  africa: () => {
    thump(170, 0)
    thump(150, 0.16)
    thump(210, 0.3)
  },
  asia: () => {
    tone({ frequency: 523, t: 0.28, peak: 0.055, attack: 0.07 })
    tone({ frequency: 587, t: 0.28, peak: 0.055, attack: 0.06, delay: 0.26 })
    tone({ frequency: 659, t: 0.42, peak: 0.05, attack: 0.06, delay: 0.52 })
  },
}

export function playRegionSignal(region: Region) {
  MOTIFS[region]()
}

export function disposeRegionSignals() {
  const closing = graph?.context
  graph = null
  if (closing && closing.state !== 'closed') {
    void closing.close().catch(() => undefined)
  }
}
