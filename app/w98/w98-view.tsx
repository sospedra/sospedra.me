'use client'

import { clamp } from 'es-toolkit'
import type { Route } from 'next'
import type React from 'react'
import { useEffect, useReducer, useRef, useState } from 'react'
import { useHotkeys } from 'services/hotkeys'
import Link from 'services/link'
import Shell from 'services/shell'
import { readLocal, writeLocal } from 'services/storage'
import { useRouteTransition } from 'services/transition/context'
import { match } from 'ts-pattern'
import { GAMES } from '../games/catalogue'
import {
  type AppId,
  bootApps,
  type DesktopState,
  INITIAL_DESKTOP,
  reduceDesktop,
} from './desktop.ts'
import {
  type Cell,
  createGame,
  type Level,
  type MinesState,
  type MinesStatus,
  minesLeft,
  reduce,
} from './engine'
import MusicView, { type WinampPanelId } from './music/music-view'
import PaintWindow, { type PaintHandle } from './paint/paint-view'
import RealPlayerWindow from './realplayer/realplayer-view'
import { createSweepAudio, type SweepAudio } from './sweep-audio'
import css from './w98.module.css'

const SOUND_KEY = 'g-mines-sound'

type Density = 'beginner' | 'intermediate' | 'expert'
type InputMode = 'sweep' | 'flag'

const DENSITIES = {
  beginner: 0.12,
  intermediate: 0.16,
  expert: 0.21,
} satisfies Record<Density, number>

const DENSITY_NAMES = Object.keys(DENSITIES) as Density[]

const DEFAULT_LEVEL: Level = { rows: 9, cols: 9, mines: 10 }

// px mirror of the Win98 window chrome in w98.module.css: titlebar, menubar,
// touch tools, HUD, field padding and bevels; slack lands in the desktop
const CELL_WIDE = 32
const CELL_NARROW = 26
const NARROW_DESK = 560
const CHROME_X = 28
const CHROME_Y_WIDE = 164
const CHROME_Y_NARROW = 210

type Fit = { cols: number; rows: number; cell: number }

const fitFor = (width: number, height: number): Fit => {
  const cell = width < NARROW_DESK ? CELL_NARROW : CELL_WIDE
  const chromeY = cell === CELL_NARROW ? CHROME_Y_NARROW : CHROME_Y_WIDE
  return {
    cell,
    cols: clamp(Math.floor((width - CHROME_X) / cell), 9, 44),
    rows: clamp(Math.floor((height - chromeY) / cell), 9, 26),
  }
}

const sameFit = (a: Fit, b: Fit) =>
  a.cols === b.cols && a.rows === b.rows && a.cell === b.cell

const levelFor = (fit: Fit, density: Density): Level => ({
  rows: fit.rows,
  cols: fit.cols,
  mines: Math.max(10, Math.round(fit.rows * fit.cols * DENSITIES[density])),
})

const sameLevel = (a: Level, b: Level) =>
  a.rows === b.rows && a.cols === b.cols && a.mines === b.mines

const FACES = {
  idle: '☺',
  playing: '☺',
  won: '☻',
  lost: '☹',
} satisfies Record<MinesState['status'], string>

const STATUS_REPORT = {
  idle: '',
  playing: '',
  won: 'Field cleared. You win.',
  lost: 'Mine hit. You lose.',
} satisfies Record<MinesState['status'], string>

const STATUS_LABEL = {
  idle: 'Ready',
  playing: 'Clearing',
  won: 'You won',
  lost: 'Game over',
} satisfies Record<MinesState['status'], string>

const rollSeed = () => Math.floor(Math.random() * 2 ** 32)

const lcd = (value: number): string => {
  const clamped = clamp(value, -99, 999)
  if (clamped < 0) return `-${String(-clamped).padStart(2, '0')}`
  return String(clamped).padStart(3, '0')
}

type CellView = {
  variant: 'hidden' | 'revealed' | 'boom' | 'wrong'
  glyph: string
  label: string
}

