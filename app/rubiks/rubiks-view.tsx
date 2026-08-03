'use client'

import { clamp, partition } from 'es-toolkit'
import type React from 'react'
import { useEffect, useReducer, useRef, useState } from 'react'
import { useGameInput } from 'services/hotkeys'
import Link, { LinkBack } from 'services/link'
import Row from 'services/row'
import Shell from 'services/shell'
import {
  axisOf,
  compress,
  FACE_NORMAL,
  FACES,
  type Face,
  type GameState,
  initialState,
  inLayer,
  isSolved,
  type Move,
  type Phase,
  randomScramble,
  reduce,
  type Stickers,
  slotIndex,
  type TimerState,
  type Turn,
  type Vec,
} from './engine'
import css from './rubiks.module.css'

// official brand stickers, same hexes as the /about word animation
const FACE_COLOR: Record<Face, string> = {
  U: '#f2f6ff',
  D: '#ffd500',
  F: '#009b48',
  B: '#0046ad',
  R: '#b71234',
  L: '#ff5800',
}

const FACE_PLACE: Record<Face, string> = {
  F: '',
  B: 'rotateY(180deg)',
  R: 'rotateY(90deg)',
  L: 'rotateY(-90deg)',
  U: 'rotateX(90deg)',
  D: 'rotateX(-90deg)',
}

const TURN_MS: Record<Turn['kind'], number> = {
  play: 180,
  undo: 180,
  redo: 180,
  scramble: 110,
  solve: 130,
}

const STATUS: Record<Exclude<Phase, 'idle'>, string> = {
  scrambling: 'mixing',
  solving: 'auto',
}

const TIMER_WORD: Record<TimerState['status'], string> = {
  off: 'zen',
  armed: 'ready',
  running: 'live',
  done: 'done',
}

const KEY_FACES: Record<string, Face> = {
  u: 'U',
  d: 'D',
  l: 'L',
  r: 'R',
  f: 'F',
  b: 'B',
}

const SCRAMBLE_LENGTH = 22
const PB_LABEL = '27.21'
const TIMER_TICK_MS = 53

const ROTATION_AXIS = ['1, 0, 0', '0, 1, 0', '0, 0, 1'] as const

const GRID = [-1, 0, 1]
const CUBIES: Vec[] = GRID.flatMap((x) =>
  GRID.flatMap((y) => GRID.map((z) => [x, y, z] as const)),
).filter(([x, y, z]) => x !== 0 || y !== 0 || z !== 0)

// engine space is y-up right-handed, CSS is y-down: conjugating the move
// rotation by that mirror flips the angle on the x and z axes
const turnTransform = (move: Move, spun: boolean) => {
  const normal = FACE_NORMAL[move.face]
  const axis = axisOf(normal)
  const engineDeg = -90 * normal[axis] * (move.prime ? -1 : 1)
  const deg = axis === 1 ? engineDeg : -engineDeg
  return `rotate3d(${ROTATION_AXIS[axis]}, ${spun ? deg : 0}deg)`
}

const cubiePlace = ([x, y, z]: Vec) =>
  `translate3d(calc(${x} * var(--cubie)), calc(${-y} * var(--cubie)), calc(${z} * var(--cubie)))`

const formatMs = (ms: number) => {
  const clamped = Math.max(0, ms)
  const minutes = Math.floor(clamped / 60_000)
  const seconds = Math.floor((clamped % 60_000) / 1000)
  const centis = String(Math.floor((clamped % 1000) / 10)).padStart(2, '0')
  if (minutes > 0) {
    return `${minutes}:${String(seconds).padStart(2, '0')}.${centis}`
  }
  return `${seconds}.${centis}`
}

type Dispatch = React.Dispatch<Parameters<typeof reduce>[1]>

const useTurnClock = (turning: Turn | null, dispatch: Dispatch) => {
  const [spun, setSpun] = useState(false)

  useEffect(() => {
    if (!turning) return
    const frame = requestAnimationFrame(() => setSpun(true))
    const timeout = window.setTimeout(() => {
      setSpun(false)
      dispatch({ type: 'TURN_END', now: Date.now() })
    }, TURN_MS[turning.kind])
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(timeout)
    }
  }, [turning, dispatch])

  return spun
}

const useMoveKeys = (dispatch: Dispatch) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) {
        return
      }
      const key = event.key.toLowerCase()
      if (key === 'z') {
        event.preventDefault()
        dispatch({ type: event.shiftKey ? 'REDO' : 'UNDO' })
        return
      }
      const face = KEY_FACES[key]
      if (!face) return
      event.preventDefault()
      dispatch({
        type: 'PLAY',
        move: { face, prime: event.shiftKey },
        now: Date.now(),
      })
    }

    // capture phase, like snake: face letters stay on the cube even
    // before the global traps check the game input claim
    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true })
    }
  }, [dispatch])
}

