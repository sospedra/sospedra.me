import { match } from 'ts-pattern'

export const WARM_MS = 1100
export const SWITCH_MS = 480
export const COOL_MS = 400

export type TvStatus =
  | 'off'
  | 'cooling'
  | 'warming'
  | 'inserting'
  | 'switching'
  | 'playing'
  | 'paused'

export type TapeBurst = 'snow' | 'bars'

export type TvState = {
  status: TvStatus
  tape: number
  incoming: number | null
  cold: boolean
  burst: TapeBurst
}

export type TvEvent =
  | { type: 'power' }
  | { type: 'ready' }
  | { type: 'toggle' }
  | { type: 'insert'; tape: number }
  | { type: 'inserted'; burst: TapeBurst }

export const reducer = (state: TvState, event: TvEvent): TvState =>
  match(event)
    .returnType<TvState>()
    .with({ type: 'power' }, () => {
      if (state.status === 'off' || state.status === 'cooling')
        return { ...state, status: 'warming' }
      return { ...state, status: 'cooling', incoming: null, cold: false }
    })
    .with({ type: 'ready' }, () => {
      if (state.status === 'cooling') return { ...state, status: 'off' }
      if (state.status !== 'warming' && state.status !== 'switching')
        return state
      return { ...state, status: 'playing' }
    })
    .with({ type: 'toggle' }, () => {
      if (state.status === 'playing') return { ...state, status: 'paused' }
      if (state.status === 'paused') return { ...state, status: 'playing' }
      return state
    })
    .with({ type: 'insert' }, ({ tape }) => {
      if (state.status === 'inserting' || tape === state.tape) return state
      return {
        ...state,
        status: 'inserting',
        incoming: tape,
        cold: state.status === 'off' || state.status === 'cooling',
      }
    })
    .with({ type: 'inserted' }, ({ burst }) => {
      if (state.status !== 'inserting' || state.incoming === null) return state
      return {
        status: state.cold ? 'warming' : 'switching',
        tape: state.incoming,
        incoming: null,
        cold: false,
        burst,
      }
    })
    .exhaustive()

export const drawBurst = (): TapeBurst =>
  Math.random() < 0.2 ? 'bars' : 'snow'

export const BARS_MS = 1150

export const OSD_STATUS: Record<TvStatus, string> = {
  off: '',
  cooling: '',
  warming: 'CUE UP',
  inserting: 'INSERT',
  switching: 'TRACKING',
  playing: 'PLAY',
  paused: 'PAUSE',
}
