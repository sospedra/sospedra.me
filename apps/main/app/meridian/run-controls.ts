import type { Dispatch, RefObject } from 'react'
import { useCallback, useEffect, useRef } from 'react'
import type { ExternalStore } from 'services/external-store'
import type { GeoGameAction, GeoGameState } from './game-state'
import { currentQuestion } from './game-state'
import type { GeoAudio } from './geo-audio'
import type { GeoMessages } from './geo-messages'
import type { GeoSettings } from './model'

export const useRunControls = ({
  announce,
  audio,
  copy,
  dispatch,
  onSettingsChange,
  questionElapsedRef,
  roundClock,
  settings,
  stateRef,
}: {
  announce: (message: string) => void
  audio: GeoAudio
  copy: GeoMessages
  dispatch: Dispatch<GeoGameAction>
  onSettingsChange: (settings: GeoSettings) => void
  questionElapsedRef: RefObject<number>
  roundClock: ExternalStore<number>
  settings: GeoSettings
  stateRef: RefObject<GeoGameState>
}) => {
  const openerRef = useRef<HTMLElement | null>(null)

  const helpButtonRef = useRef<HTMLButtonElement | null>(null)

  const passQuestion = useCallback(() => {
    const current = stateRef.current
    if (current.phase !== 'question' || !currentQuestion(current)) return
    dispatch({
      type: 'SKIP_QUESTION',
      elapsedMs: questionElapsedRef.current,
      roundElapsedMs: roundClock.get(),
      answeredAt: new Date().toISOString(),
    })
  }, [roundClock])

  const start = useCallback(() => {
    const current = stateRef.current
    if (current.phase === 'visibility-paused') {
      dispatch({ type: 'RESUME_FROM_VISIBILITY' })
    } else {
      dispatch({ type: 'START', startedAt: new Date().toISOString() })
    }
    audio.play('start')
  }, [audio])

  const toggleSound = useCallback(() => {
    const sound = !settings.sound
    audio.setEnabled(sound)
    onSettingsChange({ ...settings, sound })
    announce(sound ? copy.soundOn : copy.soundOff)
    if (sound) audio.play('start')
  }, [announce, audio, copy.soundOff, copy.soundOn, onSettingsChange, settings])

  const openOverlay = useCallback(
    (overlay: 'settings' | 'help', opener: HTMLButtonElement | null) => {
      // The '?' shortcut has no opener; close then returns focus to the header help button.
      openerRef.current = opener ?? helpButtonRef.current
      dispatch({ type: 'OPEN_OVERLAY', overlay })
    },
    [],
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      ) {
        return
      }
      const element = event.target instanceof Element ? event.target : null
      const editable = element?.closest(
        'input, textarea, select, [contenteditable], [role="textbox"]',
      )
      if (editable) return

      if (event.key.toLowerCase() === 'm') {
        event.preventDefault()
        toggleSound()
        return
      }

      if (stateRef.current.overlay) {
        if (event.key === 'Escape') {
          event.preventDefault()
          dispatch({ type: 'CLOSE_OVERLAY' })
          window.requestAnimationFrame(() => openerRef.current?.focus())
        }
        return
      }

      if (
        event.key === '?' &&
        stateRef.current.phase !== 'question' &&
        stateRef.current.phase !== 'countdown'
      ) {
        event.preventDefault()
        openOverlay('help', null)
        return
      }

      const current = stateRef.current
      if (current.phase === 'idle' && event.key === 'Enter') {
        if (element?.closest('button, a, input, select')) return
        event.preventDefault()
        start()
        return
      }
      if (current.phase === 'visibility-paused' && event.key === 'Enter') {
        event.preventDefault()
        dispatch({ type: 'RESUME_FROM_VISIBILITY' })
        return
      }
      if (current.phase !== 'question') return

      if (event.key.toLowerCase() === 'p') {
        event.preventDefault()
        passQuestion()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openOverlay, passQuestion, start, toggleSound])

  return {
    helpButtonRef,
    openerRef,
    openOverlay,
    passQuestion,
    start,
    toggleSound,
  }
}