type DragSession = {
  x: number
  y: number
  face: Face | null
  prime: boolean
  moved: boolean
}

type Orbit = { rotateX: number; rotateY: number }

const useOrbitAndTap = (dispatch: Dispatch) => {
  const [orbit, setOrbit] = useState<Orbit>({ rotateX: -24, rotateY: -38 })
  const session = useRef<DragSession | null>(null)

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.button !== 2) return
    const target = event.target as Element
    const face = target.closest('[data-face]')?.getAttribute('data-face')
    session.current = {
      x: event.clientX,
      y: event.clientY,
      face: (face as Face) ?? null,
      prime: event.button === 2 || event.shiftKey,
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = session.current
    if (!drag) return
    const deltaX = event.clientX - drag.x
    const deltaY = event.clientY - drag.y
    if (!drag.moved && Math.hypot(deltaX, deltaY) < 6) return
    drag.moved = true
    drag.x = event.clientX
    drag.y = event.clientY
    setOrbit((prev) => ({
      rotateX: clamp(prev.rotateX - deltaY * 0.4, -80, 80),
      rotateY: prev.rotateY + deltaX * 0.4,
    }))
  }

  const onPointerUp = () => {
    const drag = session.current
    session.current = null
    if (!drag || drag.moved || !drag.face) return
    dispatch({
      type: 'PLAY',
      move: { face: drag.face, prime: drag.prime },
      now: Date.now(),
    })
  }

  return { orbit, onPointerDown, onPointerMove, onPointerUp }
}

const TimerReadout: React.FC<{ timer: TimerState }> = ({ timer }) => {
  const startedAt = timer.status === 'running' ? timer.startedAt : null
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (startedAt === null) {
      setElapsed(0)
      return
    }
    const tick = window.setInterval(
      () => setElapsed(Date.now() - startedAt),
      TIMER_TICK_MS,
    )
    return () => window.clearInterval(tick)
  }, [startedAt])

  if (timer.status === 'done') return <>{formatMs(timer.resultMs)}</>
  return <>{formatMs(startedAt === null ? 0 : elapsed)}</>
}

const Cubie: React.FC<{
  position: Vec
  stickers: Stickers
}> = ({ position, stickers }) => {
  return (
    <div className={css.cubie} style={{ transform: cubiePlace(position) }}>
      {FACES.map((face) => {
        const normal = FACE_NORMAL[face]
        const axis = axisOf(normal)
        const outward = position[axis] === normal[axis]
        // interior tiles inset 1px: exactly coplanar neighbor tiles trip
        // the preserve-3d compositor on first paint (dark notches)
        if (!outward) {
          return (
            <div
              key={face}
              className={css.plastic}
              style={{
                transform: `${FACE_PLACE[face]} translateZ(calc(var(--half) - 1px))`,
              }}
            />
          )
        }
        const color = stickers[slotIndex(position, normal)]
        return (
          <div
            key={face}
            className={css.sticker}
            data-face={face}
            style={
              {
                transform: `${FACE_PLACE[face]} translateZ(var(--half))`,
                '--tint': FACE_COLOR[color],
              } as React.CSSProperties
            }
          />
        )
      })}
    </div>
  )
}

const statusWord = (state: GameState, solved: boolean) => {
  if (state.phase !== 'idle') return STATUS[state.phase]
  if (state.timer.status === 'done' && !solved) return 'zen'
  return TIMER_WORD[state.timer.status]
}

