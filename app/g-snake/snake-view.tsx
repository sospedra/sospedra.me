'use client'

import Link, { LinkBack } from 'components/Link'
import Row from 'components/Row'
import Shell from 'components/Shell'
import type React from 'react'
import { useEffect, useReducer, useRef, useState } from 'react'
import { useGameInput } from 'service/hotkeys'
import {
  type Dir,
  type GameEvent,
  type GameState,
  initialState,
  MENU_ITEMS,
  type Phase,
  reduce,
  stepMsFor,
} from './engine'
import css from './g-snake.module.css'
import { drawFrame, LCD_H, LCD_W } from './lcd'
import { play, transitionSound } from './sound'

const TOP_KEY = 'g-snake-top'
const LEVEL_KEY = 'g-snake-level'

const HUD_PHASE: Record<Phase, string> = {
  menu: 'menu',
  level: 'level',
  tops: 'tops',
  running: 'run',
  paused: 'pause',
  over: 'over',
}

const lcdDigits = (value: number) => String(value).padStart(4, '0')

const KEY_TURNS: Record<string, Dir> = {
  ArrowUp: 'up',
  w: 'up',
  W: 'up',
  '2': 'up',
  ArrowLeft: 'left',
  a: 'left',
  A: 'left',
  '4': 'left',
  ArrowDown: 'down',
  s: 'down',
  S: 'down',
  '8': 'down',
  ArrowRight: 'right',
  d: 'right',
  D: 'right',
  '6': 'right',
}

const KEY_SELECT = new Set(['5', 'Enter', ' '])

// physical keys light their phone button, like fingers would
const DIR_SPOT: Record<Dir, string> = {
  up: '2',
  left: '4',
  down: '8',
  right: '6',
}

const spotForKey = (key: string) => {
  const dir = KEY_TURNS[key]
  if (dir) return DIR_SPOT[dir]
  return KEY_SELECT.has(key) ? '5' : null
}

// percent rects measured over public/images/nokia-3310.webp
type Hotspot = {
  id: string
  x: number
  y: number
  w: number
  h: number
  label?: string
  dir?: Dir
  select?: boolean
}

const HOTSPOTS: Hotspot[] = [
  {
    id: 'navi',
    x: 29.5,
    y: 50.3,
    w: 41,
    h: 5.5,
    label: 'Start or pause',
    select: true,
  },
  { id: 'soft-left', x: 13.3, y: 53.7, w: 21.9, h: 8.7 },
  { id: 'soft-right', x: 54.2, y: 56.2, w: 26, h: 7.5 },
  { id: '1', x: 10.2, y: 65.5, w: 21, h: 6.2 },
  { id: '2', x: 39.1, y: 67.2, w: 21, h: 6.2, label: 'Steer up', dir: 'up' },
  { id: '3', x: 68.8, y: 65.1, w: 21, h: 6.2 },
  {
    id: '4',
    x: 11.7,
    y: 72.5,
    w: 21,
    h: 6.2,
    label: 'Steer left',
    dir: 'left',
  },
  {
    id: '5',
    x: 39.8,
    y: 74.2,
    w: 21,
    h: 6.2,
    label: 'Start or pause',
    select: true,
  },
  {
    id: '6',
    x: 68,
    y: 72.2,
    w: 21,
    h: 6.2,
    label: 'Steer right',
    dir: 'right',
  },
  { id: '7', x: 13.3, y: 79.6, w: 21, h: 6.2 },
  {
    id: '8',
    x: 39.8,
    y: 81.3,
    w: 21,
    h: 6.2,
    label: 'Steer down',
    dir: 'down',
  },
  { id: '9', x: 67.2, y: 79.2, w: 21, h: 6.2 },
  { id: 'star', x: 14.1, y: 86.6, w: 21, h: 6.2 },
  { id: '0', x: 39.8, y: 87.7, w: 21, h: 6.2 },
  { id: 'hash', x: 66.4, y: 86.3, w: 21, h: 6.2 },
]

// taps act on pointerdown; the trailing click (detail >= 1) is skipped so
// only keyboard and assistive tech clicks (detail 0) come through here
const pressProps = (act: () => void) => ({
  onPointerDown: () => act(),
  onClick: (event: React.MouseEvent) => {
    if (event.detail === 0) act()
  },
})

type Dispatch = React.Dispatch<GameEvent>
type SetPressed = React.Dispatch<React.SetStateAction<ReadonlySet<string>>>

