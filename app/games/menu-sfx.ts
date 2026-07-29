'use client'

/* synthesized PS2 browser foley; no recorded samples */

type Envelope = { peak: number; duration: number; attack?: number }
type Chime = Envelope & { from: number; to?: number; type?: OscillatorType }
type Breath = Envelope & { from: number; to: number }

export type MenuSfx = ReturnType<typeof createMenuSfx>

export const createMenuSfx = () => {
  let ctx: AudioContext | null = null

  const ensure = (): AudioContext | null => {
    if (typeof window === 'undefined' || typeof AudioContext === 'undefined')
      return null
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  }

  const envelope = (ac: AudioContext, shape: Envelope) => {
    const { peak, duration, attack = 0.006 } = shape
    const gain = ac.createGain()
    gain.gain.setValueAtTime(0.0001, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(peak, ac.currentTime + attack)
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration)
    gain.connect(ac.destination)
    return gain
  }

  const chime = (ac: AudioContext, shape: Chime) => {
    const { from, to, duration, type = 'sine' } = shape
    const osc = ac.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(from, ac.currentTime)
    if (to)
      osc.frequency.exponentialRampToValueAtTime(to, ac.currentTime + duration)
    osc.connect(envelope(ac, shape))
    osc.start()
    osc.stop(ac.currentTime + duration + 0.05)
  }

  const breath = (ac: AudioContext, shape: Breath) => {
    const { from, to, duration } = shape
    const length = Math.ceil(ac.sampleRate * duration)
    const buffer = ac.createBuffer(1, length, ac.sampleRate)
    buffer
      .getChannelData(0)
      .set(Float32Array.from({ length }, () => Math.random() * 2 - 1))
    const source = ac.createBufferSource()
    source.buffer = buffer
    const filter = ac.createBiquadFilter()
    filter.type = 'bandpass'
    filter.Q.value = 2.2
    filter.frequency.setValueAtTime(from, ac.currentTime)
    filter.frequency.exponentialRampToValueAtTime(to, ac.currentTime + duration)
    source.connect(filter)
    filter.connect(envelope(ac, shape))
    source.start()
  }

  return {
    /* selection move: short glassy tick */
    tick: () => {
      const ac = ensure()
      if (!ac) return
      chime(ac, { from: 1244, to: 932, duration: 0.07, peak: 0.055 })
      chime(ac, { from: 2489, duration: 0.045, peak: 0.028 })
    },
    /* × accept: rising sweep with a bell tail */
    confirm: () => {
      const ac = ensure()
      if (!ac) return
      breath(ac, { from: 900, to: 4200, duration: 0.22, peak: 0.04 })
      chime(ac, { from: 622, to: 1245, duration: 0.16, peak: 0.075 })
      chime(ac, { from: 1867, duration: 0.34, peak: 0.05, attack: 0.03 })
    },
    /* ○ back: the same voice falling away */
    cancel: () => {
      const ac = ensure()
      if (!ac) return
      chime(ac, {
        from: 932,
        to: 415,
        duration: 0.18,
        peak: 0.07,
        type: 'triangle',
      })
      chime(ac, { from: 466, duration: 0.12, peak: 0.045 })
    },
    /* menu materialize: airy swell, only when audio is already unlocked */
    reveal: () => {
      if (!navigator.userActivation?.hasBeenActive) return
      const ac = ensure()
      if (ac?.state !== 'running') return
      breath(ac, {
        from: 480,
        to: 2600,
        duration: 0.55,
        peak: 0.038,
        attack: 0.12,
      })
      chime(ac, { from: 1568, duration: 0.7, peak: 0.03, attack: 0.09 })
      chime(ac, { from: 784, duration: 0.55, peak: 0.024, attack: 0.12 })
    },
  }
}
