export type CimsSfx = {
  resume: () => void
  click: () => void
  travel: () => void
  arrive: () => void
  flightStart: () => void
  flightStop: () => void
  dispose: () => void
}

type Drone = {
  osc: OscillatorNode
  lfo: OscillatorNode
  sub: OscillatorNode
  gain: GainNode
  subGain: GainNode
}

export const createSfx = (): CimsSfx => {
  let ctx: AudioContext | null = null
  let drone: Drone | null = null

  const resume = () => {
    if (!ctx && typeof AudioContext !== 'undefined') ctx = new AudioContext()
    if (ctx && ctx.state === 'suspended') void ctx.resume()
  }

  const blip = (
    f0: number,
    f1: number | null,
    at: number,
    dur: number,
    vol: number,
  ) => {
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(f0, at)
    if (f1) osc.frequency.exponentialRampToValueAtTime(f1, at + dur)
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(vol, at + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur)
    osc.connect(gain).connect(ctx.destination)
    osc.start(at)
    osc.stop(at + dur + 0.02)
  }

  const click = () => {
    if (!ctx) return
    blip(1320, 990, ctx.currentTime, 0.045, 0.09)
  }

  const travel = () => {
    if (!ctx) return
    const t = ctx.currentTime
    blip(980, null, t, 0.07, 0.11)
    blip(1245, null, t + 0.09, 0.07, 0.11)
    blip(980, null, t + 0.24, 0.05, 0.045)
    blip(1245, null, t + 0.33, 0.05, 0.045)
  }

  const arrive = () => {
    if (!ctx) return
    const t = ctx.currentTime
    blip(1245, null, t, 0.055, 0.09)
    blip(830, 620, t + 0.075, 0.1, 0.09)
  }

  const flightStart = () => {
    if (!ctx || drone) return
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.value = 1150
    const gain = ctx.createGain()
    gain.gain.value = 0.014
    const lfo = ctx.createOscillator()
    lfo.type = 'square'
    lfo.frequency.value = 12
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 0.014
    lfo.connect(lfoGain)
    lfoGain.connect(gain.gain)
    const sub = ctx.createOscillator()
    sub.type = 'triangle'
    sub.frequency.value = 140
    const subGain = ctx.createGain()
    subGain.gain.value = 0.02
    osc.connect(gain)
    gain.connect(ctx.destination)
    sub.connect(subGain)
    subGain.connect(ctx.destination)
    osc.start(t)
    lfo.start(t)
    sub.start(t)
    drone = { osc, lfo, sub, gain, subGain }
  }

  const flightStop = () => {
    if (!ctx || !drone) return
    const t = ctx.currentTime
    const active = drone
    drone = null
    active.gain.gain.setValueAtTime(Math.max(active.gain.gain.value, 0.0002), t)
    active.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12)
    active.subGain.gain.setValueAtTime(0.02, t)
    active.subGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15)
    active.osc.stop(t + 0.25)
    active.lfo.stop(t + 0.25)
    active.sub.stop(t + 0.25)
  }

  const dispose = () => {
    flightStop()
    if (ctx) void ctx.close()
    ctx = null
  }

  return { resume, click, travel, arrive, flightStart, flightStop, dispose }
}
