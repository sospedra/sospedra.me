'use client'

import { useCallback, useEffect, useReducer, useState } from 'react'
import { useGameInput } from 'services/hotkeys'
import Shell from 'services/shell'
import { readLocal, writeLocal } from 'services/storage'
import {
  boundsOf,
  type Cell,
  createLifeState,
  type LifeState,
  lifeReducer,
} from './engine'
import css from './game-of-life.module.css'
import { createLifeAudio, type LifeMechanicalSound } from './life-audio'
import { LifeLayout } from './life-layouts'
import {
  DEFAULT_PRESET,
  type InteractiveLifePreset,
  presetById,
} from './presets'
import { useLifeCanvas } from './use-life-canvas'
import { useLifeHotkeys } from './use-life-hotkeys'

const DEFAULT_SPEED = 8
const LIFE_SOUND_KEY = 'game-of-life-sound-v2'
const COMPACT_PRESET_MEDIA =
  '(max-width: 45rem), (max-width: 59.99rem) and (max-height: 32rem) and (orientation: landscape)'

const statusOf = (state: LifeState, running: boolean) => {
  if (state.cells.size === 0) {
    return state.generation > 0 ? 'Extinct' : 'Field empty'
  }
  if (running) return 'Running'
  return state.generation === 0 ? 'Seed ready' : 'Paused'
}

