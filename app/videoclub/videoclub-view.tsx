'use client'

import cn from 'clsx'
import Link, { LinkBack } from 'components/Link'
import Shell from 'components/Shell'
import { clamp } from 'es-toolkit'
import type { CSSProperties } from 'react'
import { useEffect, useReducer, useRef, useState } from 'react'
import { type Trap, useHotkeys } from 'service/hotkeys'
import { useTheme } from 'service/theme'
import { createDeckAudio } from './deck-audio'
import { runTapeSwap } from './tape-swap'
import { TAPES, type Tape } from './tapes'
import css from './videoclub.module.css'

const WARM_MS = 1100
const SWITCH_MS = 480
const COOL_MS = 400
const SEEK_STEP = 15
const VOLUME_STEP = 0.1
const OSD_MS = 1800
const VOLUME_BARS = 10

/* messy-pile offsets, one per stack row */
const DRIFT = ['-0.4rem', '0.7rem', '-0.15rem', '0.9rem', '0.25rem']
const TIP = ['-0.5deg', '0.4deg', '-0.2deg', '0.6deg', '-0.35deg']

type TvStatus =
  | 'off'
  | 'cooling'
  | 'warming'
  | 'inserting'
  | 'switching'
  | 'playing'
  | 'paused'

type TapeBurst = 'snow' | 'bars'

type TvState = {
  status: TvStatus
  tape: number
  incoming: number | null
  cold: boolean
  burst: TapeBurst
}

type TvEvent =
  | { type: 'power' }
  | { type: 'ready' }
  | { type: 'toggle' }
  | { type: 'insert'; tape: number }
  | { type: 'inserted'; burst: TapeBurst }

const reducer = (state: TvState, event: TvEvent): TvState => {
  switch (event.type) {
    case 'power':
      if (state.status === 'off' || state.status === 'cooling')
        return { ...state, status: 'warming' }
      return { ...state, status: 'cooling', incoming: null, cold: false }
    case 'ready':
      if (state.status === 'cooling') return { ...state, status: 'off' }
      if (state.status !== 'warming' && state.status !== 'switching')
        return state
      return { ...state, status: 'playing' }
    case 'toggle':
      if (state.status === 'playing') return { ...state, status: 'paused' }
      if (state.status === 'paused') return { ...state, status: 'playing' }
      return state
    case 'insert':
      if (state.status === 'inserting' || event.tape === state.tape)
        return state
      return {
        ...state,
        status: 'inserting',
        incoming: event.tape,
        cold: state.status === 'off' || state.status === 'cooling',
      }
    case 'inserted':
      if (state.status !== 'inserting' || state.incoming === null) return state
      return {
        status: state.cold ? 'warming' : 'switching',
        tape: state.incoming,
        incoming: null,
        cold: false,
        burst: event.burst,
      }
  }
}

/* one tape change in five cues the SMPTE test card instead of snow */
const drawBurst = (): TapeBurst => (Math.random() < 0.2 ? 'bars' : 'snow')

const BARS_MS = 1150

const OSD_STATUS: Record<TvStatus, string> = {
  off: '',
  cooling: '',
  warming: 'CUE UP',
  inserting: 'INSERT',
  switching: 'TRACKING',
  playing: 'PLAY',
  paused: 'PAUSE',
}

