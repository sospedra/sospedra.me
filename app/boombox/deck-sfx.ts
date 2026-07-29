'use client'

/* synthesized tape-deck foley; no recorded samples yet */

type Thump = { from: number; to: number; duration: number; peak: number }

export type DeckSfx = ReturnType<typeof createDeckSfx>

export const createDeckSfx = () => {
  let ctx: AudioContext | null = null
  let motor: { source: AudioBufferSourceNode; gain: GainNode } | null = null

  const ensure = (): AudioContext | null => {
    if (typeof window === 'undefined' || typeof AudioContext === 'undefined')
      return null
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  }

  const envelope = (ac: AudioContext, peak: number, duration: number) => {
    const gain = ac.createGain()
    gain.gain.setValueAtTime(0.0001, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(peak, ac.currentTime + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration)
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

  const thump = ({ from, to, duration, peak }: Thump) => {
    const ac = ensure()
    if (!ac) return
    const osc = ac.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(from, ac.currentTime)
    osc.frequency.exponentialRampToValueAtTime(to, ac.currentTime + duration)
    osc.connect(envelope(ac, peak, duration))
    osc.start()
    osc.stop(ac.currentTime + duration + 0.05)
  }

  const snap = (frequency: number, duration: number, peak: number) => {
    const ac = ensure()
    if (!ac) return
    const source = noiseSource(ac, duration)
    const filter = ac.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = frequency
    filter.Q.value = 1.4
    source.connect(filter)
    filter.connect(envelope(ac, peak, duration))
    source.start()
  }

  return {
    /* mechanical key latch: noise snap + case resonance */
    click: () => {
      snap(2600 + Math.random() * 600, 0.06, 0.14)
      thump({ from: 190, to: 70, duration: 0.09, peak: 0.1 })
    },
    /* stop key: heavier, lower, slower */
    clunk: () => {
      snap(1100, 0.09, 0.12)
      thump({ from: 120, to: 42, duration: 0.22, peak: 0.22 })
    },
    /* cassette settling into the bay */
    insert: () => {
      snap(1900, 0.05, 0.08)
      setTimeout(() => snap(1300, 0.07, 0.12), 90)
      setTimeout(
        () => thump({ from: 150, to: 55, duration: 0.28, peak: 0.2 }),
        150,
      )
    },
    /* fast-forward zip for a skipped attempt */
    zip: () => {
      const ac = ensure()
      if (!ac) return
      const source = noiseSource(ac, 0.28)
      const filter = ac.createBiquadFilter()
      filter.type = 'bandpass'
      filter.Q.value = 6
      filter.frequency.setValueAtTime(700, ac.currentTime)
      filter.frequency.exponentialRampToValueAtTime(3400, ac.currentTime + 0.26)
      source.connect(filter)
      filter.connect(envelope(ac, 0.16, 0.28))
      source.start()
    },
    /* transport hiss + head rumble while the tape rolls */
    motorOn: () => {
      const ac = ensure()
      if (!ac || motor) return
      const source = noiseSource(ac, 1)
      source.loop = true
      const filter = ac.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 380
      const gain = ac.createGain()
      gain.gain.setValueAtTime(0.0001, ac.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.022, ac.currentTime + 0.15)
      source.connect(filter)
      filter.connect(gain)
      gain.connect(ac.destination)
      source.start()
      motor = { source, gain }
    },
    motorOff: () => {
      if (!ctx || !motor) return
      const { source, gain } = motor
      motor = null
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12)
      source.stop(ctx.currentTime + 0.16)
    },
  }
}