export default function GameOfLifeView() {
  const [state, dispatch] = useReducer(
    lifeReducer,
    createLifeState(DEFAULT_PRESET.cells, DEFAULT_PRESET.id),
  )
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(DEFAULT_SPEED)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [patternBayOpen, setPatternBayOpen] = useState(false)
  const [announcement, setAnnouncement] = useState(
    `${DEFAULT_PRESET.title} loaded. ${DEFAULT_PRESET.cells.size} live cells.`,
  )
  const [audio] = useState(createLifeAudio)
  useGameInput()

  const playMechanicalSound = useCallback(
    (kind: LifeMechanicalSound) => audio.play(kind),
    [audio],
  )

  const paintCells = useCallback((cells: readonly Cell[], alive: boolean) => {
    setRunning(false)
    dispatch({ type: 'paint', cells, alive })
  }, [])

  const { canvas, fitCells, setCursor } = useLifeCanvas({
    audio,
    paintCells,
    playMechanicalSound,
    running,
    setAnnouncement,
    state,
  })

  const seedName = presetById(state.presetId)?.title ?? 'Custom seed'
  const status = statusOf(state, running)

  const loadPreset = useCallback(
    (preset: InteractiveLifePreset) => {
      setRunning(false)
      setPatternBayOpen(false)
      dispatch({ type: 'load', cells: preset.cells, presetId: preset.id })
      const bounds = boundsOf(preset.cells)
      setCursor([
        Math.floor((bounds.minX + bounds.maxX) / 2),
        Math.floor((bounds.minY + bounds.maxY) / 2),
      ])
      setAnnouncement(
        `${preset.title} loaded. ${preset.cells.size} live cells.`,
      )
      requestAnimationFrame(() => fitCells(preset.cells))
    },
    [fitCells, setCursor],
  )

  const toggleRunning = useCallback(() => {
    if (state.cells.size === 0) {
      setAnnouncement('The field is empty. Draw a seed or load a preset first.')
      return
    }
    const next = !running
    audio.play('switch')
    setRunning(next)
    setAnnouncement(next ? 'Simulation running.' : 'Simulation paused.')
  }, [audio, running, state.cells.size])

  const toggleSound = useCallback(() => {
    const next = !soundEnabled
    setSoundEnabled(next)
    // the enable cue right below needs the flag flipped before effects rerun
    audio.setEnabled(next)
    writeLocal(LIFE_SOUND_KEY, next ? 'on' : 'off')
    if (next) audio.play('key')
    setAnnouncement(`Mechanical audio ${next ? 'on' : 'off'}.`)
  }, [audio, soundEnabled])

  const stepOnce = useCallback(() => {
    if (state.cells.size === 0) {
      setAnnouncement('The field is empty. Draw a seed or load a preset first.')
      return
    }
    setRunning(false)
    dispatch({ type: 'step' })
    setAnnouncement('Advanced one generation.')
  }, [state.cells.size])

  const resetUniverse = useCallback(() => {
    setRunning(false)
    dispatch({ type: 'reset' })
    setAnnouncement('Seed restored to generation zero.')
  }, [])

  const clearUniverse = useCallback(() => {
    setRunning(false)
    dispatch({ type: 'clear' })
    setAnnouncement('Field cleared. Draw a new seed.')
  }, [])

  useEffect(() => {
    if (readLocal(LIFE_SOUND_KEY) !== 'off') return
    setSoundEnabled(false)
  }, [])

  useEffect(() => {
    audio.setEnabled(soundEnabled)
    audio.setRunning(running, speed)
  }, [audio, running, soundEnabled, speed])

  useEffect(() => () => audio.dispose(), [audio])

  useEffect(() => {
    const frame = requestAnimationFrame(() => fitCells(DEFAULT_PRESET.cells))
    return () => cancelAnimationFrame(frame)
  }, [fitCells])

  useEffect(() => {
    if (!running) return
    const clock = window.setInterval(
      () => dispatch({ type: 'step' }),
      1000 / speed,
    )
    return () => window.clearInterval(clock)
  }, [running, speed])

  useEffect(() => {
    if (!running || state.generation === 0 || state.cells.size > 0) return
    setRunning(false)
    setAnnouncement(`The universe went dark at generation ${state.generation}.`)
  }, [running, state.cells.size, state.generation])

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (!document.hidden) return
      setRunning(false)
    }
    document.addEventListener('visibilitychange', pauseWhenHidden)
    return () =>
      document.removeEventListener('visibilitychange', pauseWhenHidden)
  }, [])

  const jumpToPresets = useCallback(() => {
    if (window.matchMedia(COMPACT_PRESET_MEDIA).matches) {
      setPatternBayOpen((current) => !current)
      return
    }
    setPatternBayOpen(false)
    requestAnimationFrame(() => {
      const rail = document.querySelector<HTMLElement>('#preset-rail')
      const target =
        rail?.querySelector<HTMLElement>('[aria-current="true"]') ??
        rail?.querySelector<HTMLElement>('button, a[href]')
      target?.focus()
    })
  }, [])

  useLifeHotkeys({
    cells: state.cells,
    clearUniverse,
    fitCells,
    jumpToPresets,
    playMechanicalSound,
    resetUniverse,
    setAnnouncement,
    setTool: canvas.setTool,
    stepOnce,
    toggleRunning,
  })

  return (
    <Shell className={`relative w-full ${css.page}`} shellClassName={css.shell}>
      <LifeLayout
        state={state}
        running={running}
        speed={speed}
        status={status}
        seedName={seedName}
        patternBayOpen={patternBayOpen}
        loadPreset={loadPreset}
        toggleRunning={toggleRunning}
        stepOnce={stepOnce}
        resetUniverse={resetUniverse}
        clearUniverse={clearUniverse}
        playMechanicalSound={playMechanicalSound}
        unlockAudio={audio.unlock}
        setSpeed={setSpeed}
        setPatternBayOpen={setPatternBayOpen}
        soundEnabled={soundEnabled}
        toggleSound={toggleSound}
        canvas={canvas}
      />
      <p id='life-canvas-help' className='sr-only'>
        Drag to paint or erase cells. Right-drag to pan. Use the mousewheel or
        plus and minus keys to zoom. Hold a physical plus or minus control for
        continuous zoom. Press Space to play or pause, period to step, R to
        reset, and P to move to the preset library. When the canvas is focused,
        use the arrow keys to move the cell cursor and Enter to toggle that
        cell. On a touchscreen, tap to draw and choose Slew to move around the
        field. The Field Slew control flies the view across the field: press and
        hold its knob, then drag with a mouse or finger.
      </p>
      <p className='sr-only' role='status' aria-live='polite'>
        {announcement}
      </p>
    </Shell>
  )
}
