'use client'

import cn from 'clsx'
import { clamp, range } from 'es-toolkit'
import type { CSSProperties } from 'react'
import { useEffect, useReducer, useRef, useState } from 'react'
import fxq from './fx-quiet.module.css'
import { createRadioController } from './radio-controller'
import { getRadioStations } from './radio-stations'
import {
  initialRadio,
  type RadioPhase,
  type RadioState,
  reduceRadio,
  wantsPlayback,
} from './radio-tuner'
import type { TravelAudio } from './travel-audio'
import css from './travel-radio.module.css'

type PlaybackState = 'error' | 'idle' | 'loading' | 'paused' | 'playing'
const TRACE_WIDTH = 120

const STATUS_COPY: Record<PlaybackState, string> = {
  error: 'SIGNAL LOST',
  idle: 'SIGNAL READY',
  loading: 'FINDING SIGNAL',
  paused: 'SIGNAL HELD',
  playing: 'SIGNAL LOCKED',
}

const PHASE_STATUS: Record<Exclude<RadioPhase, 'off'>, PlaybackState> = {
  error: 'error',
  loading: 'loading',
  playing: 'playing',
  recovering: 'loading',
  tuning: 'loading',
}

const playbackOf = (state: RadioState): PlaybackState => {
  if (state.phase === 'off') return state.held ? 'paused' : 'idle'
  return PHASE_STATUS[state.phase]
}

const buildDataTrace = (bitrateKbps: number | null): string => {
  if (!bitrateKbps) return `M0 9 H${TRACE_WIDTH}`
  const pulseCount = clamp(Math.round(bitrateKbps / 16), 2, 16)
  const pulseWidth = TRACE_WIDTH / pulseCount
  const pulses = range(pulseCount).map((index) => {
    const start = index * pulseWidth
    const rise = start + pulseWidth * 0.18
    const fall = start + pulseWidth * 0.58
    const end = start + pulseWidth
    return ` H${rise.toFixed(2)} V5 H${fall.toFixed(2)} V13 H${end.toFixed(2)}`
  })
  return `M0 13${pulses.join('')}`
}

type TravelRadioProps = {
  destinationCode: string
  destinationName: string
  travelAudio: TravelAudio
}

export default function TravelRadio({
  destinationCode,
  destinationName,
  travelAudio,
}: TravelRadioProps) {
  const stations = getRadioStations(destinationCode)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [state, dispatch] = useReducer(
    reduceRadio,
    stations.length,
    initialRadio,
  )
  const [controller] = useState(() =>
    createRadioController({ audio: () => audioRef.current, dispatch }),
  )
  const station = stations[state.stationIndex]
  const playback = playbackOf(state)

  useEffect(
    () => () => {
      controller.quiesce()
      travelAudio.stopReceiverStatic()
    },
    [controller, travelAudio],
  )

  useEffect(() => {
    controller.quiesce()
    dispatch({ type: 'stations', stationCount: stations.length })
  }, [controller, stations])

  useEffect(() => {
    const { phase, stationIndex } = state
    if (phase !== 'tuning' && phase !== 'recovering') return
    const next = stations[stationIndex]
    if (!next) return
    controller.start(next, stationIndex)
  }, [controller, state, stations])

  useEffect(() => {
    if (state.phase === 'tuning') {
      travelAudio.startReceiverStatic()
      return
    }
    if (state.phase === 'playing' || state.phase === 'off') {
      travelAudio.stopReceiverStatic()
      return
    }
    if (state.phase === 'error') {
      travelAudio.stopReceiverStatic()
      controller.quiesce()
    }
  }, [controller, state.phase, travelAudio])

  const play = () => {
    if (!station) return
    travelAudio.arm()
    if (wantsPlayback(state)) {
      controller.hold()
      return
    }
    controller.start(station, state.stationIndex)
  }

  const tune = (nextIndex: number) => {
    if (nextIndex === state.stationIndex) return
    controller.quiesce()
    dispatch({ type: 'tune', stationIndex: nextIndex })
  }

  // biome-ignore lint/a11y/useMediaCaption: Live third-party radio streams do not expose timed caption tracks.
  const streamAudio = <audio ref={audioRef} preload='none' />

  if (!station) {
    return (
      <div className={css.radioModule} data-state='error'>
        {streamAudio}
        <div className={css.radioScreen}>
          <span>LOCAL SIGNAL / {destinationCode}</span>
          <strong>Nothing answering yet.</strong>
          <small>TRY ANOTHER PLACE</small>
        </div>
      </div>
    )
  }

  const isActive = playback === 'playing' || playback === 'loading'
  const bitrate = station.bitrateKbps ? ` · ${station.bitrateKbps} KBPS` : ''
  const dataTrace = buildDataTrace(station.bitrateKbps)
  const dataTraceLabel = station.bitrateKbps
    ? `IP DATA · ${station.bitrateKbps} KBPS`
    : 'IP DATA · RATE UNKNOWN'
  const dialPosition =
    stations.length === 1
      ? 50
      : (state.stationIndex / (stations.length - 1)) * 100

  return (
    <div className={cn(css.radioModule, fxq.radioModule)} data-state={playback}>
      {streamAudio}

      <div className={css.radioScreen}>
        <span>
          LOCAL SIGNAL / {destinationCode} · CH{' '}
          {String(state.stationIndex + 1).padStart(2, '0')}
        </span>
        <strong title={station.station}>{station.station}</strong>
        <small>
          {STATUS_COPY[playback]} · {station.format}
          {bitrate}
        </small>
        <div
          className={cn(css.radioScope, fxq.radioScope)}
          role='img'
          aria-label={
            station.bitrateKbps
              ? `Incoming internet stream data rate: ${station.bitrateKbps} kilobits per second`
              : 'Incoming internet stream data rate is unknown'
          }
        >
          <svg
            viewBox='0 0 120 18'
            preserveAspectRatio='none'
            aria-hidden='true'
          >
            <path d={dataTrace} />
          </svg>
          <span>{dataTraceLabel}</span>
          <i
            style={{ '--radio-position': `${dialPosition}%` } as CSSProperties}
          />
        </div>
      </div>

      <div className={css.radioControls}>
        <button
          type='button'
          className={css.radioPower}
          aria-pressed={isActive}
          aria-label={`${isActive ? 'Hold' : 'Listen to'} ${station.station} from ${destinationName}`}
          onClick={play}
        >
          <span aria-hidden='true'>{isActive ? 'HOLD' : 'LISTEN'}</span>
        </button>
        <fieldset
          className={css.radioPresets}
          style={
            {
              '--radio-preset-count': stations.length,
            } as CSSProperties
          }
        >
          <legend className='sr-only'>
            Radio stations near {destinationName}
          </legend>
          {stations.map((preset, index) => (
            <button
              key={`${preset.destinationCode}-${preset.stationUuid ?? preset.streamUrl}`}
              type='button'
              aria-label={`Tune to ${preset.station}`}
              aria-pressed={state.stationIndex === index}
              title={preset.station}
              onClick={() => tune(index)}
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              <i aria-hidden='true' />
            </button>
          ))}
        </fieldset>
      </div>

      <span
        className='sr-only'
        role='status'
        aria-live='polite'
        aria-atomic='true'
      >
        {STATUS_COPY[playback]}: {station.station}
      </span>
    </div>
  )
}
