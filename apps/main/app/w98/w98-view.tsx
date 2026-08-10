'use client'

import { useEffect, useReducer, useRef, useState } from 'react'
import { useHotkeys } from 'services/hotkeys'
import Shell from 'services/shell'
import { useRouteTransition } from 'services/transition/context'
import {
  type AppId,
  bootApps,
  INITIAL_DESKTOP,
  reduceDesktop,
} from './desktop.ts'
import {
  DesktopIcons,
  type GuardNav,
  useDesktopShortcuts,
} from './desktop-icons'
import { createGame, type MinesState, reduce } from './engine'
import { chromeFocusTarget, INITIAL_CHROME, reduceChrome } from './menu-state'
import type { Flag, Sweep } from './mines-board'
import {
  DEFAULT_LEVEL,
  type Density,
  type InputMode,
  levelFor,
  sameLevel,
  useDeskFit,
  useSoundPref,
  useSweepClock,
  useSweepCues,
} from './mines-session'
import { HelpWindow, MinesWindow } from './mines-window'
import MusicView, { type WinampPanelId } from './music/music-view'
import PaintWindow, { type PaintHandle } from './paint/paint-view'
import RealPlayerWindow from './realplayer/realplayer-view'
import { type MenuContext, useMenuTriggers } from './start-menu'
import { createSweepAudio } from './sweep-audio'
import { Taskbar } from './taskbar'
import css from './w98.module.css'
import { AppArea, useWindowDrag } from './window-chrome'

const STATUS_REPORT = {
  idle: '',
  playing: '',
  won: 'Field cleared. You win.',
  lost: 'Mine hit. You lose.',
} satisfies Record<MinesState['status'], string>

const rollSeed = () => Math.floor(Math.random() * 2 ** 32)

