export const STARTUP_TIMEOUT_MS = 12_000

export type RadioPhase =
  | 'error'
  | 'loading'
  | 'off'
  | 'playing'
  | 'recovering'
  | 'tuning'

type RadioCore = {
  attempt: number
  attempted: ReadonlySet<number>
  stationCount: number
  stationIndex: number
}

export type RadioState =
  | (RadioCore & { phase: 'off'; held: boolean })
  | (RadioCore & { phase: Exclude<RadioPhase, 'off'> })

// start stamps the controller's attempt counter; audio events echo the
// attempt of the media session that emitted them, so stale echoes drop here
export type RadioEvent =
  | { type: 'tune'; stationIndex: number }
  | { type: 'stations'; stationCount: number }
  | { type: 'start'; stationIndex: number; attempt: number }
  | { type: 'hold' }
  | { type: 'audio-playing'; attempt: number }
  | { type: 'audio-waiting'; attempt: number }
  | { type: 'station-failed'; attempt: number }

const NO_ATTEMPTS: ReadonlySet<number> = new Set()

export const initialRadio = (stationCount: number): RadioState => ({
  phase: 'off',
  held: false,
  attempt: 0,
  attempted: NO_ATTEMPTS,
  stationCount,
  stationIndex: 0,
})

export const wantsPlayback = (state: RadioState): boolean =>
  state.phase !== 'off' && state.phase !== 'error'

const assertNever = (value: never): never => {
  throw new Error(`Unhandled radio event: ${JSON.stringify(value)}`)
}

const nextUnattempted = (
  attempted: ReadonlySet<number>,
  stationCount: number,
): number => {
  for (let index = 0; index < stationCount; index += 1) {
    if (!attempted.has(index)) return index
  }
  return -1
}

const retune = (
  state: RadioState,
  event: { type: 'tune'; stationIndex: number },
): RadioState => {
  if (event.stationIndex === state.stationIndex) return state
  if (!wantsPlayback(state)) {
    return {
      phase: 'off',
      held: false,
      attempt: state.attempt,
      attempted: state.attempted,
      stationCount: state.stationCount,
      stationIndex: event.stationIndex,
    }
  }
  return {
    phase: 'tuning',
    attempt: state.attempt,
    attempted: NO_ATTEMPTS,
    stationCount: state.stationCount,
    stationIndex: event.stationIndex,
  }
}

const swapStations = (state: RadioState, stationCount: number): RadioState => {
  const core = {
    attempt: state.attempt,
    attempted: NO_ATTEMPTS,
    stationCount,
    stationIndex: 0,
  }
  if (!wantsPlayback(state)) return { ...core, phase: 'off', held: false }
  if (stationCount === 0) return { ...core, phase: 'error' }
  return { ...core, phase: 'tuning' }
}

const beginAttempt = (
  state: RadioState,
  event: { type: 'start'; stationIndex: number; attempt: number },
): RadioState => {
  const previous = wantsPlayback(state) ? state.attempted : NO_ATTEMPTS
  return {
    phase: 'loading',
    attempt: event.attempt,
    attempted: new Set(previous).add(event.stationIndex),
    stationCount: state.stationCount,
    stationIndex: event.stationIndex,
  }
}

const park = (state: RadioState): RadioState => {
  if (!wantsPlayback(state)) return state
  return {
    phase: 'off',
    held: true,
    attempt: state.attempt,
    attempted: state.attempted,
    stationCount: state.stationCount,
    stationIndex: state.stationIndex,
  }
}

const lockSignal = (state: RadioState, attempt: number): RadioState => {
  if (attempt !== state.attempt || state.phase !== 'loading') return state
  return {
    phase: 'playing',
    attempt: state.attempt,
    attempted: NO_ATTEMPTS,
    stationCount: state.stationCount,
    stationIndex: state.stationIndex,
  }
}

const rebuffer = (state: RadioState, attempt: number): RadioState => {
  if (attempt !== state.attempt || state.phase !== 'playing') return state
  return {
    phase: 'loading',
    attempt: state.attempt,
    attempted: state.attempted,
    stationCount: state.stationCount,
    stationIndex: state.stationIndex,
  }
}

const recoverFromFailure = (state: RadioState, attempt: number): RadioState => {
  if (attempt !== state.attempt) return state
  if (state.phase !== 'loading' && state.phase !== 'playing') return state
  const attempted = new Set(state.attempted).add(state.stationIndex)
  const nextIndex = nextUnattempted(attempted, state.stationCount)
  if (nextIndex < 0) {
    return {
      phase: 'error',
      attempt: state.attempt,
      attempted,
      stationCount: state.stationCount,
      stationIndex: state.stationIndex,
    }
  }
  return {
    phase: 'recovering',
    attempt: state.attempt,
    attempted,
    stationCount: state.stationCount,
    stationIndex: nextIndex,
  }
}

export const reduceRadio = (
  state: RadioState,
  event: RadioEvent,
): RadioState => {
  switch (event.type) {
    case 'tune':
      return retune(state, event)
    case 'stations':
      return swapStations(state, event.stationCount)
    case 'start':
      return beginAttempt(state, event)
    case 'hold':
      return park(state)
    case 'audio-playing':
      return lockSignal(state, event.attempt)
    case 'audio-waiting':
      return rebuffer(state, event.attempt)
    case 'station-failed':
      return recoverFromFailure(state, event.attempt)
    default:
      return assertNever(event)
  }
}
