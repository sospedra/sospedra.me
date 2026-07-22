type ToneSpec = {
  from: number
  to: number
  duration: number
  peak: number
  shape?: OscillatorType
  at?: number
}

type BurstSpec = {
  freq: number
  duration: number
  peak: number
  q?: number
}

type EnvelopeSpec = {
  peak: number
  duration: number
  at?: number
}

export type SweepAudio = ReturnType<typeof createSweepAudio>

export const createSweepAudio = () => {
  let ctx: AudioContext | null = null
  let enabled = true

  const ensure = (): AudioContext | null => {
    if (!enabled || typeof window === 'undefined') return null
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  }

  const envelope = (ac: AudioContext, spec: EnvelopeSpec) => {
    const start = ac.currentTime + (spec.at ?? 0)
    const gain = ac.createGain()
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(spec.peak, start + 0.004)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + spec.duration)
    gain.connect(ac.destination)
    return gain
  }

  const noiseSource = (ac: AudioContext, seconds: number) => {
    const length = Math.ceil(ac.sampleRate * seconds)
    const buffer = ac.createBuffer(1, length, ac.sampleRate)
    buffer
      .getChannelData(0)
      .set(Float32Array.from({ length }, () => Math.random() * 2 - 1))
    const source = ac.createBufferSource()
    source.buffer = buffer
    return source
  }

  const tone = (spec: ToneSpec) => {
    const ac = ensure()
    if (!ac) return
    const start = ac.currentTime + (spec.at ?? 0)
    const osc = ac.createOscillator()
    osc.type = spec.shape ?? 'square'
    osc.frequency.setValueAtTime(spec.from, start)
    osc.frequency.exponentialRampToValueAtTime(spec.to, start + spec.duration)
    osc.connect(
      envelope(ac, { peak: spec.peak, duration: spec.duration, at: spec.at }),
    )
    osc.start(start)
    osc.stop(start + spec.duration + 0.05)
  }

  const burst = (spec: BurstSpec) => {
    const ac = ensure()
    if (!ac) return
    const source = noiseSource(ac, spec.duration)
    const filter = ac.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = spec.freq
    filter.Q.value = spec.q ?? 0.9
    source.connect(filter)
    filter.connect(envelope(ac, { peak: spec.peak, duration: spec.duration }))
    source.start()
  }

  return {
    setEnabled(value: boolean) {
      enabled = value
    },
    // a dry tick per swept cell
    sweep() {
      tone({ from: 1500, to: 950, duration: 0.04, peak: 0.045 })
    },
    flagOn() {
      tone({
        from: 620,
        to: 1240,
        duration: 0.07,
        peak: 0.06,
        shape: 'triangle',
      })
    },
    flagOff() {
      tone({
        from: 1240,
        to: 620,
        duration: 0.07,
        peak: 0.05,
        shape: 'triangle',
      })
    },
    // manual redeals only: resize redeals stay silent
    deal() {
      burst({ freq: 320, duration: 0.09, peak: 0.05, q: 1.2 })
    },
    boom() {
      burst({ freq: 140, duration: 0.55, peak: 0.28, q: 0.6 })
      tone({ from: 170, to: 42, duration: 0.45, peak: 0.22, shape: 'sine' })
    },
    win() {
      tone({
        from: 880,
        to: 880,
        duration: 0.12,
        peak: 0.07,
        shape: 'triangle',
      })
      tone({
        at: 0.1,
        from: 1109,
        to: 1109,
        duration: 0.12,
        peak: 0.07,
        shape: 'triangle',
      })
      tone({
        at: 0.2,
        from: 1319,
        to: 1319,
        duration: 0.2,
        peak: 0.08,
        shape: 'triangle',
      })
    },
  }
}
