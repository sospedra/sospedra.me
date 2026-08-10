import type { Dispatch, RefObject } from 'react'
import { useCallback, useEffect, useRef } from 'react'
import type { ExternalStore } from 'services/external-store'
import { tapHaptic } from 'services/haptics'
import type { GeoGameAction, GeoGameState } from './game-state'
import { currentQuestion } from './game-state'
import type { GeoAudio } from './geo-audio'
import type { GeoMessages } from './geo-messages'
import type { GeoSettings } from './model'

type RunKeyControls = {
  dispatch: Dispatch<GeoGameAction>
  openOverlay: (
    overlay: 'settings' | 'help',
    opener: HTMLButtonElement | null,
  ) => void
  openerRef: RefObject<HTMLElement | null>
  passQuestion: () => void
  start: () => void
  stateRef: RefObject<GeoGameState>
  toggleSound: () => void
}

const targetClosest = (event: KeyboardEvent, selector: string): boolean => {
  const element = event.target instanceof Element ? event.target : null
  return Boolean(element?.closest(selector))
}

const shouldIgnoreKey = (event: KeyboardEvent): boolean =>
  event.defaultPrevented ||
  event.isComposing ||
  event.altKey ||
  event.ctrlKey ||
  event.metaKey ||
  targetClosest(
    event,
    'input, textarea, select, [contenteditable], [role="textbox"]',
  )

const handleOverlayKey = (
  event: KeyboardEvent,
  controls: RunKeyControls,
): void => {
  if (event.key !== 'Escape') return
  event.preventDefault()
  controls.dispatch({ type: 'CLOSE_OVERLAY' })
  window.requestAnimationFrame(() => controls.openerRef.current?.focus())
}

const handlePhaseKey = (
  event: KeyboardEvent,
  controls: RunKeyControls,
): void => {
  const current = controls.stateRef.current
  if (current.phase === 'idle' && event.key === 'Enter') {
    if (targetClosest(event, 'button, a, input, select')) return
    event.preventDefault()
    controls.start()
    return
  }
  if (current.phase === 'visibility-paused' && event.key === 'Enter') {
    event.preventDefault()
    controls.dispatch({ type: 'RESUME_FROM_VISIBILITY' })
    return
  }
  if (current.phase !== 'question') return
  if (event.key.toLowerCase() === 'p') {
    event.preventDefault()
    controls.passQuestion()
  }
}

const handleRunKey = (event: KeyboardEvent, controls: RunKeyControls): void => {
  if (shouldIgnoreKey(event)) return
  if (event.key.toLowerCase() === 'm') {
    event.preventDefault()
    controls.toggleSound()
    return
  }
  if (controls.stateRef.current.overlay) {
    handleOverlayKey(event, controls)
    return
  }
  const helpAllowed =
    stateAllowsHelp(controls.stateRef.current) && event.key === '?'
  if (helpAllowed) {
    event.preventDefault()
    controls.openOverlay('help', null)
    return
  }
  handlePhaseKey(event, controls)
}

const stateAllowsHelp = (state: GeoGameState): boolean =>
  state.phase !== 'question' && state.phase !== 'countdown'

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
    tapHaptic()
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
    const controls: RunKeyControls = {
      dispatch,
      openOverlay,
      openerRef,
      passQuestion,
      start,
      stateRef,
      toggleSound,
    }
    const handleKeyDown = (event: KeyboardEvent) =>
      handleRunKey(event, controls)
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
