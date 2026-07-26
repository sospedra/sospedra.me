export type StallId =
  | 'uses'
  | 'games'
  | 'travel'
  | 'manual'
  | 'serve'
  | 'projects'
  | 'talks'
  | 'papers'

let ac: AudioContext | null = null
let master: GainNode | null = null
let verb: ConvolverNode | null = null
let enabled = false

export function soundEnabled() {
  return enabled
}

/* AudioContext must be created inside a user gesture */
export function setSoundEnabled(next: boolean) {
  enabled = next
  if (next) ensure()
}

function ensure(): AudioContext {
  if (!ac) {
    ac = new AudioContext()
    master = ac.createGain()
    master.gain.value = 0.7
    master.connect(ac.destination)
  }
  if (ac.state === 'suspended') void ac.resume()
  return ac
}

/* convolver fed a generated decaying-noise impulse: procedural reverb */
function reverb(): ConvolverNode {
  if (verb) return verb
  const c = ensure()
  verb = c.createConvolver()
  const len = c.sampleRate * 1.6
  const ir = c.createBuffer(2, len, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch)
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.8
    }
  }
  verb.buffer = ir
  const gain = c.createGain()
  gain.gain.value = 0.5
  verb.connect(gain).connect(master as GainNode)
  return verb
}

type ToneSpec = {
  type?: OscillatorType
  f?: number
  to?: number
  t?: number
  g?: number
  delay?: number
  wet?: boolean
}

function tone(spec: ToneSpec) {
  if (!enabled) return
  const {
    type = 'square',
    f = 440,
    to,
    t = 0.1,
    g = 0.08,
    delay = 0,
    wet,
  } = spec
  const c = ensure()
  const now = c.currentTime + delay
  const osc = c.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(f, now)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, now + t)
  const gain = c.createGain()
  gain.gain.setValueAtTime(g, now)
  gain.gain.exponentialRampToValueAtTime(0.0008, now + t)
  osc.connect(gain).connect(master as GainNode)
  if (wet) gain.connect(reverb())
  osc.start(now)
  osc.stop(now + t + 0.02)
}

type NoiseSpec = {
  t?: number
  g?: number
  type?: BiquadFilterType
  f?: number
  q?: number
  delay?: number
  wet?: boolean
}

function noise(spec: NoiseSpec) {
  if (!enabled) return
  const {
    t = 0.08,
    g = 0.1,
    type = 'lowpass',
    f = 1200,
    q = 1,
    delay = 0,
    wet,
  } = spec
  const c = ensure()
  const now = c.currentTime + delay
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * t) + 1, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  const filter = c.createBiquadFilter()
  filter.type = type
  filter.frequency.value = f
  filter.Q.value = q
  const gain = c.createGain()
  gain.gain.setValueAtTime(g, now)
  gain.gain.exponentialRampToValueAtTime(0.0008, now + t)
  src
    .connect(filter)
    .connect(gain)
    .connect(master as GainNode)
  if (wet) gain.connect(reverb())
  src.start(now)
}