const viewCell = (state: MinesState, cell: Cell, index: number): CellView => {
  const wrongFlag = state.status === 'lost' && cell.flagged && !cell.mine
  if (wrongFlag) return { variant: 'wrong', glyph: '✹', label: 'Wrong flag' }
  if (cell.flagged) return { variant: 'hidden', glyph: '⚑', label: 'Flagged' }
  if (!cell.revealed) return { variant: 'hidden', glyph: '', label: 'Hidden' }
  if (cell.mine) {
    const variant = index === state.detonated ? 'boom' : 'revealed'
    return { variant, glyph: '✹', label: 'Mine' }
  }
  if (cell.adjacent === 0)
    return { variant: 'revealed', glyph: '', label: 'Clear' }
  return {
    variant: 'revealed',
    glyph: String(cell.adjacent),
    label: `${cell.adjacent} mines adjacent`,
  }
}

type Sweep = (index: number) => void
type Flag = (index: number) => void

const CellButton: React.FC<{
  state: MinesState
  index: number
  inputMode: InputMode
  sweep: Sweep
  flag: Flag
}> = ({ state, index, inputMode, sweep, flag }) => {
  const cell = state.cells[index]
  const view = viewCell(state, cell, index)
  const { cols } = state.level
  const position = `${Math.floor(index / cols) + 1}:${(index % cols) + 1}`
  const act = inputMode === 'flag' ? flag : sweep

  return (
    <button
      type='button'
      className={css.cell}
      data-variant={view.variant}
      data-adjacent={cell.revealed && !cell.mine ? cell.adjacent : undefined}
      aria-label={`Cell ${position}, ${view.label}. ${inputMode === 'flag' ? 'Flag' : 'Sweep'} mode selected.`}
      onClick={() => act(index)}
      onContextMenu={(event) => {
        event.preventDefault()
        flag(index)
      }}
      onKeyDown={(event) => {
        if (event.key.toLowerCase() === 'f') {
          event.preventDefault()
          flag(index)
        }
      }}
    >
      {view.glyph}
    </button>
  )
}

const GameMenu: React.FC<{
  density: Density
  sound: boolean
  newGame: (density: Density) => void
  toggleSound: () => void
  exit: () => void
}> = ({ density, sound, newGame, toggleSound, exit }) => (
  <div className={css.menu}>
    <button
      type='button'
      className={css.menuItem}
      onClick={() => newGame(density)}
    >
      <span>New</span>
      <kbd>F2</kbd>
    </button>
    <hr />
    {DENSITY_NAMES.map((name) => (
      <button
        key={name}
        type='button'
        aria-pressed={name === density}
        className={css.menuItem}
        onClick={() => newGame(name)}
      >
        <span>
          <span className={css.check} aria-hidden='true'>
            {name === density ? '✓' : ''}
          </span>
          {name}
        </span>
        <span className={css.menuNote}>
          {Math.round(DENSITIES[name] * 100)}%
        </span>
      </button>
    ))}
    <hr />
    <button
      type='button'
      aria-pressed={sound}
      className={css.menuItem}
      onClick={toggleSound}
    >
      <span>
        <span className={css.check} aria-hidden='true'>
          {sound ? '✓' : ''}
        </span>
        Sound
      </span>
    </button>
    <hr />
    <button type='button' className={css.menuItem} onClick={exit}>
      Exit
    </button>
  </div>
)

const WindowControls: React.FC<{
  appName: string
  minimize: () => void
  close: () => void
}> = ({ appName, minimize, close }) => (
  <span className={css.windowControls}>
    <button type='button' aria-label={`Minimize ${appName}`} onClick={minimize}>
      _
    </button>
    <span aria-hidden='true'>□</span>
    <button type='button' aria-label={`Close ${appName}`} onClick={close}>
      ×
    </button>
  </span>
)

const HelpWindow: React.FC<{ close: () => void; drag: WindowDrag }> = (
  props,
) => {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  return (
    <section
      className={css.helpWindow}
      style={props.drag.style}
      aria-label='Minesweeper help'
    >
      <header className={css.titlebar} {...props.drag.handle}>
        <span className={css.appIcon} aria-hidden='true' />
        <strong>Help</strong>
        <span className={css.windowControls}>
          <button
            ref={closeRef}
            type='button'
            aria-label='Close help'
            onClick={props.close}
          >
            ×
          </button>
        </span>
      </header>
      <div className={css.helpBody}>
        <ul>
          <li>Left click sweeps a cell.</li>
          <li>
            Right click plants a flag. <kbd>f</kbd> on a focused cell works too.
          </li>
          <li>On touch screens, switch to Flag mode before tapping a cell.</li>
          <li>Click a satisfied number to sweep its neighbors at once.</li>
          <li>The first sweep is never a mine.</li>
          <li>
            The field is dealt to fit your screen. Difficulty sets density.
          </li>
          <li>Sound toggles in the Game menu.</li>
          <li>
            <kbd>F2</kbd> deals a new board.
          </li>
        </ul>
        <button type='button' className={css.okButton} onClick={props.close}>
          OK
        </button>
      </div>
    </section>
  )
}

