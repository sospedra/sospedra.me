import { audioContextClass } from '../../services/audio/kit.ts'
import type { Phase } from './engine'

export type SoundName = 'key' | 'start' | 'eat' | 'pause' | 'over'

type Note = [frequency: number, at: number, duration: number]

// square waves through a fast envelope: the monophonic piezo register
const TUNES: Record<SoundName, Note[]> = {
  key: [[1245, 0, 0.03]],
  start: [
    [660, 0, 0.07],
    [990, 0.09, 0.12],
  ],
  eat: [
    [880, 0, 0.045],
    [1319, 0.05, 0.06],
  ],
  pause: [[494, 0, 0.06]],
  over: [
    [622, 0, 0.12],
    [466, 0.14, 0.12],
    [311, 0.28, 0.26],
  ],
}

let context: AudioContext | null = null

// first call always rides a user gesture, so autoplay policy lets it run
const ensureContext = () => {
  if (context === null) {
    const AudioContextClass = audioContextClass()
    if (!AudioContextClass) return null
    context = new AudioContextClass()
  }
  if (context.state === 'suspended') void context.resume()
  return context
}

export const play = (name: SoundName) => {
  const audio = ensureContext()
  if (!audio) return
  const zero = audio.currentTime + 0.01
  for (const [frequency, at, duration] of TUNES[name]) {
    const osc = audio.createOscillator()
    const envelope = audio.createGain()
    osc.type = 'square'
    osc.frequency.value = frequency
    envelope.gain.setValueAtTime(0, zero + at)
    envelope.gain.linearRampToValueAtTime(0.045, zero + at + 0.006)
    envelope.gain.setValueAtTime(0.045, zero + at + duration - 0.012)
    envelope.gain.linearRampToValueAtTime(0, zero + at + duration)
    osc.connect(envelope)
    envelope.connect(audio.destination)
    osc.start(zero + at)
    osc.stop(zero + at + duration + 0.02)
  }
}

type Snapshot = { phase: Phase; score: number }

export const transitionSound = (
  prev: Snapshot,
  next: Snapshot,
): SoundName | null => {
  if (prev.phase === next.phase) {
    return next.score > prev.score ? 'eat' : null
  }
  if (next.phase === 'over') return 'over'
  if (next.phase === 'paused' || prev.phase === 'paused') return 'pause'
  if (next.phase === 'running') return 'start'
  // the remaining moves walk the menu family: menu, level, tops
  return 'key'
}
