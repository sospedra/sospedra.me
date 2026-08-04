import { useEffect, useRef } from 'react'
import {
  playCarriageShift,
  playKeyClick,
  playTypewriterBell,
} from 'services/audio/key-click'
import { SOUND_GAINS, type SoundLevel } from './crossword-settings'

export const useCrosswordSound = (soundLevel: SoundLevel) => {
  const audioContextRef = useRef<AudioContext | null>(null)

  const getAudioContext = () => {
    if (soundLevel === 0) return null
    try {
      if (
        !audioContextRef.current ||
        audioContextRef.current.state === 'closed'
      ) {
        audioContextRef.current = new AudioContext()
      }
      const context = audioContextRef.current
      if (context.state === 'suspended') {
        void context.resume().catch(() => {})
      }
      return context
    } catch {
      // Audio is tactile polish; browser restrictions must never block play.
      return null
    }
  }

  const clickKey = () => {
    const context = getAudioContext()
    if (context) {
      playKeyClick(context, SOUND_GAINS.keyClick[soundLevel])
    }
  }

  const ringTypewriterBell = () => {
    const context = getAudioContext()
    if (context) {
      playTypewriterBell(context, SOUND_GAINS.typewriterBell[soundLevel])
    }
  }

  const shiftCarriage = () => {
    const context = getAudioContext()
    if (context) {
      playCarriageShift(context, SOUND_GAINS.carriageShift[soundLevel])
    }
  }

  useEffect(
    () => () => {
      const context = audioContextRef.current
      audioContextRef.current = null
      if (context && context.state !== 'closed') {
        void context.close().catch(() => {})
      }
    },
    [],
  )

  return { clickKey, ringTypewriterBell, shiftCarriage }
}
