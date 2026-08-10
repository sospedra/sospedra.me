import { useEffect, useRef } from 'react'
import { playFanfare } from 'services/audio/fanfare'
import {
  playCarriageShift,
  playDeadKey,
  playKeyClick,
  playTypewriterBell,
} from 'services/audio/key-click'
import { ensureRunning } from 'services/audio/kit'
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
      ensureRunning(context)
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

  const thudDeadKey = () => {
    const context = getAudioContext()
    if (context) {
      playDeadKey(context, SOUND_GAINS.deadKey[soundLevel])
    }
  }

  const ringFanfare = () => {
    const context = getAudioContext()
    if (context) {
      playFanfare(context, { volume: SOUND_GAINS.fanfare[soundLevel] })
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

  return {
    clickKey,
    ringFanfare,
    ringTypewriterBell,
    shiftCarriage,
    thudDeadKey,
  }
}