const useStoredProgress = (state: GameState, dispatch: Dispatch) => {
  useEffect(() => {
    const top = Number(window.localStorage.getItem(TOP_KEY))
    if (top > 0) dispatch({ type: 'TOP', top })
    const level = Number(window.localStorage.getItem(LEVEL_KEY))
    if (level > 0) dispatch({ type: 'LEVEL', level })
  }, [dispatch])

  useEffect(() => {
    if (state.phase === 'over' && state.top > 0) {
      window.localStorage.setItem(TOP_KEY, String(state.top))
    }
  }, [state.phase, state.top])

  useEffect(() => {
    window.localStorage.setItem(LEVEL_KEY, String(state.level))
  }, [state.level])
}

const useGameClock = (phase: Phase, level: number, dispatch: Dispatch) => {
  useEffect(() => {
    if (phase !== 'running') return
    const id = window.setInterval(
      () => dispatch({ type: 'TICK', roll: Math.random() }),
      stepMsFor(level),
    )
    return () => window.clearInterval(id)
  }, [phase, level, dispatch])
}

const useKeypad = (dispatch: Dispatch, setPressed: SetPressed) => {
  useEffect(() => {
    const lightSpot = (key: string, down: boolean) =>
      setPressed((prev) => {
        const spot = spotForKey(key)
        if (!spot) return prev
        const next = new Set(prev)
        if (down) next.add(spot)
        else next.delete(spot)
        return next
      })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) {
        return
      }
      lightSpot(event.key, true)
      const dir = KEY_TURNS[event.key]
      if (dir) {
        event.preventDefault()
        play('key')
        dispatch({ type: 'TURN', dir, roll: Math.random() })
        return
      }
      if (!KEY_SELECT.has(event.key)) return
      event.preventDefault()
      dispatch({ type: 'SELECT', roll: Math.random() })
    }

    const onKeyUp = (event: KeyboardEvent) => {
      lightSpot(event.key, false)
    }

    const releaseAll = () => setPressed(new Set())

    // capture phase: the global hotkeys (a → /about, j/k scroll) skip
    // defaultPrevented events, so wasd stays on the snake
    window.addEventListener('keydown', onKeyDown, { capture: true })
    window.addEventListener('keyup', onKeyUp, { capture: true })
    window.addEventListener('blur', releaseAll)
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true })
      window.removeEventListener('keyup', onKeyUp, { capture: true })
      window.removeEventListener('blur', releaseAll)
    }
  }, [dispatch, setPressed])
}

const usePauseOnHide = (dispatch: Dispatch) => {
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) dispatch({ type: 'HIDE' })
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [dispatch])
}

const useTransitionSounds = (state: GameState) => {
  const prevRef = useRef(state)

  useEffect(() => {
    const sound = transitionSound(prevRef.current, state)
    prevRef.current = state
    if (sound) play(sound)
  }, [state])
}

const HotspotButton: React.FC<{
  spot: Hotspot
  down: boolean
  act: () => void
  press: (down: boolean) => void
}> = ({ spot, down, act, press }) => {
  const props = pressProps(act)
  return (
    <button
      type='button'
      data-hotspot={spot.id}
      className={down ? `${css.hotspot} ${css.down}` : css.hotspot}
      style={{
        left: `${spot.x}%`,
        top: `${spot.y}%`,
        width: `${spot.w}%`,
        height: `${spot.h}%`,
      }}
      aria-label={spot.label}
      aria-hidden={spot.label ? undefined : 'true'}
      tabIndex={spot.label ? undefined : -1}
      onClick={props.onClick}
      onPointerDown={() => {
        press(true)
        props.onPointerDown()
      }}
      onPointerUp={() => press(false)}
      onPointerLeave={() => press(false)}
      onPointerCancel={() => press(false)}
    />
  )
}

