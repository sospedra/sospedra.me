'use client'

import Link from 'components/Link'
import Shell from 'components/Shell'
import { clamp } from 'es-toolkit'
import type React from 'react'
import { useEffect, useReducer, useRef, useState } from 'react'
import { useHotkeys } from 'service/hotkeys'
import MusicView, {
  type WinampPanelId,
  type WinampPanelVisibility,
} from '../music/music-view'
import {
  type Cell,
  createGame,
  type Level,
  type MinesState,
  type MinesStatus,
  minesLeft,
  reduce,
} from './engine'
import { createSweepAudio, type SweepAudio } from './sweep-audio'
import css from './w98.module.css'

const SOUND_KEY = 'g-mines-sound'
const JSPAINT_URL = '/vendor/jspaint/index.html'
const JSPAINT_SOURCE_URL = 'https://github.com/1j01/jspaint'

type Density = 'beginner' | 'intermediate' | 'expert'
type InputMode = 'sweep' | 'flag'
type AppId = 'mines' | 'paint' | 'winamp'

// mine density per difficulty: the grid itself is sized by the screen
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
  <div className={css.menu} role='menu' aria-label='Game menu'>
    <button
      type='button'
      role='menuitem'
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
        role='menuitemradio'
        aria-checked={name === density}
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
      role='menuitemcheckbox'
      aria-checked={sound}
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
    <button
      type='button'
      role='menuitem'
      className={css.menuItem}
      onClick={exit}
    >
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
) => (
  <section
    className={css.helpWindow}
    style={props.drag.style}
    aria-label='Minesweeper help'
  >
    <header className={css.titlebar} {...props.drag.handle}>
      <span className={css.appIcon} aria-hidden='true' />
      <strong>Help</strong>
      <span className={css.windowControls}>
        <button type='button' aria-label='Close help' onClick={props.close}>
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
        <li>The field is dealt to fit your screen. Difficulty sets density.</li>
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

const useSoundPref = (audio: SweepAudio) => {
  const [sound, setSound] = useState(true)

  useEffect(() => {
    if (window.localStorage.getItem(SOUND_KEY) !== 'off') return
    setSound(false)
    audio.setEnabled(false)
  }, [audio])

  const toggle = () => {
    const next = !sound
    setSound(next)
    audio.setEnabled(next)
    window.localStorage.setItem(SOUND_KEY, next ? 'on' : 'off')
  }

  return { sound, toggle }
}

const useSweepCues = (state: MinesState, audio: SweepAudio) => {
  const revealedRef = useRef(0)

  // a tick per sweep, chords included; end states get their own cues
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

type AppWindowState = {
  open: boolean
  minimized: boolean
}

type DesktopState = {
  active: AppId | null
  apps: Record<AppId, AppWindowState>
}

type DesktopAction =
  | { type: 'launch'; app: AppId }
  | { type: 'activate'; app: AppId }
  | { type: 'minimize'; app: AppId }
  | { type: 'close'; app: AppId }

const APP_IDS = ['mines', 'paint', 'winamp'] as const

const ALL_WINAMP_PANELS: WinampPanelVisibility = {
  equalizer: true,
  player: true,
  tracklist: true,
}

const CLOSED_WINAMP_PANELS: WinampPanelVisibility = {
  equalizer: false,
  player: false,
  tracklist: false,
}

const INITIAL_DESKTOP: DesktopState = {
  active: 'mines',
  apps: {
    mines: { open: true, minimized: false },
    paint: { open: false, minimized: false },
    winamp: { open: false, minimized: false },
  },
}

const nextVisibleApp = (
  apps: DesktopState['apps'],
  excluding: AppId,
): AppId | null =>
  APP_IDS.find(
    (app) => app !== excluding && apps[app].open && !apps[app].minimized,
  ) ?? null

const reduceDesktop = (
  state: DesktopState,
  action: DesktopAction,
): DesktopState => {
  const current = state.apps[action.app]
  switch (action.type) {
    case 'launch':
      return {
        active: action.app,
        apps: {
          ...state.apps,
          [action.app]: { open: true, minimized: false },
        },
      }
    case 'activate':
      if (!current.open || current.minimized) return state
      return { ...state, active: action.app }
    case 'minimize': {
      if (!current.open || current.minimized) return state
      const apps = {
        ...state.apps,
        [action.app]: { ...current, minimized: true },
      }
      return {
        apps,
        active:
          state.active === action.app
            ? nextVisibleApp(apps, action.app)
            : state.active,
      }
    }
    case 'close': {
      if (!current.open) return state
      const apps = {
        ...state.apps,
        [action.app]: { open: false, minimized: false },
      }
      return {
        apps,
        active:
          state.active === action.app
            ? nextVisibleApp(apps, action.app)
            : state.active,
      }
    }
  }
}

const PaintWindow: React.FC<{
  drag: WindowDrag
  minimize: () => void
  close: () => void
}> = ({ drag, minimize, close }) => (
  <section className={css.paintWindow} style={drag.style} aria-label='Paint'>
    <header className={css.titlebar} {...drag.handle}>
      <span className={css.paintAppIcon} aria-hidden='true' />
      <strong>untitled - Paint</strong>
      <WindowControls appName='Paint' minimize={minimize} close={close} />
    </header>
    <div className={css.paintFrame}>
      <iframe
        className={css.paintIframe}
        src={JSPAINT_URL}
        title='JS Paint application'
        allow='clipboard-read; clipboard-write; fullscreen'
        allowFullScreen
      />
    </div>
    <footer className={css.paintStatus}>
      <span>Ready</span>
      <a href={JSPAINT_SOURCE_URL} target='_blank' rel='noopener noreferrer'>
        JS Paint source
      </a>
    </footer>
  </section>
)

type IconId = 'computer' | 'recycle' | 'mines' | 'paint' | 'winamp'

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
  const [winampPanels, setWinampPanels] =
    useState<WinampPanelVisibility>(ALL_WINAMP_PANELS)
  const [state, dispatch] = useReducer(reduce, DEFAULT_LEVEL, createGame)
  const [density, setDensity] = useState<Density>('beginner')
  const [pressing, setPressing] = useState(false)
  const [menu, setMenu] = useState<'game' | 'help' | null>(null)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [inputMode, setInputMode] = useState<InputMode>('sweep')
  // lazy factory: the AudioContext itself waits for the first gesture
  const [audio] = useState(createSweepAudio)
  const deskRef = useRef<HTMLDivElement>(null)
  const workAreaRef = useRef<HTMLDivElement>(null)
  const gameDrag = useWindowDrag(workAreaRef)
  const paintDrag = useWindowDrag(workAreaRef)
  const helpDrag = useWindowDrag(workAreaRef)
  const icons = useDesktopShortcuts()

  const { sound, toggle: toggleSoundPref } = useSoundPref(audio)
  useSweepCues(state, audio)
  const fit = useDeskFit(deskRef)
  const { seconds, reset: resetClock } = useSweepClock(state.status)

  const live = state.status === 'idle' || state.status === 'playing'
  const minesWindow = desktop.apps.mines
  const paintWindow = desktop.apps.paint
  const winampWindow = desktop.apps.winamp

  const launchApp = (app: AppId) => {
    setMenu(null)
    desktopDispatch({ type: 'launch', app })
  }

  const launchWinamp = () => {
    setWinampPanels({ ...ALL_WINAMP_PANELS })
    launchApp('winamp')
  }

  const closeWinampPanel = (panel: WinampPanelId) => {
    if (panel === 'player') {
      setWinampPanels({ ...CLOSED_WINAMP_PANELS })
      desktopDispatch({ type: 'close', app: 'winamp' })
      return
    }
    setWinampPanels((current) => ({ ...current, [panel]: false }))
  }

  const openWinampPanel = (panel: WinampPanelId) => {
    setWinampPanels((current) =>
      current[panel] ? current : { ...current, [panel]: true },
    )
    launchApp('winamp')
  }

  const minimizeMines = () => {
    setMenu(null)
    desktopDispatch({ type: 'minimize', app: 'mines' })
  }

  const closeMines = () => {
    setMenu(null)
    setIsHelpOpen(false)
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
    setMenu(null)
    audio.deal()
  }

  const toggleSound = () => {
    toggleSoundPref()
    setMenu(null)
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

  // an untouched board redeals to fill the screen; a game in progress keeps its field
  useEffect(() => {
    if (!fit || state.status !== 'idle') return
    const target = levelFor(fit, density)
    if (sameLevel(target, state.level)) return
    dispatch({ type: 'reset', level: target })
  }, [fit, density, state.status, state.level])

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
        setMenu(null)
        setIsHelpOpen(false)
      },
    ],
  ])

  const face = pressing && live ? '○' : FACES[state.status]

  return (
    <Shell canonical='/w98' className={css.frame}>
      <section
        className={css.desktop}
        aria-label='Windows 98 desktop'
        onPointerDown={icons.clear}
      >
        <h1 className='sr-only'>
          Windows 98 desktop with Minesweeper, JS Paint, and Winamp
        </h1>

        <div className={css.desktopIcons}>
          <Link
            url='/console'
            className={css.desktopShortcut}
            aria-label='Open the console'
            data-selected={icons.selected === 'computer'}
            {...icons.press('computer')}
          >
            <span className={css.computerIcon} aria-hidden='true' />
            <span>My Computer</span>
          </Link>
          <Link
            url='/recycle-bin'
            className={css.desktopShortcut}
            aria-label='Open the recycle bin'
            data-selected={icons.selected === 'recycle'}
            {...icons.press('recycle')}
          >
            <span className={css.recycleIcon} aria-hidden='true' />
            <span>Recycle Bin</span>
          </Link>
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
        </div>

        <div ref={workAreaRef} className={css.desktopWorkArea}>
          {menu && (
            <button
              type='button'
              className={css.menuBackdrop}
              aria-label='Close menu'
              onClick={() => setMenu(null)}
            />
          )}

          <div
            ref={deskRef}
            className={css.programArea}
            data-hidden={!minesWindow.open || minesWindow.minimized}
            data-active={desktop.active === 'mines'}
            onPointerDownCapture={() =>
              desktopDispatch({ type: 'activate', app: 'mines' })
            }
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
                      type='button'
                      className={css.menuTrigger}
                      aria-haspopup='menu'
                      aria-expanded={menu === 'game'}
                      onClick={() => setMenu(menu === 'game' ? null : 'game')}
                    >
                      <u>G</u>ame
                    </button>
                    {menu === 'game' && (
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
                      type='button'
                      className={css.menuTrigger}
                      aria-haspopup='menu'
                      aria-expanded={menu === 'help'}
                      onClick={() => setMenu(menu === 'help' ? null : 'help')}
                    >
                      <u>H</u>elp
                    </button>
                    {menu === 'help' && (
                      <div
                        className={css.menu}
                        role='menu'
                        aria-label='Help menu'
                      >
                        <button
                          type='button'
                          role='menuitem'
                          className={css.menuItem}
                          onClick={() => {
                            setIsHelpOpen(true)
                            setMenu(null)
                          }}
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

          <div
            className={css.paintArea}
            data-hidden={!paintWindow.open || paintWindow.minimized}
            data-active={desktop.active === 'paint'}
            onPointerDownCapture={() =>
              desktopDispatch({ type: 'activate', app: 'paint' })
            }
          >
            {paintWindow.open && (
              <PaintWindow
                drag={paintDrag}
                minimize={() =>
                  desktopDispatch({ type: 'minimize', app: 'paint' })
                }
                close={() => desktopDispatch({ type: 'close', app: 'paint' })}
              />
            )}
          </div>

          <div
            className={css.winampArea}
            data-hidden={!winampWindow.open || winampWindow.minimized}
            data-active={desktop.active === 'winamp'}
            onPointerDownCapture={() =>
              desktopDispatch({ type: 'activate', app: 'winamp' })
            }
          >
            {winampWindow.open && (
              <MusicView
                panels={winampPanels}
                onClosePanel={closeWinampPanel}
                onOpenPanel={openWinampPanel}
              />
            )}
          </div>

          {isHelpOpen && (
            <HelpWindow close={() => setIsHelpOpen(false)} drag={helpDrag} />
          )}
        </div>

        <footer className={css.taskbar}>
          <Link url='/' className={css.startButton} aria-label='Return home'>
            <span className={css.winMark} aria-hidden='true'>
              <i />
              <i />
              <i />
              <i />
            </span>
            <strong>Start</strong>
          </Link>
          <span className={css.taskDivider} aria-hidden='true' />
          {minesWindow.open && (
            <button
              type='button'
              className={css.taskButton}
              data-active={desktop.active === 'mines' && !minesWindow.minimized}
              aria-pressed={
                desktop.active === 'mines' && !minesWindow.minimized
              }
              onClick={() => handleTaskButton('mines')}
            >
              <span className={css.appIcon} aria-hidden='true' /> Minesweeper
            </button>
          )}
          {paintWindow.open && (
            <button
              type='button'
              className={css.taskButton}
              data-active={desktop.active === 'paint' && !paintWindow.minimized}
              aria-pressed={
                desktop.active === 'paint' && !paintWindow.minimized
              }
              onClick={() => handleTaskButton('paint')}
            >
              <span className={css.paintAppIcon} aria-hidden='true' /> Paint
            </button>
          )}
          {winampWindow.open && (
            <button
              type='button'
              className={css.taskButton}
              data-active={
                desktop.active === 'winamp' && !winampWindow.minimized
              }
              aria-pressed={
                desktop.active === 'winamp' && !winampWindow.minimized
              }
              onClick={() => handleTaskButton('winamp')}
            >
              <span className={css.winampAppIcon} aria-hidden='true' /> Winamp
            </button>
          )}
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
