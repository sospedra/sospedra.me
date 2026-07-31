'use client'

import { clamp } from 'es-toolkit'
import { readLocal, writeLocal } from 'lib/storage'
import { useEffect, useReducer, useState } from 'react'
import { type RealStation, stationById } from './stations.ts'
import { DEFAULT_VOLUME, INITIAL_TUNER, reduceTuner } from './tuner.ts'
import { createTunerController } from './tuner-controller.ts'

const STATION_KEY = 'g-real-station'
const VOLUME_KEY = 'g-real-volume'

const readSavedVolume = (): number | null => {
  const raw = readLocal(VOLUME_KEY)
  if (raw === null) return null
  const value = Number(raw)
  if (!Number.isFinite(value)) return null
  return clamp(value, 0, 1)
}

export const useTuner = () => {
  const [state, dispatch] = useReducer(reduceTuner, INITIAL_TUNER)
  const [controller] = useState(() =>
    createTunerController({ createAudio: () => new Audio(), dispatch }),
  )
  const [volume, setVolume] = useState(DEFAULT_VOLUME)
  const [muted, setMuted] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => () => controller.dispose(), [controller])

  useEffect(() => {
    const savedStation = readLocal(STATION_KEY)
    if (savedStation && stationById(savedStation)) {
      dispatch({ type: 'restore', stationId: savedStation })
    }
    const savedVolume = readSavedVolume()
    if (savedVolume !== null) setVolume(savedVolume)
  }, [])

  useEffect(() => {
    controller.setVolume(volume)
  }, [controller, volume])

  useEffect(() => {
    controller.setMuted(muted)
  }, [controller, muted])

  useEffect(() => {
    if (state.stationId) writeLocal(STATION_KEY, state.stationId)
  }, [state.stationId])

  useEffect(() => {
    if (state.status !== 'error') return
    controller.quiesce()
  }, [controller, state.status])

  useEffect(() => {
    if (state.status !== 'playing') return
    const id = window.setInterval(
      () => setElapsed((seconds) => Math.min(seconds + 1, 359_999)),
      1000,
    )
    return () => window.clearInterval(id)
  }, [state.status])

  const tune = (station: RealStation) => {
    if (station.id !== state.stationId) setElapsed(0)
    controller.tune(station)
  }

  const stop = () => {
    setElapsed(0)
    controller.stop()
  }

  const rememberVolume = (value: number) => {
    setVolume(value)
    writeLocal(VOLUME_KEY, String(value))
  }

  return {
    state,
    elapsed,
    volume,
    muted,
    tune,
    stop,
    pause: controller.pauseUser,
    setVolume: rememberVolume,
    toggleMuted: () => setMuted((value) => !value),
  }
}

export type Tuner = ReturnType<typeof useTuner>
