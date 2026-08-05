'use client'

import { useEffect, useReducer } from 'react'
import { isEditableTarget, letterKeysDisabled } from 'services/hotkeys'
import { prefersQuietFx } from 'services/theme'
import Dome from './dome'
import css from './jukebox.module.css'
import KeyPad from './key-pad'
import { RECORDS } from './records'
import { keyToEvent, reduce, type SelectionState } from './selection'
import StripMenu from './strip-menu'

const ARM_TIMEOUT_MS = 2000
const SEQUENCE_MS = 1500
const QUIET_SEQUENCE_MS = 350

const initial: SelectionState = { phase: 'idle' }

export default function JukeboxView() {
  const [state, dispatch] = useReducer(reduce, initial)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (letterKeysDisabled() || isEditableTarget(event.target)) return
      const next = keyToEvent(event.key)
      if (next) dispatch(next)
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
      <section
        className={css.cabinet}
        aria-label='side projects jukebox'
        data-playing={state.phase === 'playing' || undefined}
      >
        <h1 className={css.marquee}>side projects</h1>
        <Dome nowPlaying={nowPlaying} />
        <StripMenu onPick={(record) => dispatch({ type: 'PICK', record })} />
        <KeyPad
          armed={state.phase === 'armed' ? state.letter : null}
          onLetter={(letter) => dispatch({ type: 'LETTER', letter })}
          onNumber={(digit) => dispatch({ type: 'NUMBER', digit })}
        />
      </section>
    </main>
  )
}
