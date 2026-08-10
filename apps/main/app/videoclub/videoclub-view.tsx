'use client'

import cn from 'clsx'
import { clamp } from 'es-toolkit'
import { useEffect, useReducer, useRef, useState } from 'react'
import { preload } from 'react-dom'
import { DECK_SAMPLE_URLS } from 'services/audio/deck-samples'
import { sceneTrap, type Trap, useHotkeys } from 'services/hotkeys'
import { GoBack, LinkBack } from 'services/link'
import Shell from 'services/shell'
import { useTheme } from 'services/theme'
import { CrtScreen, formatChannel, volumeBars } from './crt-screen'
import crt from './crt-screen.module.css'
import { createDeckAudio } from './deck-audio'
import { DeckControls, SEEK_STEP, VOLUME_STEP } from './deck-controls'
import { TapeDeck } from './tape-deck'
import { TapeGhost, TapePile } from './tape-pile'
import { runTapeSwap } from './tape-swap'
import { TAPES } from './tapes'
import {
  BARS_MS,
  COOL_MS,
  drawBurst,
  OSD_STATUS,
  reducer,
  SWITCH_MS,
  type TvStatus,
  WARM_MS,
} from './tv-machine'
import css from './videoclub.module.css'

const OSD_MS = 1800

const isNotAllowed = (error: unknown) =>
  error instanceof DOMException && error.name === 'NotAllowedError'

