'use client'

import type { CSSProperties } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getRadioStations } from './radio-stations'
import type { TravelAudio } from './travel-audio'
import css from './travel-control.module.css'

type PlaybackState = 'error' | 'idle' | 'loading' | 'paused' | 'playing'
const STARTUP_TIMEOUT_MS = 12_000
const TRACE_WIDTH = 120

const STATUS_COPY: Record<PlaybackState, string> = {
  error: 'SIGNAL LOST',
  idle: 'SIGNAL READY',
  loading: 'FINDING SIGNAL',
  paused: 'SIGNAL HELD',
  playing: 'SIGNAL LOCKED',
}

const buildDataTrace = (bitrateKbps: number | null): string => {
  if (!bitrateKbps) return `M0 9 H${TRACE_WIDTH}`
  const pulseCount = Math.max(2, Math.min(16, Math.round(bitrateKbps / 16)))
  const pulseWidth = TRACE_WIDTH / pulseCount
  let path = 'M0 13'

  for (let index = 0; index < pulseCount; index += 1) {
    const start = index * pulseWidth
    const rise = start + pulseWidth * 0.18
    const fall = start + pulseWidth * 0.58
    const end = start + pulseWidth
    path += ` H${rise.toFixed(2)} V5 H${fall.toFixed(2)} V13 H${end.toFixed(2)}`
  }

  return path
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
  const [stationIndex, setStationIndex] = useState(0)
  const [playback, setPlayback] = useState<PlaybackState>('idle')
  const audioRef = useRef<HTMLAudioElement>(null)
  const stationsRef = useRef(stations)
  const stationIndexRef = useRef(0)
  const attemptedRef = useRef(new Set<number>())
  const wantsPlaybackRef = useRef(false)
  const attemptTokenRef = useRef(0)
  const startupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mediaCleanupRef = useRef<(() => void) | null>(null)
  const previousDestinationRef = useRef(destinationCode)
  const recoverFromRef = useRef<(failedIndex: number, token: number) => void>(
    () => undefined,
  )
  const station = stations[stationIndex]

  useEffect(() => {
    stationsRef.current = stations
  }, [stations])

  const clearStartupTimer = useCallback(() => {
    if (startupTimerRef.current === null) return
    clearTimeout(startupTimerRef.current)
    startupTimerRef.current = null
  }, [])

  const detachMediaListeners = useCallback(() => {
    mediaCleanupRef.current?.()
    mediaCleanupRef.current = null
  }, [])

  const armRecoveryTimer = useCallback(
    (failedIndex: number, attemptToken: number) => {
      clearStartupTimer()
      startupTimerRef.current = setTimeout(() => {
        recoverFromRef.current(failedIndex, attemptToken)
      }, STARTUP_TIMEOUT_MS)
    },
    [clearStartupTimer],
  )

  const startStation = useCallback(
    (nextIndex: number, resetAttempts: boolean) => {
      const audio = audioRef.current
      const nextStation = stationsRef.current[nextIndex]
      if (!audio || !nextStation) {
        wantsPlaybackRef.current = false
        attemptTokenRef.current += 1
        clearStartupTimer()
        detachMediaListeners()
        travelAudio.stopReceiverStatic()
        if (audio) {
          audio.pause()
          audio.removeAttribute('src')
          audio.load()
        }
        setPlayback('error')
        return
      }

      clearStartupTimer()
      detachMediaListeners()
      if (resetAttempts) attemptedRef.current.clear()
      attemptedRef.current.add(nextIndex)
      stationIndexRef.current = nextIndex
      wantsPlaybackRef.current = true
      setStationIndex(nextIndex)
      setPlayback('loading')

      const attemptToken = attemptTokenRef.current + 1
      attemptTokenRef.current = attemptToken
      const isCurrentAttempt = () =>
        wantsPlaybackRef.current && attemptToken === attemptTokenRef.current
      const recoverCurrentAttempt = () => {
        if (isCurrentAttempt()) {
          recoverFromRef.current(nextIndex, attemptToken)
        }
      }
      const handlePlaying = () => {
        if (!isCurrentAttempt()) return
        clearStartupTimer()
        travelAudio.stopReceiverStatic()
        setPlayback('playing')
      }
      const handleWaiting = () => {
        if (!isCurrentAttempt()) return
        setPlayback('loading')
        if (startupTimerRef.current === null) {
          armRecoveryTimer(nextIndex, attemptToken)
        }
      }
      const handlePause = () => {
        if (attemptToken !== attemptTokenRef.current) return
        if (!wantsPlaybackRef.current) setPlayback('paused')
      }

      audio.addEventListener('playing', handlePlaying)
      audio.addEventListener('waiting', handleWaiting)
      audio.addEventListener('stalled', handleWaiting)
      audio.addEventListener('ended', recoverCurrentAttempt)
      audio.addEventListener('error', recoverCurrentAttempt)
      audio.addEventListener('pause', handlePause)
      mediaCleanupRef.current = () => {
        audio.removeEventListener('playing', handlePlaying)
        audio.removeEventListener('waiting', handleWaiting)
        audio.removeEventListener('stalled', handleWaiting)
        audio.removeEventListener('ended', recoverCurrentAttempt)
        audio.removeEventListener('error', recoverCurrentAttempt)
        audio.removeEventListener('pause', handlePause)
      }

      const isHls =
        nextStation.format === 'HLS' ||
        nextStation.streamUrl.toLowerCase().includes('.m3u8')
      if (
        isHls &&
        !audio.canPlayType('application/vnd.apple.mpegurl') &&
        !audio.canPlayType('application/x-mpegURL')
      ) {
        recoverCurrentAttempt()
        return
      }

      audio.pause()
      audio.src = nextStation.streamUrl
      audio.load()
      armRecoveryTimer(nextIndex, attemptToken)
      void audio.play().catch((error: unknown) => {
        if (!isCurrentAttempt()) return
        if (error instanceof DOMException && error.name === 'NotAllowedError') {
          wantsPlaybackRef.current = false
          clearStartupTimer()
          detachMediaListeners()
          travelAudio.stopReceiverStatic()
          setPlayback('paused')
          return
        }
        recoverCurrentAttempt()
      })
    },
    [armRecoveryTimer, clearStartupTimer, detachMediaListeners, travelAudio],
  )

  const recoverFrom = useCallback(
    (failedIndex: number, attemptToken: number) => {
      if (
        !wantsPlaybackRef.current ||
        attemptToken !== attemptTokenRef.current
      ) {
        return
      }

      attemptedRef.current.add(failedIndex)
      const nextIndex = stationsRef.current.findIndex(
        (_, index) => !attemptedRef.current.has(index),
      )
      if (nextIndex < 0) {
        wantsPlaybackRef.current = false
        attemptTokenRef.current += 1
        clearStartupTimer()
        detachMediaListeners()
        travelAudio.stopReceiverStatic()
        const audio = audioRef.current
        if (audio) {
          audio.pause()
          audio.removeAttribute('src')
          audio.load()
        }
        setPlayback('error')
        return
      }
      startStation(nextIndex, false)
    },
    [clearStartupTimer, detachMediaListeners, startStation, travelAudio],
  )
  useEffect(() => {
    recoverFromRef.current = recoverFrom
  }, [recoverFrom])

  useEffect(() => {
    const audio = audioRef.current

    return () => {
      wantsPlaybackRef.current = false
      attemptTokenRef.current += 1
      clearStartupTimer()
      detachMediaListeners()
      travelAudio.stopReceiverStatic()
      if (!audio) return
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
  }, [clearStartupTimer, detachMediaListeners, travelAudio])

  useEffect(() => {
    if (previousDestinationRef.current === destinationCode) return
    previousDestinationRef.current = destinationCode

    const shouldContinue = wantsPlaybackRef.current
    const audio = audioRef.current
    clearStartupTimer()
    detachMediaListeners()
    attemptTokenRef.current += 1
    attemptedRef.current.clear()
    stationIndexRef.current = 0
    setStationIndex(0)

    if (shouldContinue) travelAudio.startReceiverStatic()
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }

    if (shouldContinue) startStation(0, true)
    else setPlayback('idle')
  }, [
    clearStartupTimer,
    destinationCode,
    detachMediaListeners,
    startStation,
    travelAudio,
  ])

  const play = () => {
    const audio = audioRef.current
    if (!audio || !station) return

    travelAudio.arm()
    if (wantsPlaybackRef.current) {
      wantsPlaybackRef.current = false
      attemptTokenRef.current += 1
      clearStartupTimer()
      detachMediaListeners()
      travelAudio.stopReceiverStatic()
      audio.pause()
      setPlayback('paused')
      return
    }

    startStation(stationIndexRef.current, true)
  }

  const tune = (nextIndex: number) => {
    if (nextIndex === stationIndexRef.current) return
    const audio = audioRef.current
    const shouldResume = wantsPlaybackRef.current

    if (shouldResume) travelAudio.startReceiverStatic()
    clearStartupTimer()
    detachMediaListeners()
    attemptTokenRef.current += 1
    stationIndexRef.current = nextIndex
    setStationIndex(nextIndex)
    setPlayback(shouldResume ? 'loading' : 'idle')
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    if (shouldResume) startStation(nextIndex, true)
  }

  if (!station) {
    return (
      <div className={css.radioModule} data-state='error'>
        {/* biome-ignore lint/a11y/useMediaCaption: Live third-party radio streams do not expose timed caption tracks. */}
        <audio ref={audioRef} preload='none' />
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

  return (
    <div className={css.radioModule} data-state={playback}>
      {/* biome-ignore lint/a11y/useMediaCaption: Live third-party radio streams do not expose timed caption tracks. */}
      <audio ref={audioRef} preload='none' />

      <div className={css.radioScreen}>
        <span>
          LOCAL SIGNAL / {destinationCode} · CH{' '}
          {String(stationIndex + 1).padStart(2, '0')}
        </span>
        <strong title={station.station}>{station.station}</strong>
        <small>
          {STATUS_COPY[playback]} · {station.format}
          {bitrate}
        </small>
        <div
          className={css.radioScope}
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
            style={
              {
                '--radio-position': `${
                  stations.length === 1
                    ? 50
                    : (stationIndex / (stations.length - 1)) * 100
                }%`,
              } as CSSProperties
            }
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
              aria-pressed={stationIndex === index}
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
