import { match } from 'ts-pattern'

export const CONNECT_TIMEOUT_MS = 15_000
export const DEFAULT_VOLUME = 0.72

type ActiveStatus = 'connecting' | 'error' | 'paused' | 'playing'

export type TunerStatus = ActiveStatus | 'idle'

export type TunerState =
  | { status: 'idle'; stationId: string | null; attempt: number }
  | { status: ActiveStatus; stationId: string; attempt: number }

// user events carry the controller's attempt counter; audio events echo the
// attempt of the media session that emitted them, so stale echoes drop here
export type TunerEvent =
  | { type: 'restore'; stationId: string }
  | { type: 'tune'; stationId: string; attempt: number }
  | { type: 'stop'; attempt: number }
  | { type: 'user-pause' }
  | { type: 'audio-playing'; attempt: number }
  | { type: 'audio-waiting'; attempt: number }
  | { type: 'audio-pause'; attempt: number }
  | { type: 'audio-error'; attempt: number }
  | { type: 'connect-timeout'; attempt: number }

export const INITIAL_TUNER: TunerState = {
  status: 'idle',
  stationId: null,
  attempt: 0,
}

const isVirginIdle = (state: TunerState) =>
  state.status === 'idle' && state.stationId === null

type HeldState = { status: ActiveStatus; stationId: string; attempt: number }

const isHeld = (state: TunerState): state is HeldState =>
  state.status === 'connecting' || state.status === 'playing'

export const reduceTuner = (state: TunerState, event: TunerEvent): TunerState =>
  match(event)
    .returnType<TunerState>()
    .with({ type: 'restore' }, ({ stationId }) => {
      if (!isVirginIdle(state)) return state
      return { ...state, stationId }
    })
    .with({ type: 'tune' }, (event) => ({
      status: 'connecting',
      stationId: event.stationId,
      attempt: event.attempt,
    }))
    .with({ type: 'stop' }, ({ attempt }) => ({
      status: 'idle',
      stationId: state.stationId,
      attempt,
    }))
    .with({ type: 'user-pause' }, () => {
      if (!isHeld(state)) return state
      return { ...state, status: 'paused' }
    })
    .with({ type: 'audio-playing' }, ({ attempt }) => {
      if (attempt !== state.attempt) return state
      if (state.status !== 'connecting' && state.status !== 'paused')
        return state
      return { ...state, status: 'playing' }
    })
    .with({ type: 'audio-waiting' }, ({ attempt }) => {
      if (attempt !== state.attempt) return state
      if (state.status !== 'playing') return state
      return { ...state, status: 'connecting' }
    })
    .with({ type: 'audio-pause' }, ({ attempt }) => {
      if (attempt !== state.attempt) return state
      if (state.status !== 'playing') return state
      return { ...state, status: 'paused' }
    })
    .with({ type: 'audio-error' }, ({ attempt }) => {
      if (attempt !== state.attempt) return state
      if (!isHeld(state)) return state
      return { ...state, status: 'error' }
    })
    .with({ type: 'connect-timeout' }, ({ attempt }) => {
      if (attempt !== state.attempt) return state
      if (state.status !== 'connecting') return state
      return { ...state, status: 'error' }
    })
    .exhaustive()