export default function VideoclubView() {
  // head preload beats the hydration-time fetch; old Safari fetches m4a itself
  preload(`${DECK_SAMPLE_URLS.insert}.webm`, {
    as: 'fetch',
    crossOrigin: 'anonymous',
  })
  const [state, dispatch] = useReducer(reducer, {
    status: 'off',
    tape: 0,
    incoming: null,
    cold: false,
    burst: 'snow',
  })
  const [volume, setVolume] = useState(0.7)
  const [counterSeconds, setCounterSeconds] = useState(0)
  const [osd, setOsd] = useState<{ text: string; serial: number } | null>(null)
  const [audio] = useState(createDeckAudio)
  const videoRef = useRef<HTMLVideoElement>(null)
  const ghostRef = useRef<HTMLDivElement>(null)
  const slotRef = useRef<HTMLDivElement>(null)
  const stackRefs = useRef<(HTMLButtonElement | null)[]>([])
  const playKeyRef = useRef<HTMLButtonElement>(null)
  const spineFocusRef = useRef<number | null>(null)
  const osdSerial = useRef(0)
  const { fxMode, osReducedMotion } = useTheme()

  const tape = TAPES[state.tape]
  const incomingTape = state.incoming === null ? null : TAPES[state.incoming]
  const activeTape = incomingTape ?? tape
  const powered = state.status !== 'off' && state.status !== 'cooling'
  const lit = powered && !(state.status === 'inserting' && state.cold)
  const quiet = fxMode === 'quiet' || osReducedMotion

  useEffect(() => {
    const phaseMs: Partial<Record<TvStatus, number>> = {
      warming: WARM_MS,
      switching: state.burst === 'bars' ? BARS_MS : SWITCH_MS,
      cooling: COOL_MS,
    }
    const delay = phaseMs[state.status]
    if (delay === undefined) return
    const id = window.setTimeout(() => dispatch({ type: 'ready' }), delay)
    return () => window.clearTimeout(id)
  }, [state.status, state.burst])

  useEffect(() => {
    if (state.status !== 'inserting' || state.incoming === null) return
    const ghost = ghostRef.current
    const slot = slotRef.current
    const source = stackRefs.current[state.incoming]
    const finish = () => dispatch({ type: 'inserted', burst: drawBurst() })
    if (quiet || !ghost || !slot || !source) {
      finish()
      return
    }
    const swap = runTapeSwap(
      { ghost, slot, source },
      { insert: audio.insert },
      finish,
    )
    return swap.cancel
  }, [state.status, state.incoming, quiet, audio])

  useEffect(() => audio.preload(), [audio])

  useEffect(() => {
    const tracking = state.status === 'switching'
    const snowy =
      state.status === 'warming' || (tracking && state.burst === 'snow')
    if (snowy) audio.staticOn()
    else audio.staticOff()
    if (tracking && state.burst === 'bars') audio.beep(BARS_MS / 1000)
  }, [state.status, state.burst, audio])

  useEffect(
    () => () => {
      audio.staticOff()
      audio.dispose()
    },
    [audio],
  )

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (state.status !== 'playing') {
      video.pause()
      return
    }
    video.play().catch((error: unknown) => {
      if (!isNotAllowed(error)) return
      // iOS refuses playback outside a gesture (always in Low Power Mode);
      // land on pause and say so instead of a mute black tube
      dispatch({ type: 'toggle' })
      osdSerial.current += 1
      setOsd({ text: 'TAP SCREEN TO PLAY', serial: osdSerial.current })
    })
  }, [state.status])

  // detached media elements keep playing audio until GC; the key remount
  // swaps elements under the ref, so re-capture per tape
  // biome-ignore lint/correctness/useExhaustiveDependencies(tape.id): the dep drives the re-capture
  useEffect(() => {
    const video = videoRef.current
    return () => video?.pause()
  }, [tape.id])

  useEffect(() => {
    const video = videoRef.current
    if (video) video.volume = volume
  }, [volume])

  useEffect(() => {
    if (!osd) return
    const id = window.setTimeout(() => setOsd(null), OSD_MS)
    return () => window.clearTimeout(id)
  }, [osd])

  // a swapped-in spine unmounts into the bay span and focus falls to body
  useEffect(() => {
    const pending = spineFocusRef.current
    spineFocusRef.current = null
    if (pending === state.tape) playKeyRef.current?.focus()
  }, [state.tape])

  const flash = (text: string) => {
    osdSerial.current += 1
    setOsd({ text, serial: osdSerial.current })
  }

  const power = () => {
    if (powered) {
      audio.powerOff()
    } else {
      audio.powerOn()
      flash(formatChannel(state.tape))
    }
    dispatch({ type: 'power' })
  }

  const toggle = () => {
    if (!powered) {
      power()
      return
    }
    if (state.status === 'inserting') return
    audio.click()
    flash(state.status === 'playing' ? 'PAUSE' : 'PLAY')
    // resume inside the tap: the post-commit effect lands outside the
    // user activation window on iOS and gets refused there
    if (state.status === 'paused') videoRef.current?.play().catch(() => {})
    dispatch({ type: 'toggle' })
  }

  const seek = (step: number) => {
    const video = videoRef.current
    if (!video || !powered) return
    audio.click()
    video.currentTime = Math.max(0, video.currentTime + step)
    flash(step < 0 ? '<< REW' : 'FF >>')
  }

  const nudgeVolume = (step: number) => {
    if (!powered) return
    audio.click()
    const next = clamp(Math.round((volume + step) * 10) / 10, 0, 1)
    setVolume(next)
    flash(volumeBars(next))
  }

  const insertTape = (index: number) => {
    if (index === state.tape || state.status === 'inserting') return
    audio.arm()
    setCounterSeconds(0)
    flash(formatChannel(index))
    dispatch({ type: 'insert', tape: index })
  }

  const tapeTraps = TAPES.map(
    (_, index): Trap => [String(index + 1), sceneTrap(() => insertTape(index))],
  )

  useHotkeys([
    ['Space', sceneTrap(toggle)],
    ['t', sceneTrap(power)],
    ['ArrowLeft', sceneTrap(() => seek(-SEEK_STEP))],
    ['ArrowRight', sceneTrap(() => seek(SEEK_STEP))],
    ['ArrowUp', sceneTrap(() => nudgeVolume(VOLUME_STEP))],
    ['ArrowDown', sceneTrap(() => nudgeVolume(-VOLUME_STEP))],
    ...tapeTraps,
  ])

  const screenHint = powered
    ? 'Pause or resume the tape'
    : 'Power on the television'

  return (
    <Shell className={css.frame}>
      <nav className={css.rail} aria-label='Videoclub navigation'>
        <GoBack className={css.backLink}>
          <LinkBack>Back</LinkBack>
        </GoBack>
        <h1>Broadcast archive</h1>
        <p>SECTOR 06 / TAPE DECK / {lit ? 'ON AIR' : 'STANDBY'}</p>
      </nav>

      <section className={css.den} aria-label='Television set'>
        <div className={cn(css.tv, crt.tv)} data-power={lit ? 'on' : 'off'}>
          <CrtScreen
            counterSeconds={counterSeconds}
            osd={osd}
            screenHint={screenHint}
            state={state}
            tape={tape}
            videoRef={videoRef}
            volume={volume}
            dispatch={dispatch}
            setCounterSeconds={setCounterSeconds}
            toggle={toggle}
          />

          <div className={css.fascia}>
            <TapeDeck activeTape={activeTape} slotRef={slotRef} state={state} />
            <DeckControls
              lit={lit}
              playKeyRef={playKeyRef}
              powered={powered}
              state={state}
              nudgeVolume={nudgeVolume}
              power={power}
              seek={seek}
              toggle={toggle}
            />
          </div>
        </div>

        <TapePile
          lit={lit}
          spineFocusRef={spineFocusRef}
          stackRefs={stackRefs}
          state={state}
          insertTape={insertTape}
        />

        <footer className={css.caption}>
          <p>
            NOW LOADED · {tape.title} · {tape.venue}
          </p>
          {tape.slides && (
            <a href={tape.slides} className={css.slides}>
              Slides (PDF)
            </a>
          )}
          <p aria-hidden='true'>
            SPACE PLAY · ← → SEEK · ↑ ↓ VOL · 1–{TAPES.length} TAPE · T POWER
          </p>
        </footer>
      </section>

      {state.status === 'inserting' && state.incoming !== null && (
        <TapeGhost ref={ghostRef} incoming={state.incoming} />
      )}

      <p className='sr-only' aria-live='polite'>
        {lit
          ? `${OSD_STATUS[state.status]} — ${activeTape.title}, ${activeTape.venue}`
          : 'Television off'}
        {lit && osd && <span key={osd.serial}> — {osd.text}</span>}
      </p>
    </Shell>
  )
}
