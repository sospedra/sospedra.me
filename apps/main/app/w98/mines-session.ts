import { clamp } from 'es-toolkit'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { buzzHaptic, pulseHaptic, tapHaptic } from 'services/haptics'
import { readLocal, writeLocal } from 'services/storage'
import type { Level, MinesState, MinesStatus } from './engine'
import type { SweepAudio } from './sweep-audio'

const SOUND_KEY = 'g-mines-sound'

export type Density = 'beginner' | 'intermediate' | 'expert'
export type InputMode = 'sweep' | 'flag'

export const DENSITIES = {
  beginner: 0.12,
  intermediate: 0.16,
  expert: 0.21,
} satisfies Record<Density, number>

export const DENSITY_NAMES = Object.keys(DENSITIES) as Density[]

export const DEFAULT_LEVEL: Level = { rows: 9, cols: 9, mines: 10 }

// px mirror of the Win98 window chrome in w98.module.css: titlebar, menubar,
// touch tools, HUD, field padding and bevels; slack lands in the desktop
const CELL_WIDE = 32
const CELL_NARROW = 26
const NARROW_DESK = 560
const CHROME_X = 28
const CHROME_Y_WIDE = 164
const CHROME_Y_NARROW = 210

export type Fit = { cols: number; rows: number; cell: number }

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

export const levelFor = (fit: Fit, density: Density): Level => ({
  rows: fit.rows,
  cols: fit.cols,
  mines: Math.max(10, Math.round(fit.rows * fit.cols * DENSITIES[density])),
})

export const sameLevel = (a: Level, b: Level) =>
  a.rows === b.rows && a.cols === b.cols && a.mines === b.mines

export const useSoundPref = (audio: SweepAudio) => {
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

export const useSweepCues = (state: MinesState, audio: SweepAudio) => {
  const revealedRef = useRef(0)

  useEffect(() => {
    const revealed = state.cells.filter((cell) => cell.revealed).length
    const grew = revealed > revealedRef.current
    revealedRef.current = revealed
    if (grew && state.status === 'playing') {
      audio.sweep()
      tapHaptic()
    }
  }, [state, audio])

  useEffect(() => {
    if (state.status === 'lost') {
      audio.boom()
      buzzHaptic()
    }
    if (state.status === 'won') {
      audio.win()
      pulseHaptic()
    }
  }, [state.status, audio])
}

export const useDeskFit = (deskRef: React.RefObject<HTMLDivElement | null>) => {
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

export const useSweepClock = (status: MinesStatus) => {
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