const formatCounter = (seconds: number): string => {
  const total = Math.floor(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

const formatChannel = (tape: number): string =>
  `CH ${String(tape + 1).padStart(2, '0')}`

const volumeBars = (volume: number): string => {
  const lit = Math.round(volume * VOLUME_BARS)
  return `VOL ${'|'.repeat(lit)}${'.'.repeat(VOLUME_BARS - lit)}`
}

function SpineBar(props: { index: number; tape: Tape }) {
  return (
    <>
      <i className={css.notch} aria-hidden='true' />
      <span className={css.vhsLabel} aria-hidden='true'>
        <b className={css.vhsCode}>
          [{String(props.index + 1).padStart(2, '0')}]
        </b>
        <span className={css.vhsTitle}>
          <span className={css.vhsName}>{props.tape.title}</span>
          <small>{props.tape.venue}</small>
        </span>
        <b className={css.vhsTag}>[{props.tape.lang}]</b>
      </span>
    </>
  )
}

function DeckKey(props: {
  glyph: string
  hint: string
  onPress: () => void
  kind?: 'transport' | 'volume'
}) {
  return (
    <span className={css.keyWrap} data-kind={props.kind ?? 'transport'}>
      <button
        type='button'
        className={css.key}
        onClick={props.onPress}
        aria-label={props.hint}
      >
        <span aria-hidden='true'>{props.glyph}</span>
      </button>
      <small aria-hidden='true'>{props.hint}</small>
    </span>
  )
}

export default function VideoclubView() {
  const [state, dispatch] = useReducer(reducer, {
    status: 'off',
    tape: 0,
    incoming: null,
    cold: false,
    burst: 'snow',
  })
  const [volume, setVolume] = useState(0.7)
  const [clock, setClock] = useState('0:00:00')
  const [osd, setOsd] = useState<{ text: string; at: number } | null>(null)
  const [audio] = useState(createDeckAudio)
  const videoRef = useRef<HTMLVideoElement>(null)
  const ghostRef = useRef<HTMLDivElement>(null)
  const slotRef = useRef<HTMLDivElement>(null)
  const stackRefs = useRef<(HTMLButtonElement | null)[]>([])
  const osdSeq = useRef(0)
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

  useEffect(() => () => audio.staticOff(), [audio])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (state.status !== 'playing') {
      video.pause()
      return
    }
    video.play().catch(() => dispatch({ type: 'toggle' }))
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

  const flash = (text: string) => {
    osdSeq.current += 1
    setOsd({ text, at: osdSeq.current })
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
    setClock('0:00:00')
    flash(formatChannel(index))
    dispatch({ type: 'insert', tape: index })
  }

  const deckTrap =
    (press: () => void) =>
    (event: KeyboardEvent): void => {
      event.preventDefault()
      press()
    }

  const tapeTraps = TAPES.map(
    (_, index): Trap => [String(index + 1), deckTrap(() => insertTape(index))],
  )

  useHotkeys([
    ['Space', deckTrap(toggle)],
    ['t', deckTrap(power)],
    ['ArrowLeft', deckTrap(() => seek(-SEEK_STEP))],
    ['ArrowRight', deckTrap(() => seek(SEEK_STEP))],
    ['ArrowUp', deckTrap(() => nudgeVolume(VOLUME_STEP))],
    ['ArrowDown', deckTrap(() => nudgeVolume(-VOLUME_STEP))],
    ...tapeTraps,
  ])

  const screenHint = powered
    ? 'Pause or resume the tape'
    : 'Power on the television'

  return (
    <Shell canonical='/videoclub' className={css.frame}>
      <nav className={css.rail} aria-label='Videoclub navigation'>
        <Link url='/' className={css.backLink}>
          <LinkBack>Home</LinkBack>
        </Link>
        <h1>Broadcast archive</h1>
        <p>SECTOR 06 / TAPE DECK / {lit ? 'ON AIR' : 'STANDBY'}</p>
      </nav>

      <section className={css.den} aria-label='Television set'>
        <div className={css.tv} data-power={lit ? 'on' : 'off'}>
          <div
            className={css.screen}
            data-status={state.status}
            data-burst={state.burst}
          >
            <div className={css.tube}>
              <div className={css.raster}>
                {/* biome-ignore lint/a11y/useMediaCaption: no caption tracks exist for these recordings */}
                <video
                  key={tape.id}
                  ref={videoRef}
                  className={css.film}
                  src={tape.src}
                  preload='metadata'
                  playsInline
                  onLoadedMetadata={(event) => {
                    event.currentTarget.volume = volume
                  }}
                  onTimeUpdate={(event) =>
                    setClock(formatCounter(event.currentTarget.currentTime))
                  }
                  onEnded={() => dispatch({ type: 'toggle' })}
                />
                <div className={css.noise} aria-hidden='true' />
                <div className={css.bars} aria-hidden='true' />
                <div className={css.bloom} aria-hidden='true' />
                <div className={css.phosphor} aria-hidden='true' />
              </div>
              <div className={css.glass} aria-hidden='true' />
            </div>
            <span className={css.screenBadge} aria-hidden='true'>
              SOSPESONIC
            </span>
            <div className={css.osd} aria-hidden='true'>
              <span className={css.osdStatus}>{OSD_STATUS[state.status]}</span>
              <span className={css.osdChannel}>
                {formatChannel(state.tape)}
              </span>
              {osd && (
                <span key={osd.at} className={css.osdFlash}>
                  {osd.text}
                </span>
              )}
              <span className={css.osdCounter}>{clock}</span>
            </div>
            <button
              type='button'
              className={css.screenAction}
              onClick={toggle}
              aria-label={screenHint}
            />
          </div>

          <div className={css.fascia}>
            <div className={css.deck}>
              <div
                ref={slotRef}
                className={css.slot}
                data-open={state.status === 'inserting'}
                aria-busy={state.status === 'inserting'}
              >
                <i className={css.flap} aria-hidden='true' />
                <span className={css.sticker}>
                  {activeTape.title} · {activeTape.venue} · {activeTape.lang}
                </span>
              </div>
              <div className={css.grille} aria-hidden='true' />
              <p className={css.brand}>
                <b>VHS HQ</b>
                <span>QUICK START · DIGITAL AUTO TRACKING</span>
                <b>2 HEAD</b>
              </p>
            </div>

            <fieldset className={css.controls}>
              <legend className='sr-only'>Television and tape controls</legend>
              <p className={css.controlHeader} aria-hidden='true'>
                <span>FRONT AV / COMBO DECK</span>
                <b>STEREO</b>
              </p>

              <div className={css.avInputs} aria-hidden='true'>
                <span>
                  <i data-signal='video' />
                  VIDEO
                </span>
                <span>
                  <i data-signal='audio' />
                  AUDIO
                </span>
                <span>
                  <i data-signal='phones' />
                  PHONES
                </span>
              </div>

              <span className={css.keyWrap} data-kind='power'>
                <button
                  type='button'
                  className={cn(css.key, css.powerKey)}
                  onClick={power}
                  aria-pressed={powered}
                  aria-label='Power'
                >
                  <span aria-hidden='true'>⏻</span>
                </button>
                <small aria-hidden='true'>POWER</small>
                <i className={css.led} data-on={lit} aria-hidden='true' />
              </span>

              <fieldset className={css.transport}>
                <legend className='sr-only'>Tape transport</legend>
                <DeckKey
                  glyph='◁◁'
                  hint='REW'
                  onPress={() => seek(-SEEK_STEP)}
                />
                <DeckKey
                  glyph={state.status === 'playing' ? '❚❚' : '▷'}
                  hint={state.status === 'playing' ? 'PAUSE' : 'PLAY'}
                  onPress={toggle}
                />
                <DeckKey glyph='▷▷' hint='FF' onPress={() => seek(SEEK_STEP)} />
              </fieldset>

              <fieldset className={css.volumeKeys}>
                <legend className='sr-only'>Volume controls</legend>
                <DeckKey
                  glyph='−'
                  hint='VOL −'
                  kind='volume'
                  onPress={() => nudgeVolume(-VOLUME_STEP)}
                />
                <DeckKey
                  glyph='+'
                  hint='VOL +'
                  kind='volume'
                  onPress={() => nudgeVolume(VOLUME_STEP)}
                />
              </fieldset>
            </fieldset>
          </div>
        </div>

        <section className={css.stack} aria-label='Tape pile'>
          <span className={css.onAir} data-live={lit} aria-hidden='true'>
            ON AIR
          </span>
          {TAPES.map((item, index) => {
            const pile = {
              '--drift': DRIFT[index % DRIFT.length],
              '--tip': TIP[index % TIP.length],
            } as CSSProperties
            if (index === state.tape) {
              return (
                <span key={item.id} className={css.bay} style={pile}>
                  IN DECK
                </span>
              )
            }
            return (
              <button
                key={item.id}
                ref={(element) => {
                  stackRefs.current[index] = element
                }}
                type='button'
                className={css.vhs}
                style={pile}
                disabled={state.status === 'inserting'}
                onClick={() => insertTape(index)}
                aria-label={`Insert ${item.title}, ${item.venue}`}
              >
                <SpineBar index={index} tape={item} />
              </button>
            )
          })}
        </section>

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
        <div
          ref={ghostRef}
          className={cn(css.vhs, css.ghost)}
          style={
            {
              '--drift': DRIFT[state.incoming % DRIFT.length],
              '--tip': TIP[state.incoming % TIP.length],
            } as CSSProperties
          }
          aria-hidden='true'
        >
          <SpineBar index={state.incoming} tape={TAPES[state.incoming]} />
        </div>
      )}

      <p className='sr-only' aria-live='polite'>
        {lit
          ? `${OSD_STATUS[state.status]} — ${activeTape.title}, ${activeTape.venue}`
          : 'Television off'}
      </p>
    </Shell>
  )
}