const useSoundPref = (audio: SweepAudio) => {
  const [sound, setSound] = useState(true)

  useEffect(() => {
    if (readLocal(SOUND_KEY) !== 'off') return
    setSound(false)
    audio.setEnabled(false)
  }, [audio])

  const toggle = () => {
    const next = !sound
    setSound(next)
    audio.setEnabled(next)
    writeLocal(SOUND_KEY, next ? 'on' : 'off')
  }

  return { sound, toggle }
}

const useSweepCues = (state: MinesState, audio: SweepAudio) => {
  const revealedRef = useRef(0)

  useEffect(() => {
    const revealed = state.cells.filter((cell) => cell.revealed).length
    const grew = revealed > revealedRef.current
    revealedRef.current = revealed
    if (grew && state.status === 'playing') audio.sweep()
  }, [state, audio])

  useEffect(() => {
    if (state.status === 'lost') audio.boom()
    if (state.status === 'won') audio.win()
  }, [state.status, audio])
}

const useDeskFit = (deskRef: React.RefObject<HTMLDivElement | null>) => {
  const [fit, setFit] = useState<Fit | null>(null)

  useEffect(() => {
    const desk = deskRef.current
    if (!desk) return
    const measure = () => {
      const rect = desk.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const next = fitFor(rect.width, rect.height)
      setFit((prev) => (prev && sameFit(prev, next) ? prev : next))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(desk)
    return () => observer.disconnect()
  }, [deskRef])

  return fit
}

type WindowGrab = {
  pointer: number
  originX: number
  originY: number
  baseX: number
  baseY: number
  titlebar: DOMRect
  area: DOMRect
}

// reachable slack: a dragged-out window keeps this much titlebar on screen
const DRAG_SLACK = 48

const within = (value: number, lower: number, upper: number): number =>
  lower > upper ? 0 : clamp(value, lower, upper)

const useWindowDrag = (areaRef: React.RefObject<HTMLDivElement | null>) => {
  const [shift, setShift] = useState({ x: 0, y: 0 })
  const grabRef = useRef<WindowGrab | null>(null)

  const onPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (event.target instanceof Element && event.target.closest('button, a'))
      return
    const area = areaRef.current
    if (!area) return
    event.currentTarget.setPointerCapture(event.pointerId)
    grabRef.current = {
      pointer: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      baseX: shift.x,
      baseY: shift.y,
      titlebar: event.currentTarget.getBoundingClientRect(),
      area: area.getBoundingClientRect(),
    }
  }

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const grab = grabRef.current
    if (!grab || grab.pointer !== event.pointerId) return
    const { titlebar, area } = grab
    const dx = within(
      event.clientX - grab.originX,
      area.left - titlebar.right + DRAG_SLACK,
      area.right - titlebar.left - DRAG_SLACK,
    )
    const dy = within(
      event.clientY - grab.originY,
      area.top - titlebar.top,
      area.bottom - titlebar.bottom,
    )
    setShift({ x: grab.baseX + dx, y: grab.baseY + dy })
  }

  const onPointerEnd = (event: React.PointerEvent<HTMLElement>) => {
    if (grabRef.current?.pointer !== event.pointerId) return
    grabRef.current = null
  }

  return {
    style: { translate: `${shift.x}px ${shift.y}px` } as React.CSSProperties,
    handle: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
    },
  }
}

type WindowDrag = ReturnType<typeof useWindowDrag>

type IconId = 'msdos' | 'recycle' | 'mines' | 'paint' | 'winamp' | 'realplayer'

