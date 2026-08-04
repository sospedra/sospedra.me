import type { RadioStation } from './radio-stations.ts'
import { type RadioEvent, STARTUP_TIMEOUT_MS } from './radio-tuner.ts'

type MediaEventName = 'ended' | 'error' | 'playing' | 'waiting'

export type RadioAudioElement = {
  src: string
  play: () => Promise<void>
  pause: () => void
  load: () => void
  removeAttribute: (name: string) => void
  canPlayType: (mimeType: string) => string
  addEventListener: (name: MediaEventName, handler: () => void) => void
  removeEventListener: (name: MediaEventName, handler: () => void) => void
}

type TimerHandle = unknown

export type RadioControllerDeps = {
  audio: () => RadioAudioElement | null
  dispatch: (event: RadioEvent) => void
  setTimer?: (handler: () => void, ms: number) => TimerHandle
  clearTimer?: (handle: TimerHandle) => void
}

export type RadioController = {
  start: (station: RadioStation, stationIndex: number) => void
  hold: () => void
  quiesce: () => void
}

const isNotAllowed = (error: unknown) =>
  error instanceof DOMException && error.name === 'NotAllowedError'

const needsHlsSupport = (station: RadioStation) =>
  station.format === 'HLS' || station.streamUrl.toLowerCase().includes('.m3u8')

const canPlayHls = (element: RadioAudioElement) =>
  Boolean(
    element.canPlayType('application/vnd.apple.mpegurl') ||
      element.canPlayType('application/x-mpegURL'),
  )

export const createRadioController = ({
  audio,
  dispatch,
  setTimer = (handler, ms) => setTimeout(handler, ms),
  clearTimer = (handle) => clearTimeout(handle as number),
}: RadioControllerDeps): RadioController => {
  let session = 0
  let detachListeners: (() => void) | null = null
  let timer: TimerHandle | null = null

  const clearRecoveryTimer = () => {
    if (timer === null) return
    clearTimer(timer)
    timer = null
  }

  const detach = () => {
    detachListeners?.()
    detachListeners = null
  }

  const silence = () => {
    detach()
    clearRecoveryTimer()
    const element = audio()
    if (!element) return
    element.pause()
    element.removeAttribute('src')
    element.load()
  }

  const fail = (attempt: number) => {
    silence()
    dispatch({ type: 'station-failed', attempt })
  }

  const armRecoveryTimer = (attempt: number) => {
    clearRecoveryTimer()
    timer = setTimer(() => {
      timer = null
      if (session !== attempt) return
      fail(attempt)
    }, STARTUP_TIMEOUT_MS)
  }

  const attachListeners = (element: RadioAudioElement, attempt: number) => {
    const guarded = (handler: () => void) => () => {
      if (session === attempt) handler()
    }
    const onPlaying = guarded(() => {
      clearRecoveryTimer()
      dispatch({ type: 'audio-playing', attempt })
    })
    const onWaiting = guarded(() => {
      if (timer === null) armRecoveryTimer(attempt)
      dispatch({ type: 'audio-waiting', attempt })
    })
    const onFailure = guarded(() => fail(attempt))

    // 'stalled' is deliberately unhandled: fetching can stall while buffered playback continues
    element.addEventListener('playing', onPlaying)
    element.addEventListener('waiting', onWaiting)
    element.addEventListener('ended', onFailure)
    element.addEventListener('error', onFailure)
    detachListeners = () => {
      element.removeEventListener('playing', onPlaying)
      element.removeEventListener('waiting', onWaiting)
      element.removeEventListener('ended', onFailure)
      element.removeEventListener('error', onFailure)
    }
  }

  const start = (station: RadioStation, stationIndex: number) => {
    session += 1
    const attempt = session
    detach()
    clearRecoveryTimer()
    dispatch({ type: 'start', stationIndex, attempt })

    const element = audio()
    if (!element) {
      fail(attempt)
      return
    }
    element.pause()
    if (needsHlsSupport(station) && !canPlayHls(element)) {
      fail(attempt)
      return
    }

    attachListeners(element, attempt)
    element.src = station.streamUrl
    element.load()
    armRecoveryTimer(attempt)
    element.play().catch((error: unknown) => {
      if (session !== attempt) return
      if (isNotAllowed(error)) {
        clearRecoveryTimer()
        detach()
        dispatch({ type: 'hold' })
        return
      }
      fail(attempt)
    })
  }

  const hold = () => {
    session += 1
    detach()
    clearRecoveryTimer()
    audio()?.pause()
    dispatch({ type: 'hold' })
  }

  const quiesce = () => {
    session += 1
    silence()
  }

  return { start, hold, quiesce }
}
