'use client'

import Link from 'components/Link'
import Shell from 'components/Shell'
import { clamp } from 'es-toolkit'
import type React from 'react'
import { useEffect, useReducer, useRef, useState } from 'react'
import { useHotkeys } from 'service/hotkeys'
import {
  type Cell,
  createGame,
  type Level,
  type MinesState,
  type MinesStatus,
  minesLeft,
  reduce,
} from './engine'
import css from './mines.module.css'
import { createSweepAudio, type SweepAudio } from './sweep-audio'

const SOUND_KEY = 'g-mines-sound'

type Density = 'beginner' | 'intermediate' | 'expert'
type InputMode = 'sweep' | 'flag'

// mine density per difficulty: the grid itself is sized by the screen
const DENSITIES = {
  beginner: 0.12,
  intermediate: 0.16,
  expert: 0.21,
} satisfies Record<Density, number>

const DENSITY_NAMES = Object.keys(DENSITIES) as Density[]

const DEFAULT_LEVEL: Level = { rows: 9, cols: 9, mines: 10 }

// px mirror of the Win95 window chrome in mines.module.css: titlebar, menubar,
// touch tools, HUD, field padding and bevels; slack lands in the desktop
const CELL_WIDE = 32
const CELL_NARROW = 26
const NARROW_DESK = 560
const CHROME_X = 28
const CHROME_Y = 164

type Fit = { cols: number; rows: number; cell: number }

const fitFor = (width: number, height: number): Fit => {
  const cell = width < NARROW_DESK ? CELL_NARROW : CELL_WIDE
  return {
    cell,
    cols: clamp(Math.floor((width - CHROME_X) / cell), 9, 44),
    rows: clamp(Math.floor((height - CHROME_Y) / cell), 9, 26),
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
}> = ({ density, sound, newGame, toggleSound }) => (
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
    <Link url='/' role='menuitem' className={css.menuItem}>
      Exit
    </Link>
  </div>
)

const HelpWindow: React.FC<{ close: () => void }> = (props) => (
  <section className={css.helpWindow} aria-label='Minesweeper help'>
    <header className={css.titlebar}>
      <span className={css.appIcon} aria-hidden='true' />
      <strong>Help</strong>
      <span className={css.windowControls} aria-hidden='true'>
        <span>×</span>
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

export default function MinesView() {
  const [state, dispatch] = useReducer(reduce, DEFAULT_LEVEL, createGame)
  const [density, setDensity] = useState<Density>('beginner')
  const [pressing, setPressing] = useState(false)
  const [menu, setMenu] = useState<'game' | 'help' | null>(null)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [inputMode, setInputMode] = useState<InputMode>('sweep')
  // lazy factory: the AudioContext itself waits for the first gesture
  const [audio] = useState(createSweepAudio)
  const deskRef = useRef<HTMLDivElement>(null)

  const { sound, toggle: toggleSoundPref } = useSoundPref(audio)
  useSweepCues(state, audio)
  const fit = useDeskFit(deskRef)
  const { seconds, reset: resetClock } = useSweepClock(state.status)

  const live = state.status === 'idle' || state.status === 'playing'

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
    ['F2', () => newGame(density)],
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
    <Shell canonical='/g-mines' className={css.frame}>
      <section className={css.desktop} aria-label='Windows 95 desktop'>
        <h1 className='sr-only'>Minesweeper on Windows 95</h1>

        <div className={css.desktopIcons}>
          <Link url='/' className={css.desktopShortcut} aria-label='Go home'>
            <span className={css.computerIcon} aria-hidden='true' />
            <span>My Computer</span>
          </Link>
          <span className={css.desktopShortcut} aria-hidden='true'>
            <span className={css.recycleIcon} />
            <span>Recycle Bin</span>
          </span>
        </div>

        <div className={css.desktopWorkArea}>
          {menu && (
            <button
              type='button'
              className={css.menuBackdrop}
              aria-label='Close menu'
              onClick={() => setMenu(null)}
            />
          )}

          <div ref={deskRef} className={css.programArea}>
            <div className={css.window}>
              <header className={css.titlebar}>
                <span className={css.appIcon} aria-hidden='true' />
                <strong>Minesweeper</strong>
                <span className={css.windowControls} aria-hidden='true'>
                  <span>_</span>
                  <span>□</span>
                  <span>×</span>
                </span>
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
          </div>

          {isHelpOpen && <HelpWindow close={() => setIsHelpOpen(false)} />}
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
          <span className={css.taskButton} aria-hidden='true'>
            <span className={css.appIcon} /> Minesweeper
          </span>
          <span className={css.taskSpacer} />
          <span className={css.tray} aria-hidden='true'>
            <span>EN</span>
            <time dateTime='1995-08-24T15:10'>3:10 PM</time>
          </span>
        </footer>

        <p role='status' className='sr-only'>
          {STATUS_REPORT[state.status]}
        </p>
      </section>
    </Shell>
  )
}