// W98 icon ritual: a mouse click only selects, the double click opens;
// touch and keyboard activations (click detail 0) open in one go
const useDesktopShortcuts = () => {
  const [selected, setSelected] = useState<IconId | null>(null)
  const pointerTypeRef = useRef('mouse')

  const press = (icon: IconId, open?: () => void) => ({
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
      pointerTypeRef.current = event.pointerType
      setSelected(icon)
    },
    onClick: (event: React.MouseEvent<HTMLElement>) => {
      const selectOnly =
        pointerTypeRef.current === 'mouse' && event.detail === 1
      if (selectOnly) {
        event.preventDefault()
        return
      }
      open?.()
    },
  })

  const clear = (event: React.PointerEvent<HTMLElement>) => {
    const target = event.target instanceof Element ? event.target : null
    if (target?.closest(`.${css.desktopShortcut}`)) return
    setSelected(null)
  }

  return { selected, press, clear }
}

type DesktopShortcuts = ReturnType<typeof useDesktopShortcuts>
type GuardNav = (event: React.MouseEvent, url: Route) => void

const DesktopLink: React.FC<{
  url: Route
  label: string
  ariaLabel: string
  icon: string
  iconId: IconId
  icons: DesktopShortcuts
  guardNav: GuardNav
}> = ({ url, label, ariaLabel, icon, iconId, icons, guardNav }) => {
  const press = icons.press(iconId)
  return (
    <Link
      url={url}
      className={css.desktopShortcut}
      aria-label={ariaLabel}
      data-selected={icons.selected === iconId}
      {...press}
      onClick={(event) => {
        press.onClick(event)
        if (!event.defaultPrevented) guardNav(event, url)
      }}
    >
      <span className={icon} aria-hidden='true' />
      <span>{label}</span>
    </Link>
  )
}

const GameMenuItem: React.FC<{
  game: (typeof GAMES)[number]
  startLaunch: (app: AppId) => void
  guardNav: GuardNav
}> = ({ game, startLaunch, guardNav }) => {
  const icon = (
    <span className={css.gameIcon} data-game={game.id} aria-hidden='true' />
  )
  if (game.id === 'mines') {
    return (
      <button
        type='button'
        className={css.programItem}
        onClick={() => startLaunch('mines')}
      >
        {icon}
        {game.title}
      </button>
    )
  }
  return (
    <Link
      url={game.href}
      className={css.programItem}
      onClick={(event) => guardNav(event, game.href)}
    >
      {icon}
      {game.title}
    </Link>
  )
}

const AppArea: React.FC<{
  app: AppId
  className: string
  desktop: DesktopState
  activate: (app: AppId) => void
  activateOnFocus?: boolean
  children: React.ReactNode
}> = ({ app, className, desktop, activate, activateOnFocus, children }) => {
  const appWindow = desktop.apps[app]
  return (
    <div
      className={className}
      data-hidden={!appWindow.open || appWindow.minimized}
      data-active={desktop.active === app}
      onPointerDownCapture={() => activate(app)}
      onFocusCapture={activateOnFocus ? () => activate(app) : undefined}
    >
      {appWindow.open && children}
    </div>
  )
}

const TASKBAR_APPS: { id: AppId; label: string; icon: string }[] = [
  { id: 'mines', label: 'Minesweeper', icon: css.appIcon },
  { id: 'paint', label: 'Paint', icon: css.paintAppIcon },
  { id: 'winamp', label: 'Winamp', icon: css.winampAppIcon },
  { id: 'realplayer', label: 'RealPlayer', icon: css.realplayerAppIcon },
]

type MinesMenu = 'game' | 'help'
type StartBranch = 'closed' | 'root' | 'programs' | 'games'

type ChromeState = {
  menu: MinesMenu | null
  startMenu: StartBranch
  helpOpen: boolean
}

type ChromeEvent =
  | { type: 'menu'; menu: MinesMenu | null }
  | { type: 'start'; startMenu: StartBranch }
  | { type: 'help'; open: boolean }
  | { type: 'exit-mines' }
  | { type: 'escape' }

const INITIAL_CHROME: ChromeState = {
  menu: null,
  startMenu: 'closed',
  helpOpen: false,
}

const reduceChrome = (state: ChromeState, event: ChromeEvent): ChromeState =>
  match(event)
    .with({ type: 'menu' }, ({ menu }) => ({ ...state, menu }))
    .with({ type: 'start' }, ({ startMenu }) => ({ ...state, startMenu }))
    .with({ type: 'help' }, ({ open }) =>
      open
        ? { ...state, helpOpen: true, menu: null }
        : { ...state, helpOpen: false },
    )
    .with({ type: 'exit-mines' }, () => ({
      ...state,
      menu: null,
      helpOpen: false,
    }))
    .with({ type: 'escape' }, () => INITIAL_CHROME)
    .exhaustive()

