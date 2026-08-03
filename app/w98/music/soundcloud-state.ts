import type { SoundCloudSound } from './soundcloud.ts'

export type SoundCloudStatus =
  | { phase: 'error'; message: string }
  | { phase: 'loading' }
  | { phase: 'playing' }
  | { phase: 'ready' }

export type SoundCloudState = {
  currentIndex: number
  currentSound: SoundCloudSound | null
  duration: number
  position: number
  sounds: SoundCloudSound[]
  status: SoundCloudStatus
}

export type SoundCloudEvent =
  | { type: 'error'; message: string }
  | { type: 'finish' }
  | { type: 'load-start' }
  | { type: 'pause' }
  | { type: 'play' }
  | { type: 'playlist-sync'; sounds: SoundCloudSound[] }
  | { type: 'progress'; position: number }
  | { type: 'ready' }
  | { type: 'select-track'; index: number }
  | {
      type: 'sound-sync'
      currentIndex: number
      currentSound: SoundCloudSound
      duration: number
    }
  | { type: 'timeout'; message: string }

export const INITIAL_SOUNDCLOUD: SoundCloudState = {
  currentIndex: 0,
  currentSound: null,
  duration: 0,
  position: 0,
  sounds: [],
  status: { phase: 'loading' },
}

const applySelectTrack = (
  state: SoundCloudState,
  index: number,
): SoundCloudState => ({
  ...state,
  currentIndex: index,
  currentSound: state.sounds[index] ?? null,
  duration: state.sounds[index]?.duration ?? 0,
  position: 0,
  status: state.status.phase === 'error' ? { phase: 'loading' } : state.status,
})

const applySoundSync = (
  state: SoundCloudState,
  event: Extract<SoundCloudEvent, { type: 'sound-sync' }>,
): SoundCloudState => ({
  ...state,
  currentIndex: event.currentIndex,
  currentSound: event.currentSound,
  duration: event.duration,
  position: state.currentIndex === event.currentIndex ? state.position : 0,
  sounds: state.sounds.map((sound, index) =>
    index === event.currentIndex ? { ...sound, ...event.currentSound } : sound,
  ),
})

export const reduceSoundCloud = (
  state: SoundCloudState,
  event: SoundCloudEvent,
): SoundCloudState => {
  switch (event.type) {
    case 'error':
      return { ...state, status: { message: event.message, phase: 'error' } }
    case 'finish':
      return {
        ...state,
        position: state.duration,
        status:
          state.status.phase === 'playing' ? { phase: 'ready' } : state.status,
      }
    case 'load-start':
      return INITIAL_SOUNDCLOUD
    case 'pause':
      return state.status.phase === 'playing'
        ? { ...state, status: { phase: 'ready' } }
        : state
    case 'play':
      return { ...state, status: { phase: 'playing' } }
    case 'playlist-sync':
      return { ...state, sounds: event.sounds }
    case 'progress':
      return { ...state, position: event.position }
    case 'ready':
      return state.status.phase === 'playing'
        ? state
        : { ...state, status: { phase: 'ready' } }
    case 'select-track':
      return applySelectTrack(state, event.index)
    case 'sound-sync':
      return applySoundSync(state, event)
    case 'timeout':
      return state.status.phase === 'loading'
        ? { ...state, status: { message: event.message, phase: 'error' } }
        : state
  }
}
