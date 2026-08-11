import { useCallback, useEffect, useRef } from 'react'
import { playFanfare } from 'services/audio/fanfare'
import {
  playCarriageShift,
  playDeadKey,
  playKeyClick,
  playTypewriterBell,
} from 'services/audio/key-click'
import { ensureRunning } from 'services/audio/kit'
import { SOUND_GAINS, type SoundLevel } from './crossword-settings'

/* consumers key callbacks and effects on these identities; keep them stable */
export const useCrosswordSound = (soundLevel: SoundLevel) => {
  const audioContextRef = useRef<AudioContext | null>(null)

  const getAudioContext = useCallback(() => {
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
  }, [soundLevel])

  const clickKey = useCallback(() => {
    const context = getAudioContext()
    if (context) {
      playKeyClick(context, SOUND_GAINS.keyClick[soundLevel])
    }
  }, [getAudioContext, soundLevel])

  const ringTypewriterBell = useCallback(() => {
    const context = getAudioContext()
    if (context) {
      playTypewriterBell(context, SOUND_GAINS.typewriterBell[soundLevel])
    }
  }, [getAudioContext, soundLevel])

  const shiftCarriage = useCallback(() => {
    const context = getAudioContext()
    if (context) {
      playCarriageShift(context, SOUND_GAINS.carriageShift[soundLevel])
    }
  }, [getAudioContext, soundLevel])

  const thudDeadKey = useCallback(() => {
    const context = getAudioContext()
    if (context) {
      playDeadKey(context, SOUND_GAINS.deadKey[soundLevel])
    }
  }, [getAudioContext, soundLevel])

  const ringFanfare = useCallback(() => {
    const context = getAudioContext()
    if (context) {
      playFanfare(context, { volume: SOUND_GAINS.fanfare[soundLevel] })
    }
  }, [getAudioContext, soundLevel])

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