export default function Windows98View() {
  const [desktop, desktopDispatch] = useReducer(reduceDesktop, INITIAL_DESKTOP)
  const [state, dispatch] = useReducer(reduce, DEFAULT_LEVEL, createGame)
  const [density, setDensity] = useState<Density>('beginner')
  const [pressing, setPressing] = useState(false)
  const [chrome, chromeDispatch] = useReducer(reduceChrome, INITIAL_CHROME)
  const [inputMode, setInputMode] = useState<InputMode>('sweep')
  const [audio] = useState(createSweepAudio)
  const deskRef = useRef<HTMLDivElement>(null)
  const workAreaRef = useRef<HTMLDivElement>(null)
  const paintRef = useRef<PaintHandle | null>(null)
  const triggers = useMenuTriggers()
  const prevChromeRef = useRef(chrome)
  const gameDrag = useWindowDrag(workAreaRef)
  const paintDrag = useWindowDrag(workAreaRef)
  const realDrag = useWindowDrag(workAreaRef)
  const helpDrag = useWindowDrag(workAreaRef)
  const icons = useDesktopShortcuts()
  const transition = useRouteTransition()

  const { sound, toggle: toggleSoundPref } = useSoundPref(audio)
  useSweepCues(state, audio)
  const fit = useDeskFit(deskRef)
  const { seconds, reset: resetClock } = useSweepClock(state.status)

  const live = state.status === 'idle' || state.status === 'playing'
  const minesWindow = desktop.apps.mines
  const paintWindow = desktop.apps.paint

  const launchApp = (app: AppId) => {
    chromeDispatch({ type: 'menu', menu: null })
    desktopDispatch({ type: 'launch', app })
  }

  const activateApp = (app: AppId) => desktopDispatch({ type: 'activate', app })

  const guardNav: GuardNav = (event, url) => {
    const paint = paintRef.current
    if (!paintWindow.open || !paint?.isDirty()) return
    event.preventDefault()
    chromeDispatch({ type: 'start', startMenu: 'closed' })
    desktopDispatch({ type: 'launch', app: 'paint' })
    paint.confirmExit(() => transition.navigateLater(url, 360))
  }

  useEffect(() => {
    for (const app of bootApps(window.location.search)) {
      desktopDispatch({ type: 'launch', app })
    }
  }, [])

  const launchWinamp = () => {
    chromeDispatch({ type: 'menu', menu: null })
    desktopDispatch({ type: 'launch-winamp' })
  }

  const startLaunch = (app: AppId) => {
    chromeDispatch({ type: 'start', startMenu: 'closed' })
    if (app === 'winamp') {
      launchWinamp()
      return
    }
    launchApp(app)
  }

  const closeWinampPanel = (panel: WinampPanelId) =>
    desktopDispatch({ type: 'close-winamp-panel', panel })

  const openWinampPanel = (panel: WinampPanelId) => {
    chromeDispatch({ type: 'menu', menu: null })
    desktopDispatch({ type: 'open-winamp-panel', panel })
  }

  const minimizeMines = () => {
    chromeDispatch({ type: 'menu', menu: null })
    desktopDispatch({ type: 'minimize', app: 'mines' })
  }

  const closeMines = () => {
    chromeDispatch({ type: 'exit-mines' })
    desktopDispatch({ type: 'close', app: 'mines' })
  }

  const handleTaskButton = (app: AppId) => {
    const appWindow = desktop.apps[app]
    if (desktop.active === app && !appWindow.minimized) {
      desktopDispatch({ type: 'minimize', app })
      return
    }
    launchApp(app)
  }

  const newGame = (nextDensity: Density) => {
    setDensity(nextDensity)
    dispatch({
      type: 'reset',
      level: fit ? levelFor(fit, nextDensity) : DEFAULT_LEVEL,
    })
    resetClock()
    setInputMode('sweep')
    chromeDispatch({ type: 'menu', menu: null })
    audio.deal()
  }

  const toggleSound = () => {
    toggleSoundPref()
    chromeDispatch({ type: 'menu', menu: null })
  }

  const menu: MenuContext = {
    chrome,
    chromeDispatch,
    triggers,
    startLaunch,
    guardNav,
  }

  const sweep: Sweep = (index) =>
    dispatch({ type: 'reveal', index, seed: rollSeed() })

  const flag: Flag = (index) => {
    const cell = state.cells[index]
    if (!live || cell.revealed) return
    if (cell.flagged) audio.flagOff()
    else audio.flagOn()
    dispatch({ type: 'flag', index })
  }

  useEffect(() => {
    if (!fit || state.status !== 'idle') return
    const target = levelFor(fit, density)
    if (sameLevel(target, state.level)) return
    dispatch({ type: 'reset', level: target })
  }, [fit, density, state.status, state.level])

  useEffect(() => {
    const target = chromeFocusTarget(prevChromeRef.current, chrome)
    prevChromeRef.current = chrome
    if (target) triggers.focus(target)
  }, [chrome, triggers])

  useHotkeys([
    [
      'F2',
      () => {
        if (
          desktop.active === 'mines' &&
          minesWindow.open &&
          !minesWindow.minimized
        )
          newGame(density)
      },
    ],
    [
      'Escape',
      () => {
        chromeDispatch({ type: 'escape' })
      },
    ],
  ])

  return (
    <Shell className={css.frame}>
      <section
        className={css.desktop}
        aria-label='Windows 98 desktop'
        onPointerDown={icons.clear}
      >
        <h1 className='sr-only'>
          Windows 98 desktop with Minesweeper, Paint, Winamp, and RealPlayer
        </h1>

        <DesktopIcons
          icons={icons}
          guardNav={guardNav}
          launchApp={launchApp}
          launchWinamp={launchWinamp}
        />

        <div ref={workAreaRef} className={css.desktopWorkArea}>
          {chrome.menu && (
            <button
              type='button'
              tabIndex={-1}
              className={css.menuBackdrop}
              aria-label='Close menu'
              onClick={() => chromeDispatch({ type: 'menu', menu: null })}
            />
          )}

          <div
            ref={deskRef}
            className={css.programArea}
            data-hidden={!minesWindow.open || minesWindow.minimized}
            data-active={desktop.active === 'mines'}
            onPointerDownCapture={() => activateApp('mines')}
            onFocusCapture={() => activateApp('mines')}
          >
            {minesWindow.open && (
              <MinesWindow
                state={state}
                fit={fit}
                live={live}
                pressing={pressing}
                setPressing={setPressing}
                inputMode={inputMode}
                setInputMode={setInputMode}
                sweep={sweep}
                flag={flag}
                seconds={seconds}
                density={density}
                sound={sound}
                newGame={newGame}
                toggleSound={toggleSound}
                chrome={chrome}
                chromeDispatch={chromeDispatch}
                gameTriggerRef={triggers.register('game')}
                helpTriggerRef={triggers.register('help')}
                gameDrag={gameDrag}
                minimizeMines={minimizeMines}
                closeMines={closeMines}
              />
            )}
          </div>

          <AppArea
            app='paint'
            className={css.paintArea}
            desktop={desktop}
            activate={activateApp}
            activateOnFocus
          >
            <PaintWindow
              ref={paintRef}
              dragStyle={paintDrag.style}
              dragHandle={paintDrag.handle}
              active={desktop.active === 'paint' && !paintWindow.minimized}
              minimize={() =>
                desktopDispatch({ type: 'minimize', app: 'paint' })
              }
              close={() => desktopDispatch({ type: 'close', app: 'paint' })}
            />
          </AppArea>

          <AppArea
            app='winamp'
            className={css.winampArea}
            desktop={desktop}
            activate={activateApp}
            activateOnFocus
          >
            <MusicView
              panels={desktop.winampPanels}
              onClosePanel={closeWinampPanel}
              onOpenPanel={openWinampPanel}
            />
          </AppArea>

          <AppArea
            app='realplayer'
            className={css.realplayerArea}
            desktop={desktop}
            activate={activateApp}
            activateOnFocus
          >
            <RealPlayerWindow
              dragStyle={realDrag.style}
              dragHandle={realDrag.handle}
              minimize={() =>
                desktopDispatch({ type: 'minimize', app: 'realplayer' })
              }
              close={() =>
                desktopDispatch({ type: 'close', app: 'realplayer' })
              }
            />
          </AppArea>

          {chrome.helpOpen && (
            <HelpWindow
              close={() => chromeDispatch({ type: 'help', open: false })}
              drag={helpDrag}
            />
          )}
        </div>

        <Taskbar
          desktop={desktop}
          menu={menu}
          handleTaskButton={handleTaskButton}
        />

        <p role='status' className='sr-only'>
          {STATUS_REPORT[state.status]}
        </p>
      </section>
    </Shell>
  )
}
