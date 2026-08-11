export type PlaybackState = {
  /** Seconds of UT the scrub sits on. Null means "at maximum". */
  now: number | null
  playing: boolean
}

export type PlaybackEvent =
  | { type: 'scrub'; seconds: number }
  | { type: 'play'; from: number }
  | { type: 'pause' }
  | { type: 'tick'; seconds: number; until: number }
  | { type: 'reset' }

export const initialPlayback: PlaybackState = { now: null, playing: false }

export const playbackReducer = (
  state: PlaybackState,
  event: PlaybackEvent,
): PlaybackState => {
  switch (event.type) {
    case 'scrub':
      return { now: event.seconds, playing: false }
    case 'play':
      return { now: event.from, playing: true }
    case 'pause':
      return state.playing ? { ...state, playing: false } : state
    case 'tick':
      if (!state.playing) return state
      if (event.seconds >= event.until) {
        return { now: event.until, playing: false }
      }
      return { ...state, now: event.seconds }
    case 'reset':
      return initialPlayback
  }
}
