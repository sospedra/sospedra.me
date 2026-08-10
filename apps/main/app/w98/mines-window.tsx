import { clamp } from 'es-toolkit'
import type React from 'react'
import { useEffect, useRef } from 'react'
import { type MinesState, minesLeft } from './engine'
import type { ChromeEvent, ChromeState } from './menu-state'
import { type Flag, MinesBoard, type Sweep } from './mines-board'
import {
  DENSITIES,
  DENSITY_NAMES,
  type Density,
  type Fit,
  type InputMode,
} from './mines-session'
import css from './minesweeper.module.css'
import w98 from './w98.module.css'
import { WindowControls, type WindowDrag } from './window-chrome'

const FACES = {
  idle: '☺',
  playing: '☺',
  won: '☻',
  lost: '☹',
} satisfies Record<MinesState['status'], string>

const STATUS_LABEL = {
  idle: 'Ready',
  playing: 'Clearing',
  won: 'You won',
  lost: 'Game over',
} satisfies Record<MinesState['status'], string>

const lcd = (value: number): string => {
  const clamped = clamp(value, -99, 999)
  if (clamped < 0) return `-${String(-clamped).padStart(2, '0')}`
  return String(clamped).padStart(3, '0')
}

const GameMenu: React.FC<{
  density: Density
  sound: boolean
  newGame: (density: Density) => void
  toggleSound: () => void
  exit: () => void
}> = ({ density, sound, newGame, toggleSound, exit }) => (
  <div className={w98.menu}>
    <button
      type='button'
      className={w98.menuItem}
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
        className={w98.menuItem}
        onClick={() => newGame(name)}
      >
        <span>
          <span className={w98.check} aria-hidden='true'>
            {name === density ? '✓' : ''}
          </span>
          {name}
        </span>
        <span className={w98.menuNote}>
          {Math.round(DENSITIES[name] * 100)}%
        </span>
      </button>
    ))}
    <hr />
    <button
      type='button'
      aria-pressed={sound}
      className={w98.menuItem}
      onClick={toggleSound}
    >
      <span>
        <span className={w98.check} aria-hidden='true'>
          {sound ? '✓' : ''}
        </span>
        Sound
      </span>
    </button>
    <hr />
    <button type='button' className={w98.menuItem} onClick={exit}>
      Exit
    </button>
  </div>
)

export const MinesWindow: React.FC<{
  state: MinesState
  fit: Fit | null
  live: boolean
  pressing: boolean
  setPressing: (pressing: boolean) => void
  inputMode: InputMode
  setInputMode: (mode: InputMode) => void
  sweep: Sweep
  flag: Flag
  seconds: number
  density: Density
  sound: boolean
  newGame: (density: Density) => void
  toggleSound: () => void
  chrome: ChromeState
  chromeDispatch: React.Dispatch<ChromeEvent>
  gameTriggerRef: React.Ref<HTMLButtonElement>
  helpTriggerRef: React.Ref<HTMLButtonElement>
  gameDrag: WindowDrag
  minimizeMines: () => void
  closeMines: () => void
}> = ({
  state,
  fit,
  live,
  pressing,
  setPressing,
  inputMode,
  setInputMode,
  sweep,
  flag,
  seconds,
  density,
  sound,
  newGame,
  toggleSound,
  chrome,
  chromeDispatch,
  gameTriggerRef,
  helpTriggerRef,
  gameDrag,
  minimizeMines,
  closeMines,
}) => {
  const face = pressing && live ? '○' : FACES[state.status]

  return (
    <div className={w98.window} style={gameDrag.style}>
      <header className={w98.titlebar} {...gameDrag.handle}>
        <span className={w98.appIcon} aria-hidden='true' />
        <strong>Minesweeper</strong>
        <WindowControls
          appName='Minesweeper'
          minimize={minimizeMines}
          close={closeMines}
        />
      </header>

      <nav className={w98.menubar} aria-label='Minesweeper menus'>
        <div className={w98.menuSlot}>
          <button
            ref={gameTriggerRef}
            type='button'
            className={w98.menuTrigger}
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
        <div className={w98.menuSlot}>
          <button
            ref={helpTriggerRef}
            type='button'
            className={w98.menuTrigger}
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
            <div className={w98.menu}>
              <button
                type='button'
                className={w98.menuItem}
                onClick={() => chromeDispatch({ type: 'help', open: true })}
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

        <MinesBoard
          state={state}
          fit={fit}
          live={live}
          inputMode={inputMode}
          setPressing={setPressing}
          sweep={sweep}
          flag={flag}
        />

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
  )
}

export const HelpWindow: React.FC<{ close: () => void; drag: WindowDrag }> = (
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
      <header className={w98.titlebar} {...props.drag.handle}>
        <span className={w98.appIcon} aria-hidden='true' />
        <strong>Help</strong>
        <span className={w98.windowControls}>
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