export default function SnakeView() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [state, dispatch] = useReducer(reduce, initialState)
  const [pressed, setPressed] = useState<ReadonlySet<string>>(new Set())
  useGameInput()

  const pressSpot = (id: string, down: boolean) =>
    setPressed((prev) => {
      const next = new Set(prev)
      if (down) next.add(id)
      else next.delete(id)
      return next
    })

  const steer = (dir: Dir) =>
    dispatch({ type: 'TURN', dir, roll: Math.random() })
  const select = () => dispatch({ type: 'SELECT', roll: Math.random() })

  const hotspotAction = (spot: Hotspot): (() => void) => {
    const { dir } = spot
    if (dir) {
      return () => {
        play('key')
        steer(dir)
      }
    }
    if (spot.select) return select
    return () => play('key')
  }

  useStoredProgress(state, dispatch)
  useGameClock(state.phase, state.level, dispatch)
  useKeypad(dispatch, setPressed)
  usePauseOnHide(dispatch)
  useTransitionSounds(state)

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) drawFrame(ctx, state)
  }, [state])

  const announcements: Record<Phase, string> = {
    menu: `Menu: ${MENU_ITEMS[state.menuIndex]}. 2 and 8 move, 5 selects.`,
    level: `Level ${state.level}. 4 and 6 adjust, 5 confirms.`,
    tops: `Top score ${state.top}`,
    running: `Score ${state.score}`,
    paused: 'Paused',
    over: `Game over. Score ${state.score}, top ${state.top}.`,
  }

  return (
    <Shell
      className={`relative w-full px-4 text-white ${css.page}`}
      canonical='/g-snake'
    >
      {/* the escaped snake: one-bit mural crawling the wall behind the phone */}
      <svg
        className={css.mural}
        viewBox='0 0 1200 800'
        preserveAspectRatio='xMidYMid slice'
        aria-hidden='true'
      >
        <path
          className={css.muralPath}
          d='M-40 560H200V320H120V120H400V220H640V90H980V260H1110V520H940V660H1240'
        />
        <rect
          className={css.muralFood}
          x={300}
          y={648}
          width={24}
          height={24}
        />
      </svg>

      {/* block wrapper: Row is flex-1 and would split the page column */}
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
            <span className={css.signal} aria-hidden='true' /> Pocket network /
            ch 3310
          </p>
          <h1 className={`font-serif text-4xl ${css.title}`}>
            Snake<span aria-hidden='true'>.97</span>
          </h1>
          <p className={css.tagline}>
            one-bit pocket arcade · local high score memory
          </p>
        </header>

        <div className={css.consoleDeck} data-phase={state.phase}>
          {/* aria-hidden: the sr-only status line already announces this */}
          <aside className={`${css.hud} ${css.hudLeft}`} aria-hidden='true'>
            <p className={css.hudItem}>
              <span className={css.hudLabel}>score</span>
              <span className={css.hudValue}>{lcdDigits(state.score)}</span>
            </p>
            <p className={css.hudItem}>
              <span className={css.hudLabel}>mode</span>
              <span className={css.hudValue}>{HUD_PHASE[state.phase]}</span>
            </p>
          </aside>
          <div className={css.phone}>
            <div className={css.inner}>
              <img
                src='/images/nokia-3310.webp'
                alt=''
                width={640}
                height={1489}
                draggable={false}
                className={css.body}
              />
              <button
                type='button'
                tabIndex={-1}
                className={css.screen}
                aria-label='Start or pause'
                {...pressProps(select)}
              >
                <canvas
                  ref={canvasRef}
                  width={LCD_W}
                  height={LCD_H}
                  className={css.lcd}
                  role='img'
                  aria-label='Snake game screen'
                />
              </button>
              {HOTSPOTS.map((spot) => (
                <HotspotButton
                  key={spot.id}
                  spot={spot}
                  down={pressed.has(spot.id)}
                  act={hotspotAction(spot)}
                  press={(down) => pressSpot(spot.id, down)}
                />
              ))}
            </div>
          </div>
          <aside className={`${css.hud} ${css.hudRight}`} aria-hidden='true'>
            <p className={css.hudItem}>
              <span className={css.hudLabel}>top</span>
              <span className={css.hudValue}>{lcdDigits(state.top)}</span>
            </p>
            <p className={css.hudItem}>
              <span className={css.hudLabel}>level</span>
              <span className={css.hudValue}>{state.level}</span>
            </p>
          </aside>
        </div>

        <p className={css.hint}>
          <span>steer</span>
          <kbd>arrows</kbd>
          <kbd>WASD</kbd>
          <kbd>2 4 6 8</kbd>
          <span>select / pause</span>
          <kbd>space</kbd>
          <kbd>5</kbd>
        </p>
        <p className='sr-only' role='status'>
          {announcements[state.phase]}
        </p>
      </section>
    </Shell>
  )
}
