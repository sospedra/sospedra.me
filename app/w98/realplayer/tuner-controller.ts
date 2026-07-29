import type { RealStation } from './stations.ts'
import { CONNECT_TIMEOUT_MS, DEFAULT_VOLUME, type TunerEvent } from './tuner.ts'

type MediaEventName = 'ended' | 'error' | 'pause' | 'playing' | 'waiting'

export type TunerAudioElement = {
  src: string
  volume: number
  muted: boolean
  preload: string
  play: () => Promise<void>
  pause: () => void
  load: () => void
  removeAttribute: (name: string) => void
  addEventListener: (name: MediaEventName, handler: () => void) => void
  removeEventListener: (name: MediaEventName, handler: () => void) => void
}

type TimerHandle = unknown

export type TunerControllerDeps = {
  createAudio: () => TunerAudioElement
  dispatch: (event: TunerEvent) => void
  setTimer?: (handler: () => void, ms: number) => TimerHandle
  clearTimer?: (handle: TimerHandle) => void
}

export type TunerController = {
  tune: (station: RealStation) => void
  stop: () => void
  pauseUser: () => void
  setVolume: (value: number) => void
  setMuted: (value: boolean) => void
  quiesce: () => void
  dispose: () => void
}

const isNotAllowed = (error: unknown) =>
  error instanceof DOMException && error.name === 'NotAllowedError'

export const createTunerController = ({
  createAudio,
  dispatch,
  setTimer = (handler, ms) => setTimeout(handler, ms),
  clearTimer = (handle) => clearTimeout(handle as number),
}: TunerControllerDeps): TunerController => {
  let audio: TunerAudioElement | null = null
  let attempt = 0
  let detachListeners: (() => void) | null = null
  let timer: TimerHandle | null = null
  let volume = DEFAULT_VOLUME
  let muted = false

  const clearConnectTimer = () => {
    if (timer === null) return
    clearTimer(timer)
    timer = null
  }

  const silence = () => {
    detachListeners?.()
    detachListeners = null
    clearConnectTimer()
    if (!audio) return
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
  }

  const ensureAudio = (): TunerAudioElement => {
    if (audio) return audio
    audio = createAudio()
    audio.preload = 'none'
    audio.volume = volume
    audio.muted = muted
    return audio
  }

  const armConnectTimer = (session: number) => {
    clearConnectTimer()
    timer = setTimer(() => {
      timer = null
      if (attempt !== session) return
      silence()
      dispatch({ type: 'connect-timeout', attempt: session })
    }, CONNECT_TIMEOUT_MS)
  }

  const attachListeners = (element: TunerAudioElement, session: number) => {
    const guarded = (handler: () => void) => () => {
      if (attempt === session) handler()
    }
    const onPlaying = guarded(() => {
      clearConnectTimer()
      dispatch({ type: 'audio-playing', attempt: session })
    })
    const onWaiting = guarded(() => {
      if (timer === null) armConnectTimer(session)
      dispatch({ type: 'audio-waiting', attempt: session })
    })
    const onPause = guarded(() =>
      dispatch({ type: 'audio-pause', attempt: session }),
    )
    const onFailure = guarded(() => {
      clearConnectTimer()
      dispatch({ type: 'audio-error', attempt: session })
    })

    // 'stalled' is deliberately unhandled: fetching can stall while buffered
    // playback continues, and recovery emits no 'playing' to clear the timer
    element.addEventListener('playing', onPlaying)
    element.addEventListener('waiting', onWaiting)
    element.addEventListener('pause', onPause)
    element.addEventListener('ended', onFailure)
    element.addEventListener('error', onFailure)
    detachListeners = () => {
      element.removeEventListener('playing', onPlaying)
      element.removeEventListener('waiting', onWaiting)
      element.removeEventListener('pause', onPause)
      element.removeEventListener('ended', onFailure)
      element.removeEventListener('error', onFailure)
    }
  }

  const tune = (station: RealStation) => {
    attempt += 1
    const session = attempt
    const element = ensureAudio()

    detachListeners?.()
    clearConnectTimer()
    element.pause()
    dispatch({ type: 'tune', stationId: station.id, attempt: session })

    attachListeners(element, session)
    element.src = station.streamUrl
    element.load()
    armConnectTimer(session)
    element.play().catch((error: unknown) => {
      if (attempt !== session) return
      if (isNotAllowed(error)) {
        clearConnectTimer()
        dispatch({ type: 'user-pause' })
        return
      }
      silence()
      dispatch({ type: 'audio-error', attempt: session })
    })
  }

  const stop = () => {
    attempt += 1
    silence()
    dispatch({ type: 'stop', attempt })
  }

  const pauseUser = () => {
    clearConnectTimer()
    audio?.pause()
    dispatch({ type: 'user-pause' })
  }

  return {
    tune,
    stop,
    pauseUser,
    setVolume: (value) => {
      volume = value
      if (audio) audio.volume = value
    },
    setMuted: (value) => {
      muted = value
      if (audio) audio.muted = value
    },
    quiesce: () => {
      attempt += 1
      silence()
    },
    dispose: () => {
      attempt += 1
      silence()
      audio = null
    },
  }
}
