import { match } from 'ts-pattern'

export type PlaybackState =
  | { source: 'local'; index: number }
  | { source: 'none' }
  | { source: 'soundcloud'; index: number; localIndex: number }

export type PlaybackEvent =
  | { type: 'bundled-ready' }
  | { type: 'load-soundcloud' }
  | { type: 'play-local'; index: number }
  | { type: 'select-soundcloud'; index: number }
  | { type: 'sync-soundcloud'; index: number }

export const INITIAL_PLAYBACK: PlaybackState = { source: 'none' }

// the local deck stays loaded (and resumable) while SoundCloud is active
export const localDeckIndex = (playback: PlaybackState): number => {
  if (playback.source === 'local') return playback.index
  if (playback.source === 'soundcloud') return playback.localIndex
  return -1
}

const armBundledDeck = (state: PlaybackState): PlaybackState => {
  if (state.source === 'none') return { index: 0, source: 'local' }
  if (state.source === 'soundcloud' && state.localIndex < 0) {
    return { ...state, localIndex: 0 }
  }
  return state
}

export const reducePlayback = (
  state: PlaybackState,
  event: PlaybackEvent,
): PlaybackState =>
  match(event)
    .returnType<PlaybackState>()
    .with({ type: 'bundled-ready' }, () => armBundledDeck(state))
    .with({ type: 'load-soundcloud' }, () => ({
      index: 0,
      localIndex: localDeckIndex(state),
      source: 'soundcloud',
    }))
    .with({ type: 'play-local' }, ({ index }) =>
      state.source === 'local' && state.index === index
        ? state
        : { index, source: 'local' },
    )
    .with({ type: 'select-soundcloud' }, ({ index }) => ({
      index,
      localIndex: localDeckIndex(state),
      source: 'soundcloud',
    }))
    .with({ type: 'sync-soundcloud' }, ({ index }) => {
      if (state.source !== 'soundcloud' || state.index === index) {
        return state
      }
      return { ...state, index }
    })
    .exhaustive()