type MenuTriggerId = 'game' | 'help' | 'start' | 'programs' | 'games'

// closing a menu unmounts the focused item; hand focus back to its trigger
const chromeFocusTarget = (
  prev: ChromeState,
  next: ChromeState,
): MenuTriggerId | null => {
  if (!prev.helpOpen && next.helpOpen) return null
  if (prev.helpOpen && !next.helpOpen) return 'help'
  if (prev.menu !== null && next.menu === null) return prev.menu
  if (prev.startMenu === 'programs' && next.startMenu === 'root')
    return 'programs'
  if (prev.startMenu === 'games' && next.startMenu === 'root') return 'games'
  if (prev.startMenu !== 'closed' && next.startMenu === 'closed') return 'start'
  return null
}

const useSweepClock = (status: MinesStatus) => {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (status !== 'playing') return
    const id = window.setInterval(
      () => setSeconds((value) => Math.min(value + 1, 999)),
      1000,
    )
    return () => window.clearInterval(id)
  }, [status])

  const reset = () => setSeconds(0)
  return { seconds, reset }
}

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
  const gameTriggerRef = useRef<HTMLButtonElement>(null)
  const helpTriggerRef = useRef<HTMLButtonElement>(null)
  const startTriggerRef = useRef<HTMLButtonElement>(null)
  const programsTriggerRef = useRef<HTMLButtonElement>(null)
  const gamesTriggerRef = useRef<HTMLButtonElement>(null)
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
    const triggers = {
      game: gameTriggerRef,
      help: helpTriggerRef,
      start: startTriggerRef,
      programs: programsTriggerRef,
      games: gamesTriggerRef,
    }
    const target = chromeFocusTarget(prevChromeRef.current, chrome)
    prevChromeRef.current = chrome
    if (target) triggers[target].current?.focus()
  }, [chrome])

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

  const face = pressing && live ? '○' : FACES[state.status]

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

        <div className={css.desktopIcons}>
          <DesktopLink
            url='/console'
            label='MS-DOS'
            ariaLabel='MS-DOS, open the console'
            icon={css.msdosIcon}
            iconId='msdos'
            icons={icons}
            guardNav={guardNav}
          />
          <DesktopLink
            url='/recycle-bin'
            label='Recycle Bin'
            ariaLabel='Open the recycle bin'
            icon={css.recycleIcon}
            iconId='recycle'
            icons={icons}
            guardNav={guardNav}
          />
          <button
            type='button'
            className={css.desktopShortcut}
            aria-label='Open Minesweeper'
            data-selected={icons.selected === 'mines'}
            {...icons.press('mines', () => launchApp('mines'))}
          >
            <span className={css.minesIcon} aria-hidden='true' />
            <span>Minesweeper</span>
          </button>
          <button
            type='button'
            className={css.desktopShortcut}
            aria-label='Open Paint'
            data-selected={icons.selected === 'paint'}
            {...icons.press('paint', () => launchApp('paint'))}
          >
            <span className={css.paintIcon} aria-hidden='true' />
            <span>Paint</span>
          </button>
          <button
            type='button'
            className={css.desktopShortcut}
            aria-label='Open Winamp'
            data-selected={icons.selected === 'winamp'}
            {...icons.press('winamp', launchWinamp)}
          >
            <span className={css.winampIcon} aria-hidden='true' />
            <span>Winamp</span>
          </button>
          <button
            type='button'
            className={css.desktopShortcut}
            aria-label='Open RealPlayer'
            data-selected={icons.selected === 'realplayer'}
            {...icons.press('realplayer', () => launchApp('realplayer'))}
          >
            <span className={css.realplayerIcon} aria-hidden='true' />
            <span>RealPlayer</span>
          </button>
        </div>

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
              <div className={css.window} style={gameDrag.style}>
                <header className={css.titlebar} {...gameDrag.handle}>
                  <span className={css.appIcon} aria-hidden='true' />
                  <strong>Minesweeper</strong>
                  <WindowControls
                    appName='Minesweeper'
                    minimize={minimizeMines}
                    close={closeMines}
                  />
                </header>

                <nav className={css.menubar} aria-label='Minesweeper menus'>
                  <div className={css.menuSlot}>
                    <button
                      ref={gameTriggerRef}
                      type='button'
                      className={css.menuTrigger}
                      aria-haspopup='true'
                      aria-expanded={chrome.menu === 'game'}
                      onClick={() =>
                        chromeDispatch({
                          type: 'menu',
                          menu: chrome.menu === 'game' ? null : 'game',
                        })
                      }
                    >
                      <u>G</u>ame
                    </button>
                    {chrome.menu === 'game' && (
                      <GameMenu
                        density={density}
                        sound={sound}
                        newGame={newGame}
                        toggleSound={toggleSound}
                        exit={closeMines}
                      />
                    )}
                  </div>
                  <div className={css.menuSlot}>
                    <button
                      ref={helpTriggerRef}
                      type='button'
                      className={css.menuTrigger}
                      aria-haspopup='true'
                      aria-expanded={chrome.menu === 'help'}
                      onClick={() =>
                        chromeDispatch({
                          type: 'menu',
                          menu: chrome.menu === 'help' ? null : 'help',
                        })
                      }
                    >
                      <u>H</u>elp
                    </button>
                    {chrome.menu === 'help' && (
                      <div className={css.menu}>
                        <button
                          type='button'
                          className={css.menuItem}
                          onClick={() =>
                            chromeDispatch({ type: 'help', open: true })
                          }
                        >
                          <span>How to play</span>
                        </button>
                      </div>
                    )}
                  </div>
                </nav>

                <div className={css.field}>
                  <div className={css.hud}>
                    <output className={css.lcd} aria-label='Mines left'>
                      {lcd(minesLeft(state))}
                    </output>
                    <button
                      type='button'
                      className={css.face}
                      aria-label='New game'
                      onClick={() => newGame(density)}
                    >
                      {face}
                    </button>
                    <output className={css.lcd} aria-label='Seconds elapsed'>
                      {lcd(seconds)}
                    </output>
                  </div>

                  <div className={css.boardScroll}>
                    {/* biome-ignore lint/a11y/noStaticElementInteractions: pointer press only animates the smiley */}
                    <div
                      className={css.board}
                      data-status={state.status}
                      data-mode={inputMode}
                      style={
                        {
                          '--cols': state.level.cols,
                          '--cell': fit ? `${fit.cell}px` : undefined,
                        } as React.CSSProperties
                      }
                      onPointerDown={() => setPressing(live)}
                      onPointerUp={() => setPressing(false)}
                      onPointerLeave={() => setPressing(false)}
                      onPointerCancel={() => setPressing(false)}
                      onContextMenu={(event) => event.preventDefault()}
                    >
                      {state.cells.map((_, index) => (
                        <CellButton
                          // biome-ignore lint/suspicious/noArrayIndexKey: cells are positional and boards remount via reset
                          key={index}
                          state={state}
                          index={index}
                          inputMode={inputMode}
                          sweep={sweep}
                          flag={flag}
                        />
                      ))}
                    </div>
                  </div>

                  <div className={css.statusBar} data-status={state.status}>
                    <span>
                      {STATUS_LABEL[state.status]} · {state.level.mines} mines
                    </span>
                    <fieldset className={css.modeSwitch}>
                      <legend className='sr-only'>Cell action</legend>
                      <button
                        type='button'
                        aria-pressed={inputMode === 'sweep'}
                        onClick={() => setInputMode('sweep')}
                      >
                        Sweep
                      </button>
                      <button
                        type='button'
                        aria-pressed={inputMode === 'flag'}
                        onClick={() => setInputMode('flag')}
                      >
                        Flag
                      </button>
                    </fieldset>
                  </div>
                </div>
              </div>
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

        <footer className={css.taskbar}>
          {chrome.startMenu !== 'closed' && (
            <button
              type='button'
              tabIndex={-1}
              className={css.menuBackdrop}
              aria-label='Close start menu'
              onClick={() =>
                chromeDispatch({ type: 'start', startMenu: 'closed' })
              }
            />
          )}
          <div className={css.menuSlot}>
            <button
              ref={startTriggerRef}
              type='button'
              className={css.startButton}
              aria-haspopup='true'
              aria-expanded={chrome.startMenu !== 'closed'}
              onClick={() =>
                chromeDispatch({
                  type: 'start',
                  startMenu: chrome.startMenu === 'closed' ? 'root' : 'closed',
                })
              }
            >
              <span className={css.winMark} aria-hidden='true'>
                <i />
                <i />
                <i />
                <i />
              </span>
              <strong>Start</strong>
            </button>
            {chrome.startMenu !== 'closed' && (
              <div className={css.startMenu}>
                <div className={css.menuSlot}>
                  <button
                    ref={programsTriggerRef}
                    type='button'
                    className={css.menuItem}
                    aria-haspopup='true'
                    aria-expanded={chrome.startMenu === 'programs'}
                    onClick={() =>
                      chromeDispatch({
                        type: 'start',
                        startMenu:
                          chrome.startMenu === 'programs' ? 'root' : 'programs',
                      })
                    }
                    onPointerEnter={() =>
                      chromeDispatch({ type: 'start', startMenu: 'programs' })
                    }
                  >
                    Programs <span aria-hidden='true'>▸</span>
                  </button>
                  {chrome.startMenu === 'programs' && (
                    <div className={css.programsMenu}>
                      <Link
                        url='/console'
                        className={css.programItem}
                        onClick={(event) => guardNav(event, '/console')}
                      >
                        <span className={css.msdosAppIcon} aria-hidden='true' />
                        MS-DOS
                      </Link>
                      <button
                        type='button'
                        className={css.programItem}
                        onClick={() => startLaunch('mines')}
                      >
                        <span className={css.appIcon} aria-hidden='true' />
                        Minesweeper
                      </button>
                      <button
                        type='button'
                        className={css.programItem}
                        onClick={() => startLaunch('paint')}
                      >
                        <span className={css.paintAppIcon} aria-hidden='true' />
                        Paint
                      </button>
                      <button
                        type='button'
                        className={css.programItem}
                        onClick={() => startLaunch('winamp')}
                      >
                        <span
                          className={css.winampAppIcon}
                          aria-hidden='true'
                        />
                        Winamp
                      </button>
                      <button
                        type='button'
                        className={css.programItem}
                        onClick={() => startLaunch('realplayer')}
                      >
                        <span
                          className={css.realplayerAppIcon}
                          aria-hidden='true'
                        />
                        RealPlayer
                      </button>
                    </div>
                  )}
                </div>
                <div className={css.menuSlot}>
                  <button
                    ref={gamesTriggerRef}
                    type='button'
                    className={css.menuItem}
                    aria-haspopup='true'
                    aria-expanded={chrome.startMenu === 'games'}
                    onClick={() =>
                      chromeDispatch({
                        type: 'start',
                        startMenu:
                          chrome.startMenu === 'games' ? 'root' : 'games',
                      })
                    }
                    onPointerEnter={() =>
                      chromeDispatch({ type: 'start', startMenu: 'games' })
                    }
                  >
                    Games <span aria-hidden='true'>▸</span>
                  </button>
                  {chrome.startMenu === 'games' && (
                    <div className={css.gamesMenu}>
                      {GAMES.map((game) => (
                        <GameMenuItem
                          key={game.id}
                          game={game}
                          startLaunch={startLaunch}
                          guardNav={guardNav}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <hr />
                <Link
                  url='/'
                  className={css.shutdownItem}
                  aria-label='Shut down and return home'
                  onClick={(event) => guardNav(event, '/')}
                >
                  Shut Down…
                </Link>
              </div>
            )}
          </div>
          <span className={css.taskDivider} aria-hidden='true' />
          {TASKBAR_APPS.map(({ id, label, icon }) => {
            const appWindow = desktop.apps[id]
            if (!appWindow.open) return null
            const shown = desktop.active === id && !appWindow.minimized
            return (
              <button
                key={id}
                type='button'
                className={css.taskButton}
                data-active={shown}
                aria-pressed={shown}
                onClick={() => handleTaskButton(id)}
              >
                <span className={icon} aria-hidden='true' /> {label}
              </button>
            )
          })}
          <span className={css.taskSpacer} />
          <span className={css.tray} aria-hidden='true'>
            <span>EN</span>
            <time dateTime='1998-06-25T15:10'>3:10 PM</time>
          </span>
        </footer>

        <p role='status' className='sr-only'>
          {STATUS_REPORT[state.status]}
        </p>
      </section>
    </Shell>
  )
}