export default function RubiksView() {
  const [state, dispatch] = useReducer(reduce, initialState)
  const spun = useTurnClock(state.turning, dispatch)
  const { orbit, ...pointerProps } = useOrbitAndTap(dispatch)
  useGameInput()
  useMoveKeys(dispatch)

  const solved = isSolved(state.stickers)
  const busy = state.phase !== 'idle'
  const pristine =
    solved && state.history.length === 0 && state.turning === null
  const status = statusWord(state, solved)

  const turningFace = state.turning?.move.face
  const [turningCubies, restingCubies] = partition(
    CUBIES,
    (position) => turningFace !== undefined && inLayer(position, turningFace),
  )

  const scramble = () =>
    dispatch({
      type: 'SCRAMBLE',
      moves: randomScramble(SCRAMBLE_LENGTH, Math.random),
    })

  const turnMs = state.turning ? TURN_MS[state.turning.kind] : TURN_MS.play

  return (
    <Shell className={`relative w-full px-4 text-white ${css.page}`}>
      <div className={css.navRow}>
        <Row
          right={
            <Link url='/'>
              <LinkBack>Home</LinkBack>
            </Link>
          }
        />
      </div>

      <section className={css.stage}>
        <header className={css.header}>
          <p className={css.eyebrow}>
            <span className={css.signal} aria-hidden='true' /> Solve station /
            pb {PB_LABEL}
          </p>
          <h1 className={`font-serif ${css.title}`}>
            Rubik&rsquo;s<span aria-hidden='true'>3×3</span>
          </h1>
          <p className={css.tagline}>
            fifty-four stickers · every mess unwinds
          </p>
        </header>

        <div
          className={css.deck}
          data-status={status}
          style={{ '--turn-ms': `${turnMs - 30}ms` } as React.CSSProperties}
        >
          <aside className={`${css.hud} ${css.hudLeft}`} aria-hidden='true'>
            <p className={css.hudItem}>
              <span className={css.hudLabel}>moves</span>
              <span className={css.hudValue}>{state.history.length}</span>
            </p>
            <p className={css.hudItem}>
              <span className={css.hudLabel}>state</span>
              <span className={css.hudValue}>{status}</span>
            </p>
          </aside>

          {/* biome-ignore lint/a11y/noStaticElementInteractions: stickers are pointer sugar, every move has a keyboard path */}
          <div
            className={css.pit}
            onContextMenu={(event) => event.preventDefault()}
            {...pointerProps}
          >
            <div className={css.mat} aria-hidden='true' />
            <div className={css.float}>
              <div
                className={css.scene}
                style={{
                  transform: `rotateX(${orbit.rotateX}deg) rotateY(${orbit.rotateY}deg)`,
                }}
              >
                <div
                  className={css.pivot}
                  style={{
                    transform: state.turning
                      ? turnTransform(state.turning.move, spun)
                      : undefined,
                    transition:
                      state.turning && spun
                        ? 'transform var(--turn-ms) cubic-bezier(0.2, 0.6, 0.2, 1)'
                        : undefined,
                  }}
                >
                  {turningCubies.map((position) => (
                    <Cubie
                      key={position.join()}
                      position={position}
                      stickers={state.stickers}
                    />
                  ))}
                </div>
                {restingCubies.map((position) => (
                  <Cubie
                    key={position.join()}
                    position={position}
                    stickers={state.stickers}
                  />
                ))}
              </div>
            </div>
          </div>

          <aside className={`${css.hud} ${css.hudRight}`} aria-hidden='true'>
            <p className={css.hudItem}>
              <span className={css.hudLabel}>time</span>
              <span className={css.hudValue}>
                <TimerReadout timer={state.timer} />
              </span>
            </p>
            <p className={css.hudItem}>
              <span className={css.hudLabel}>record</span>
              <span className={css.hudValue}>{PB_LABEL}</span>
            </p>
          </aside>
        </div>

        <div className={css.controls}>
          <button
            type='button'
            className={css.key}
            disabled={busy}
            onClick={scramble}
          >
            Scramble
          </button>
          <button
            type='button'
            className={css.key}
            disabled={busy || state.history.length === 0}
            onClick={() => dispatch({ type: 'UNDO' })}
          >
            Undo
          </button>
          <button
            type='button'
            className={css.key}
            disabled={busy || state.redo.length === 0}
            onClick={() => dispatch({ type: 'REDO' })}
          >
            Redo
          </button>
          <button
            type='button'
            className={`${css.key} ${css.keySolve}`}
            disabled={busy || compress(state.history).length === 0}
            onClick={() => dispatch({ type: 'SOLVE' })}
          >
            Solve
          </button>
          <button
            type='button'
            className={css.key}
            disabled={pristine}
            onClick={() => dispatch({ type: 'RESET' })}
          >
            Reset
          </button>
        </div>

        <p className={css.hint}>
          <span>turn</span>
          <kbd>u</kbd>
          <kbd>d</kbd>
          <kbd>l</kbd>
          <kbd>r</kbd>
          <kbd>f</kbd>
          <kbd>b</kbd>
          <span>reverse</span>
          <kbd>shift</kbd>
          <span>undo</span>
          <kbd>z</kbd>
          <span>orbit</span>
          <kbd>drag</kbd>
        </p>
        <p className='sr-only' role='status'>
          {solved && !pristine && state.timer.status === 'done'
            ? `Cube solved in ${formatMs(state.timer.resultMs)} seconds.`
            : `Cube ${status}. ${state.history.length} moves on record.`}
        </p>
      </section>
    </Shell>
  )
}
