'use client'

import cn from 'clsx'
import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import {
  isEditableTarget,
  letterKeysDisabled,
  useGameInput,
} from 'services/hotkeys'
import { prefersQuietFx } from 'services/theme'
import { soundPreference } from '../bazaar/sounds'
import {
  type ArmPose,
  codeOf,
  type DomeHandle,
  playSequence,
} from './choreography'
import Dome from './dome'
import { jukeSfx } from './juke-sfx'
import css from './jukebox.module.css'
import KeyPad, { type DisplayState } from './key-pad'
import { type JukeRecord, RECORDS } from './records'
import { keyToEvent, recordAt, reduce, type SelectionState } from './selection'
import StripMenu from './strip-menu'

const ARM_TIMEOUT_MS = 2000
const ERROR_FLASH_MS = 500
const KEY_DOWN_MS = 130

const initial: SelectionState = { phase: 'idle' }

const serverSoundOff = () => false

function phaseDisplay(state: SelectionState): string {
  if (state.phase === 'armed') return `${state.letter} ·`
  if (state.phase === 'playing') {
    const code = codeOf(state.record)
    return `${code[0]} ${code.slice(1)}`
  }
  return '– –'
}

function shouldIgnoreKeydown(event: KeyboardEvent): boolean {
  if (event.metaKey || event.ctrlKey || event.altKey) return true
  return letterKeysDisabled() || isEditableTarget(event.target)
}

export default function JukeboxView({
  fontClassName,
}: {
  fontClassName: string
}) {
  const [state, dispatch] = useReducer(reduce, initial)
  const sound = useSyncExternalStore(
    soundPreference.subscribe,
    soundPreference.isEnabled,
    serverSoundOff,
  )
  useGameInput()

  const domeHandleRef = useRef<DomeHandle | null>(null)
  const platterRef = useRef<JukeRecord>(RECORDS[0])
  const errorTimerRef = useRef<number | null>(null)

  const [platterRecord, setPlatterRecordState] = useState<JukeRecord>(
    RECORDS[0],
  )
  const [armPose, setArmPose] = useState<ArmPose>('rest')
  const [lampText, setLampText] = useState(
    `NOW PLAYING · ${RECORDS[0].title.toUpperCase()}`,
  )
  const [errorFlash, setErrorFlash] = useState<string | null>(null)
  const [downKeys, setDownKeys] = useState<ReadonlySet<string>>(new Set())

  const setPlatterRecord = useCallback((record: JukeRecord) => {
    platterRef.current = record
    setPlatterRecordState(record)
  }, [])

  const clearErrorFlash = useCallback(() => {
    if (errorTimerRef.current !== null) {
      window.clearTimeout(errorTimerRef.current)
    }
    errorTimerRef.current = null
    setErrorFlash(null)
  }, [])

  const flashError = useCallback((text: string) => {
    jukeSfx.buzz()
    setErrorFlash(text)
    errorTimerRef.current = window.setTimeout(
      () => setErrorFlash(null),
      ERROR_FLASH_MS,
    )
  }, [])

  const dispatchLetter = useCallback(
    (letter: string) => {
      if (state.phase === 'playing') return
      jukeSfx.ensure()
      jukeSfx.tick()
      clearErrorFlash()
      dispatch({ type: 'LETTER', letter })
    },
    [state.phase, clearErrorFlash],
  )

  const dispatchNumber = useCallback(
    (digit: number) => {
      if (state.phase === 'playing') return
      jukeSfx.ensure()
      clearErrorFlash()
      if (state.phase !== 'armed') {
        flashError(`– ${digit}`)
        dispatch({ type: 'NUMBER', digit })
        return
      }
      const record = recordAt(state.letter, digit)
      if (record?.status !== 'pressed') {
        flashError(`${state.letter} ${digit}`)
      }
      dispatch({ type: 'NUMBER', digit })
    },
    [state, clearErrorFlash, flashError],
  )

  const dispatchCancel = useCallback(() => {
    clearErrorFlash()
    dispatch({ type: 'CANCEL' })
  }, [clearErrorFlash])

  const handlePick = useCallback((record: JukeRecord) => {
    jukeSfx.ensure()
    dispatch({ type: 'PICK', record })
  }, [])

  const handleToggleSound = useCallback(() => {
    const next = !sound
    soundPreference.setEnabled(next)
    if (next) {
      jukeSfx.ensure()
      jukeSfx.clack()
    }
  }, [sound])

  const pressVisual = useCallback((key: string) => {
    setDownKeys((prev) => new Set(prev).add(key))
    window.setTimeout(() => {
      setDownKeys((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }, KEY_DOWN_MS)
  }, [])

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (shouldIgnoreKeydown(event)) return
      const next = keyToEvent(event.key)
      if (!next) return
      switch (next.type) {
        case 'LETTER':
          pressVisual(next.letter)
          dispatchLetter(next.letter)
          return
        case 'NUMBER':
          pressVisual(String(next.digit))
          dispatchNumber(next.digit)
          return
        case 'CANCEL':
          dispatchCancel()
          return
        case 'PICK':
        case 'RESET':
          return
      }
    },
    [pressVisual, dispatchLetter, dispatchNumber, dispatchCancel],
  )

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onKeyDown])

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return
      clearErrorFlash()
      dispatch({ type: 'RESET' })
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [clearErrorFlash])

  useEffect(() => {
    if (state.phase !== 'armed') return
    const timer = window.setTimeout(() => dispatchCancel(), ARM_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [state, dispatchCancel])

  useEffect(() => {
    if (state.phase !== 'playing') return
    const handle = domeHandleRef.current
    if (!handle) return
    const controller = new AbortController()
    playSequence(
      {
        handle,
        record: state.record,
        onPlatter: platterRef.current,
        reduceMotion: prefersQuietFx(),
        setArmPose,
        setPlatterRecord,
        setLampText,
      },
      controller.signal,
    )
    return () => controller.abort()
  }, [state, setPlatterRecord])

  const display: DisplayState = {
    text: errorFlash ?? phaseDisplay(state),
    err: errorFlash !== null,
  }

  return (
    <div className={cn(css.hall, fontClassName)}>
      <main className={css.machine} data-phase={state.phase}>
        <div className={css.tubeLeft} aria-hidden />
        <div className={css.tubeRight} aria-hidden />
        <Dome
          ref={domeHandleRef}
          platter={platterRecord}
          armPose={armPose}
          lampText={lampText}
        />
        <StripMenu
          armedLetter={state.phase === 'armed' ? state.letter : null}
          onPick={handlePick}
        />
        <KeyPad
          armedLetter={state.phase === 'armed' ? state.letter : null}
          downKeys={downKeys}
          display={display}
          sound={sound}
          onLetter={dispatchLetter}
          onNumber={dispatchNumber}
          onToggleSound={handleToggleSound}
        />
      </main>
    </div>
  )
}
