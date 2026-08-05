'use client'

import { useEffect, useReducer, useSyncExternalStore } from 'react'
import { isEditableTarget, letterKeysDisabled } from 'services/hotkeys'
import { prefersQuietFx } from 'services/theme'
import { soundPreference } from '../bazaar/sounds'
import Dome from './dome'
import { jukeSfx } from './juke-sfx'
import css from './jukebox.module.css'
import KeyPad from './key-pad'
import { RECORDS } from './records'
import { keyToEvent, reduce, type SelectionState } from './selection'
import StripMenu from './strip-menu'

const ARM_TIMEOUT_MS = 2000
const SEQUENCE_MS = 1500
const QUIET_SEQUENCE_MS = 350

const initial: SelectionState = { phase: 'idle' }

const serverSoundOff = () => false

export default function JukeboxView() {
  const [state, dispatch] = useReducer(reduce, initial)
  const sound = useSyncExternalStore(
    soundPreference.subscribe,
    soundPreference.isEnabled,
    serverSoundOff,
  )

  const toggleSound = () => {
    const next = !sound
    soundPreference.setEnabled(next)
    if (next) jukeSfx.kaChunk()
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (letterKeysDisabled() || isEditableTarget(event.target)) return
      const next = keyToEvent(event.key)
      if (!next) return
      if (next.type === 'LETTER') jukeSfx.kaChunk()
      dispatch(next)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (state.phase === 'armed') {
      const timer = window.setTimeout(
        () => dispatch({ type: 'CANCEL' }),
        ARM_TIMEOUT_MS,
      )
      return () => window.clearTimeout(timer)
    }
    if (state.phase === 'playing') {
      jukeSfx.crackle()
      jukeSfx.bar()
      const delay = prefersQuietFx() ? QUIET_SEQUENCE_MS : SEQUENCE_MS
      const timer = window.setTimeout(
        () => window.location.assign(state.record.url),
        delay,
      )
      return () => window.clearTimeout(timer)
    }
  }, [state])

  const nowPlaying = state.phase === 'playing' ? state.record : RECORDS[0]

  return (
    <main className={css.hall}>
      <button
        type='button'
        className={css.soundBtn}
        aria-pressed={sound}
        onClick={toggleSound}
      >
        SOUND <span aria-hidden='true'>{sound ? 'ON' : 'OFF'}</span>
      </button>
      <section
        className={css.cabinet}
        aria-label='side projects jukebox'
        data-playing={state.phase === 'playing' || undefined}
      >
        <h1 className={css.marquee}>side projects</h1>
        <Dome nowPlaying={nowPlaying} />
        <StripMenu
          onPick={(record) => dispatch({ type: 'PICK', record })}
          onHover={() => jukeSfx.hover()}
        />
        <KeyPad
          armed={state.phase === 'armed' ? state.letter : null}
          onLetter={(letter) => {
            jukeSfx.kaChunk()
            dispatch({ type: 'LETTER', letter })
          }}
          onNumber={(digit) => dispatch({ type: 'NUMBER', digit })}
        />
      </section>
    </main>
  )
}
