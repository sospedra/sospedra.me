'use client'

import type React from 'react'
import { audioContextClass, noiseSourceFor } from 'services/audio/kit'
import { tapHaptic } from 'services/haptics'
import css from './sampler.module.css'

type ToneSpec = {
  shape?: OscillatorType
  from?: number
  to?: number
  duration?: number
  peak?: number
  at?: number
}

type NoiseSpec = {
  duration?: number
  peak?: number
  filter?: BiquadFilterType
  frequency?: number
  at?: number
}

/* the market synth gates on the bazaar sound preference; the demo
   runs the same recipes on its own bus so a click always plays */
let bus: { context: AudioContext; master: GainNode } | null = null

const ensure = () => {
  if (!bus) {
    const AudioContextClass = audioContextClass()
    if (!AudioContextClass) return null
    const context = new AudioContextClass()
    const master = context.createGain()
    master.gain.value = 0.7
    master.connect(context.destination)
    bus = { context, master }
  }
  if (bus.context.state === 'suspended') void bus.context.resume()
  return bus
}

// iOS starts the context suspended; schedule only once it actually runs
const armed = async (play: () => void) => {
  const active = ensure()
  if (!active) return
  if (active.context.state === 'suspended') await active.context.resume()
  play()
}

const tone = (spec: ToneSpec) => {
  const active = ensure()
  if (!active) return
  const {
    shape = 'square',
    from = 440,
    to,
    duration = 0.1,
    peak = 0.08,
    at = 0,
  } = spec
  const { context, master } = active
  const start = context.currentTime + at
  const oscillator = context.createOscillator()
  oscillator.type = shape
  oscillator.frequency.setValueAtTime(from, start)
  if (to) {
    oscillator.frequency.exponentialRampToValueAtTime(to, start + duration)
  }
  const gain = context.createGain()
  gain.gain.setValueAtTime(peak, start)
  gain.gain.exponentialRampToValueAtTime(0.0008, start + duration)
  oscillator.connect(gain).connect(master)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.02)
}

const noise = (spec: NoiseSpec) => {
  const active = ensure()
  if (!active) return
  const {
    duration = 0.08,
    peak = 0.1,
    filter: filterType = 'lowpass',
    frequency = 1200,
    at = 0,
  } = spec
  const { context, master } = active
  const start = context.currentTime + at
  const { source, offset } = noiseSourceFor(context, duration)
  const filter = context.createBiquadFilter()
  filter.type = filterType
  filter.frequency.value = frequency
  const gain = context.createGain()
  gain.gain.setValueAtTime(peak, start)
  gain.gain.exponentialRampToValueAtTime(0.0008, start + duration)
  source.connect(filter).connect(gain).connect(master)
  source.start(start, offset, duration)
}

/* recipes copied verbatim from app/bazaar/sounds.ts STALL_SFX */
const STINGS: Array<{ id: string; recipe: string; play: () => void }> = [
  {
    id: 'uses',
    recipe: 'sine 220→55 + sizzle',
    play: () => {
      tone({ shape: 'sine', from: 220, to: 55, duration: 0.18, peak: 0.14 })
      noise({ duration: 0.05, peak: 0.07, frequency: 900 })
      tone({ shape: 'sine', from: 162, duration: 0.25, peak: 0.02, at: 0.16 })
    },
  },
  {
    id: 'papers',
    recipe: 'low noise + sine 110/75',
    play: () => {
      noise({ duration: 0.05, peak: 0.16, frequency: 350 })
      tone({ shape: 'sine', from: 110, duration: 0.06, peak: 0.12 })
      noise({ duration: 0.07, peak: 0.2, frequency: 250, at: 0.12 })
      tone({ shape: 'sine', from: 75, duration: 0.1, peak: 0.16, at: 0.12 })
    },
  },
  {
    id: 'manual',
    recipe: 'triangle 1568 · 1662 · 1568',
    play: () => {
      tone({ shape: 'triangle', from: 1568, duration: 0.12, peak: 0.06 })
      tone({ shape: 'triangle', from: 1662, duration: 0.1, peak: 0.03 })
      tone({
        shape: 'triangle',
        from: 1568,
        duration: 0.18,
        peak: 0.05,
        at: 0.15,
      })
    },
  },
  {
    id: 'console',
    recipe: 'static + sine 150→90',
    play: () => {
      noise({ duration: 0.06, peak: 0.22, frequency: 500 })
      tone({ shape: 'sine', from: 150, to: 90, duration: 0.09, peak: 0.14 })
      noise({ duration: 0.04, peak: 0.1, frequency: 700, at: 0.11 })
    },
  },
  {
    id: 'talks',
    recipe: 'hiss + saw 300→1800',
    play: () => {
      noise({ duration: 0.03, peak: 0.14, filter: 'highpass', frequency: 2000 })
      tone({
        shape: 'sawtooth',
        from: 300,
        to: 1800,
        duration: 0.16,
        peak: 0.025,
        at: 0.05,
      })
    },
  },
  {
    id: 'w98',
    recipe: 'sine 900→320, 1300→600',
    play: () => {
      tone({ shape: 'sine', from: 900, to: 320, duration: 0.08, peak: 0.07 })
      tone({
        shape: 'sine',
        from: 1300,
        to: 600,
        duration: 0.05,
        peak: 0.03,
        at: 0.1,
      })
    },
  },
  {
    id: 'games',
    recipe: 'square 660 · 880 · 587',
    play: () => {
      tone({ from: 660, duration: 0.05, peak: 0.05 })
      tone({ from: 880, duration: 0.05, peak: 0.05, at: 0.06 })
      tone({ from: 587, duration: 0.08, peak: 0.05, at: 0.12 })
    },
  },
  {
    id: 'travel',
    recipe: 'sine 1100→1500, 1400→900',
    play: () => {
      tone({ shape: 'sine', from: 1100, to: 1500, duration: 0.07, peak: 0.05 })
      tone({
        shape: 'sine',
        from: 1400,
        to: 900,
        duration: 0.09,
        peak: 0.05,
        at: 0.09,
      })
    },
  },
  {
    id: 'map',
    recipe: 'sine 90→60 + blip 520',
    play: () => {
      tone({ shape: 'sine', from: 90, to: 60, duration: 0.28, peak: 0.1 })
      tone({
        shape: 'triangle',
        from: 520,
        duration: 0.06,
        peak: 0.03,
        at: 0.06,
      })
    },
  },
  {
    id: 'scavenger',
    recipe: 'rustle 900/2200 + tick',
    play: () => {
      noise({ duration: 0.06, peak: 0.09, frequency: 900 })
      noise({ duration: 0.05, peak: 0.08, frequency: 2200, at: 0.05 })
      tone({ from: 1800, duration: 0.02, peak: 0.025, at: 0.11 })
    },
  },
]

const Sampler: React.FC<{ label: string }> = (props) => (
  <section aria-label={props.label} className={css.sampler}>
    <div className={css.head}>
      <span className={css.label}>{props.label}</span>
      <span className={css.hint}>tap a stall, hear its keeper</span>
    </div>
    <div className={css.grid}>
      {STINGS.map((sting) => (
        <button
          className={css.pad}
          key={sting.id}
          onClick={() => {
            tapHaptic()
            void armed(sting.play)
          }}
          type='button'
        >
          <span className={css.stall}>{sting.id}</span>
          <span className={css.recipe}>{sting.recipe}</span>
        </button>
      ))}
    </div>
  </section>
)

export default Sampler
