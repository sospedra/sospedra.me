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
): PlaybackState => {
  switch (event.type) {
    case 'bundled-ready':
      return armBundledDeck(state)
    case 'load-soundcloud':
      return {
        index: 0,
        localIndex: localDeckIndex(state),
        source: 'soundcloud',
      }
    case 'play-local':
      return state.source === 'local' && state.index === event.index
        ? state
        : { index: event.index, source: 'local' }
    case 'select-soundcloud':
      return {
        index: event.index,
        localIndex: localDeckIndex(state),
        source: 'soundcloud',
      }
    case 'sync-soundcloud':
      if (state.source !== 'soundcloud' || state.index === event.index) {
        return state
      }
      return { ...state, index: event.index }
  }
}
