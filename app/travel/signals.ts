import type { Region } from './destinations'

let ac: AudioContext | null = null
let master: GainNode | null = null

/* AudioContext must be created inside a user gesture */
function ensure(): AudioContext {
  if (!ac) {
    ac = new AudioContext()
    master = ac.createGain()
    master.gain.value = 0.5
    master.connect(ac.destination)
  }
  if (ac.state === 'suspended') void ac.resume()
  return ac
}

type ToneSpec = {
  type?: OscillatorType
  f: number
  to?: number
  t?: number
  g?: number
  delay?: number
  attack?: number
}

function tone(spec: ToneSpec) {
  const {
    type = 'sine',
    f,
    to,
    t = 0.2,
    g = 0.05,
    delay = 0,
    attack = 0,
  } = spec
  const c = ensure()
  const now = c.currentTime + delay
  const osc = c.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(f, now)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, now + t)
  const gain = c.createGain()
  gain.gain.setValueAtTime(0.0008, now)
  gain.gain.linearRampToValueAtTime(g, now + Math.max(attack, 0.004))
  gain.gain.exponentialRampToValueAtTime(0.0008, now + t)
  osc.connect(gain).connect(master as GainNode)
  osc.start(now)
  osc.stop(now + t + 0.02)
}

function thump(f: number, delay: number) {
  const c = ensure()
  const now = c.currentTime + delay
  const osc = c.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(f, now)
  osc.frequency.exponentialRampToValueAtTime(f * 0.4, now + 0.12)
  const gain = c.createGain()
  gain.gain.setValueAtTime(0.11, now)
  gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.14)
  osc.connect(gain).connect(master as GainNode)
  osc.start(now)
  osc.stop(now + 0.16)
}

/* Each traveler plays their instrument: harmonica, banjo, drums, flute */
const MOTIFS: Record<Region, () => void> = {
  americas: () => {
    tone({ type: 'sawtooth', f: 392, t: 0.22, g: 0.024, attack: 0.05 })
    tone({ type: 'sawtooth', f: 396, t: 0.22, g: 0.014, attack: 0.05 })
    tone({
      type: 'sawtooth',
      f: 494,
      t: 0.22,
      g: 0.024,
      attack: 0.04,
      delay: 0.2,
    })
    tone({
      type: 'sawtooth',
      f: 440,
      t: 0.3,
      g: 0.022,
      attack: 0.04,
      delay: 0.42,
    })
  },
  europe: () => {
    tone({ type: 'triangle', f: 294, t: 0.16, g: 0.09 })
    tone({ type: 'triangle', f: 440, t: 0.16, g: 0.08, delay: 0.11 })
    tone({ type: 'triangle', f: 370, t: 0.26, g: 0.08, delay: 0.22 })
  },
  africa: () => {
    thump(170, 0)
    thump(150, 0.16)
    thump(210, 0.3)
  },
  asia: () => {
    tone({ f: 523, t: 0.28, g: 0.055, attack: 0.07 })
    tone({ f: 587, t: 0.28, g: 0.055, attack: 0.06, delay: 0.26 })
    tone({ f: 659, t: 0.42, g: 0.05, attack: 0.06, delay: 0.52 })
  },
}

export function playRegionSignal(region: Region) {
  MOTIFS[region]()
}

export function disposeRegionSignals() {
  const closing = ac
  ac = null
  master = null
  if (closing && closing.state !== 'closed') {
    void closing.close().catch(() => undefined)
  }
}