const STALL_SFX: Record<StallId, () => void> = {
  uses: () => {
    tone({ type: 'sine', f: 220, to: 55, t: 0.18, g: 0.14 })
    noise({ t: 0.05, g: 0.07, f: 900 })
    tone({ type: 'sine', f: 162, t: 0.25, g: 0.02, delay: 0.16 })
  },
  games: () => {
    tone({ f: 660, t: 0.05, g: 0.05 })
    tone({ f: 880, t: 0.05, g: 0.05, delay: 0.06 })
    tone({ f: 587, t: 0.08, g: 0.05, delay: 0.12 })
  },
  travel: () => {
    tone({ type: 'sine', f: 1100, to: 1500, t: 0.07, g: 0.05 })
    tone({ type: 'sine', f: 1400, to: 900, t: 0.09, g: 0.05, delay: 0.09 })
  },
  manual: () => {
    tone({ type: 'triangle', f: 1568, t: 0.12, g: 0.06 })
    tone({ type: 'triangle', f: 1662, t: 0.1, g: 0.03 })
    tone({ type: 'triangle', f: 1568, t: 0.18, g: 0.05, delay: 0.15 })
  },
  serve: () => {
    noise({ t: 0.06, g: 0.22, f: 500 })
    tone({ type: 'sine', f: 150, to: 90, t: 0.09, g: 0.14 })
    noise({ t: 0.04, g: 0.1, f: 700, delay: 0.11 })
  },
  projects: () => {
    tone({ type: 'sine', f: 900, to: 320, t: 0.08, g: 0.07 })
    tone({ type: 'sine', f: 1300, to: 600, t: 0.05, g: 0.03, delay: 0.1 })
  },
  talks: () => {
    noise({ t: 0.03, g: 0.14, type: 'highpass', f: 2000 })
    tone({ type: 'sawtooth', f: 300, to: 1800, t: 0.16, g: 0.025, delay: 0.05 })
  },
  papers: () => {
    noise({ t: 0.05, g: 0.16, f: 350 })
    tone({ type: 'sine', f: 110, t: 0.06, g: 0.12 })
    noise({ t: 0.07, g: 0.2, f: 250, delay: 0.12 })
    tone({ type: 'sine', f: 75, t: 0.1, g: 0.16, delay: 0.12 })
  },
}

let doorBuffer: AudioBuffer | null = null

async function loadDoorBuffer(): Promise<AudioBuffer> {
  if (doorBuffer) return doorBuffer
  const c = ensure()
  const res = await fetch('/sounds/door.webm')
  doorBuffer = await c.decodeAudioData(await res.arrayBuffer())
  return doorBuffer
}

/* synth fallback if the webm fails to decode (older Safari) */
function doorSynth() {
  noise({ t: 0.1, g: 0.12, f: 1400, wet: true })
  tone({ f: 700, to: 500, t: 0.08, g: 0.035, wet: true })
  tone({ type: 'sine', f: 75, to: 30, t: 0.6, g: 0.35, delay: 0.22, wet: true })
  noise({ t: 0.18, g: 0.28, f: 220, delay: 0.22, wet: true })
  noise({ t: 0.1, g: 0.1, f: 260, delay: 0.5, wet: true })
  tone({ type: 'sine', f: 60, to: 38, t: 0.25, g: 0.1, delay: 0.5, wet: true })
}

function playDoorFile() {
  loadDoorBuffer()
    .then((buffer) => {
      if (!enabled) return
      const c = ensure()
      const src = c.createBufferSource()
      src.buffer = buffer
      const gain = c.createGain()
      gain.gain.value = 0.6
      src.connect(gain).connect(master as GainNode)
      src.start()
    })
    .catch(doorSynth)
}

export const sfx = {
  hover: () => tone({ f: 1200, to: 900, t: 0.035, g: 0.035 }),
  click: () => {
    tone({ f: 660, t: 0.06, g: 0.06 })
    tone({ f: 990, t: 0.1, g: 0.06, delay: 0.07 })
  },
  floor: () => {
    noise({ t: 0.12, g: 0.2, f: 400 })
    tone({ type: 'sine', f: 90, to: 55, t: 0.16, g: 0.14 })
  },
  door: () => {
    if (!enabled) return
    playDoorFile()
  },
  bus: () => {
    noise({ t: 0.03, g: 0.09, type: 'highpass', f: 3000 })
    noise({ t: 0.03, g: 0.09, type: 'highpass', f: 3000, delay: 0.09 })
    noise({ t: 0.04, g: 0.11, type: 'highpass', f: 2500, delay: 0.2 })
    tone({ type: 'sine', f: 120, t: 0.5, g: 0.025, delay: 0.28 })
  },
  sign: () => {
    tone({ type: 'sawtooth', f: 140, t: 0.05, g: 0.04 })
    noise({ t: 0.04, g: 0.05, type: 'highpass', f: 4000, delay: 0.06 })
  },
  stall: (id: StallId) => STALL_SFX[id](),
}
