'use client'

import { partition } from 'es-toolkit'
import type React from 'react'
import { useReducer } from 'react'
import { useGameInput } from 'services/hotkeys'
import Link, { LinkBack } from 'services/link'
import Row from 'services/row'
import Shell from 'services/shell'
import {
  TURN_MS,
  useMoveKeys,
  useOrbitAndTap,
  useTurnClock,
} from './cube-controls'
import { Cubie } from './cubie'
import {
  axisOf,
  compress,
  FACE_NORMAL,
  type GameState,
  initialState,
  inLayer,
  isSolved,
  type Move,
  type Phase,
  randomScramble,
  reduce,
  type TimerState,
  type Vec,
} from './engine'
import css from './rubiks.module.css'
import { formatMs, TimerReadout } from './timer-readout'

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

const SCRAMBLE_LENGTH = 22
const PB_LABEL = '27.21'

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

const statusWord = (state: GameState, solved: boolean) => {
  if (state.phase !== 'idle') return STATUS[state.phase]
  if (state.timer.status === 'done' && !solved) return 'zen'
  return TIMER_WORD[state.timer.status]
}

export default function RubiksView() {
  const [state, dispatch] = useReducer(reduce, initialState)
  const spun = useTurnClock(state.turning, dispatch)
  const { orbit, onOrbitKeyDown, ...pointerProps } = useOrbitAndTap(dispatch)
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

          <div
            className={css.pit}
            role='application'
            // biome-ignore lint/a11y/noNoninteractiveTabindex: role=application stage, arrow-key orbit needs focus (same pattern as the meridian map)
            tabIndex={0}
            aria-label='Cube view. Arrow keys rotate the camera. Face keys u, d, l, r, f, b turn layers, with Shift for counterclockwise.'
            onContextMenu={(event) => event.preventDefault()}
            onKeyDown={onOrbitKeyDown}
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
