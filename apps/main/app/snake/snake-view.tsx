'use client'

import type React from 'react'
import { useEffect, useReducer, useRef, useState } from 'react'
import { tapHaptic } from 'services/haptics'
import { useGameInput } from 'services/hotkeys'
import { GoBack, LinkBack } from 'services/link'
import Row from 'services/row'
import Shell from 'services/shell'
import { useResetOnHide } from 'services/use-reset-on-hide'
import { match } from 'ts-pattern'
import consoleDeck from './console-deck.module.css'
import {
  type Dir,
  initialState,
  MENU_ITEMS,
  type Phase,
  reduce,
} from './engine'
import {
  HOTSPOTS,
  type Hotspot,
  HotspotButton,
  nearestActionableHotspot,
  pressProps,
} from './hotspots'
import { drawFrame, LCD_H, LCD_W } from './lcd'
import css from './snake.module.css'
import { isMuted, play, setMuted } from './sound'
import {
  useGameClock,
  useKeypad,
  usePauseOnHide,
  useStoredProgress,
  useTransitionSounds,
} from './use-snake-effects'

const HUD_PHASE: Record<Phase, string> = {
  menu: 'menu',
  level: 'level',
  tops: 'tops',
  running: 'run',
  paused: 'pause',
  over: 'over',
}

const lcdDigits = (value: number) => String(value).padStart(4, '0')

export default function SnakeView() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const routedPressRef = useRef<{ id: string; pointerId: number } | null>(null)
  const [state, dispatch] = useReducer(reduce, initialState)
  const [pressed, setPressed] = useState<ReadonlySet<string>>(new Set())
  const [soundOff, setSoundOff] = useState(false)
  useGameInput()
  useResetOnHide(() => dispatch({ type: 'RESET' }))

  useEffect(() => {
    setSoundOff(isMuted())
  }, [])

  const toggleSound = () => {
    const next = !soundOff
    setMuted(next)
    setSoundOff(next)
    tapHaptic()
    if (!next) play('key')
  }

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

  const hotspotAction = (spot: Hotspot): (() => void) =>
    match(spot)
      .with({ kind: 'dir' }, ({ dir }) => () => {
        play('key')
        tapHaptic()
        steer(dir)
      })
      .with({ kind: 'select' }, () => select)
      .with({ kind: 'key' }, () => () => {
        play('key')
        tapHaptic()
      })
      .exhaustive()

  const routeTouchPress = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      !event.isPrimary ||
      (event.pointerType !== 'touch' && event.pointerType !== 'pen')
    ) {
      return
    }
    const spot = nearestActionableHotspot(event.currentTarget, {
      x: event.clientX,
      y: event.clientY,
    })
    if (!spot) return
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      return
    }
    routedPressRef.current = { id: spot.id, pointerId: event.pointerId }
    pressSpot(spot.id, true)
    hotspotAction(spot)()
    // never preventDefault here: cancelling the pointerdown suppresses the
    // compatibility mouse events, so the trailing click arrives with
    // detail 0 and pressProps re-fires the action as a keyboard click
    event.stopPropagation()
  }

  const endRoutedPress = (event: React.PointerEvent<HTMLDivElement>) => {
    const routed = routedPressRef.current
    if (!routed || routed.pointerId !== event.pointerId) return
    routedPressRef.current = null
    pressSpot(routed.id, false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId)
      } catch {
        // The browser may end a touch before React receives pointerup.
      }
    }
    event.stopPropagation()
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
    <Shell className={`relative w-full px-4 text-white ${css.page}`}>
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
            <div className={css.navControls}>
              <GoBack>
                <LinkBack>Back</LinkBack>
              </GoBack>
              <button
                type='button'
                className={css.soundToggle}
                aria-pressed={!soundOff}
                onClick={toggleSound}
              >
                SFX <span aria-hidden='true'>{soundOff ? 'OFF' : 'ON'}</span>
              </button>
            </div>
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

        <div className={consoleDeck.consoleDeck} data-phase={state.phase}>
          <aside
            className={`${consoleDeck.hud} ${consoleDeck.hudLeft}`}
            aria-hidden='true'
          >
            <p className={consoleDeck.hudItem}>
              <span className={consoleDeck.hudLabel}>score</span>
              <span className={consoleDeck.hudValue}>
                {lcdDigits(state.score)}
              </span>
            </p>
            <p className={consoleDeck.hudItem}>
              <span className={consoleDeck.hudLabel}>mode</span>
              <span className={consoleDeck.hudValue}>
                {HUD_PHASE[state.phase]}
              </span>
            </p>
          </aside>
          <div className={consoleDeck.phone}>
            <div
              className={consoleDeck.inner}
              onLostPointerCapture={endRoutedPress}
              onPointerCancelCapture={endRoutedPress}
              onPointerDownCapture={routeTouchPress}
              onPointerUpCapture={endRoutedPress}
            >
              <img
                src='/images/nokia-3310.webp'
                alt=''
                width={640}
                height={1489}
                draggable={false}
                className={consoleDeck.body}
              />
              <button
                type='button'
                tabIndex={-1}
                className={consoleDeck.screen}
                aria-label='Start or pause'
                {...pressProps(select)}
              >
                <canvas
                  ref={canvasRef}
                  width={LCD_W}
                  height={LCD_H}
                  className={consoleDeck.lcd}
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
          <aside
            className={`${consoleDeck.hud} ${consoleDeck.hudRight}`}
            aria-hidden='true'
          >
            <p className={consoleDeck.hudItem}>
              <span className={consoleDeck.hudLabel}>top</span>
              <span className={consoleDeck.hudValue}>
                {lcdDigits(state.top)}
              </span>
            </p>
            <p className={consoleDeck.hudItem}>
              <span className={consoleDeck.hudLabel}>level</span>
              <span className={consoleDeck.hudValue}>{state.level}</span>
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
