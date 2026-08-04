import { once } from 'es-toolkit'
import { audioContextClass } from '../../services/audio/kit.ts'
import { readLocal, writeLocal } from '../../services/storage.ts'
import type { Phase } from './engine'

const SOUND_KEY = 'midnight-io:snake-sound'
let mutedFlag: boolean | null = null

export const isMuted = () => {
  if (typeof window === 'undefined') return false
  mutedFlag ??= readLocal(SOUND_KEY) === 'off'
  return mutedFlag
}

export const setMuted = (muted: boolean) => {
  mutedFlag = muted
  writeLocal(SOUND_KEY, muted ? 'off' : 'on')
}

export type SoundName = 'key' | 'start' | 'eat' | 'pause' | 'over'

type Note = [frequency: number, at: number, duration: number]

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

// first call always rides a user gesture, so autoplay policy lets it run
const createContext = once((): AudioContext | null => {
  const AudioContextClass = audioContextClass()
  return AudioContextClass ? new AudioContextClass() : null
})

const ensureContext = () => {
  const context = createContext()
  if (context?.state === 'suspended') void context.resume()
  return context
}

export const play = (name: SoundName) => {
  if (isMuted()) return
  const audio = ensureContext()
  if (!audio) return
  const zero = audio.currentTime + 0.01
  for (const [frequency, at, duration] of TUNES[name]) {
    const oscillator = audio.createOscillator()
    const envelope = audio.createGain()
    oscillator.type = 'square'
    oscillator.frequency.value = frequency
    envelope.gain.setValueAtTime(0, zero + at)
    envelope.gain.linearRampToValueAtTime(0.045, zero + at + 0.006)
    envelope.gain.setValueAtTime(0.045, zero + at + duration - 0.012)
    envelope.gain.linearRampToValueAtTime(0, zero + at + duration)
    oscillator.connect(envelope)
    envelope.connect(audio.destination)
    oscillator.start(zero + at)
    oscillator.stop(zero + at + duration + 0.02)
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
  return 'key'
}
