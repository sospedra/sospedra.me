import { match } from 'ts-pattern'
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
): SoundCloudState =>
  match(event)
    .returnType<SoundCloudState>()
    .with({ type: 'error' }, ({ message }) => ({
      ...state,
      status: { message, phase: 'error' },
    }))
    .with({ type: 'finish' }, () => ({
      ...state,
      position: state.duration,
      status:
        state.status.phase === 'playing' ? { phase: 'ready' } : state.status,
    }))
    .with({ type: 'load-start' }, () => INITIAL_SOUNDCLOUD)
    .with({ type: 'pause' }, () =>
      state.status.phase === 'playing'
        ? { ...state, status: { phase: 'ready' } }
        : state,
    )
    .with({ type: 'play' }, () => ({ ...state, status: { phase: 'playing' } }))
    .with({ type: 'playlist-sync' }, ({ sounds }) => ({ ...state, sounds }))
    .with({ type: 'progress' }, ({ position }) => ({ ...state, position }))
    .with({ type: 'ready' }, () =>
      state.status.phase === 'playing'
        ? state
        : { ...state, status: { phase: 'ready' } },
    )
    .with({ type: 'select-track' }, ({ index }) =>
      applySelectTrack(state, index),
    )
    .with({ type: 'sound-sync' }, (event) => applySoundSync(state, event))
    .with({ type: 'timeout' }, ({ message }) =>
      state.status.phase === 'loading'
        ? { ...state, status: { message, phase: 'error' } }
        : state,
    )
    .exhaustive()
