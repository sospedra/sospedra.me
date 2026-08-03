import type { Route } from 'next'
import { useReducer } from 'react'
import type { TransitionT } from './context'

export type Offshore = { kind: 'cloud'; duration?: number }

export type NavPhase =
  | { phase: 'idle' }
  | { phase: 'departing'; url: Route }
  | { phase: 'unmounting'; url: Route }

export type State = NavPhase & { offshore: Offshore | undefined }

export const DEFAULT_STATE: State = { phase: 'idle', offshore: undefined }

export type Action =
  | { type: 'NAVIGATE'; payload: { url: Route } }
  | { type: 'UNMOUNT' }
  | { type: 'RESET' }
  | { type: 'OFFSHORE'; payload: { offshore: Offshore | undefined } }

export const destinationUrl = (state: State): Route | null =>
  state.phase === 'idle' ? null : state.url

const assertNever = (value: never): never => {
  throw new Error(`Unhandled action: ${JSON.stringify(value)}`)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'NAVIGATE':
      return {
        // a mid-unmount navigate retargets the push instead of restarting
        phase: state.phase === 'unmounting' ? 'unmounting' : 'departing',
        url: action.payload.url,
        offshore: state.offshore,
      }
    case 'UNMOUNT':
      if (state.phase !== 'departing') return state
      return { phase: 'unmounting', url: state.url, offshore: state.offshore }
    case 'RESET':
      return { phase: 'idle', offshore: state.offshore }
    case 'OFFSHORE':
      return { ...state, offshore: action.payload.offshore }
    default:
      return assertNever(action)
  }
}

export const useStateReducer = (): TransitionT => {
  const [state, dispatch] = useReducer(reducer, DEFAULT_STATE)
  const unmount = () => dispatch({ type: 'UNMOUNT' })
  const reset = () => dispatch({ type: 'RESET' })
  const setOffshore = (offshore: Offshore | undefined) =>
    dispatch({ type: 'OFFSHORE', payload: { offshore } })
  const navigate = (url: Route) => {
    // same-route guard: the pathname never changes, so reset instead
    if (url === window.location.pathname) {
      dispatch({ type: 'RESET' })
      return
    }
    dispatch({ type: 'NAVIGATE', payload: { url } })
  }
  const navigateLater = (url: Route, delay: number) => {
    const origin = window.location.pathname
    setTimeout(() => {
      // a back/forward landed elsewhere meanwhile: drop the stale intent,
      // pushing now would truncate the history the user just walked
      if (window.location.pathname !== origin) return
      navigate(url)
    }, delay)
  }

  return {
    ...state,
    unmount,
    reset,
    navigate,
    navigateLater,
    setOffshore,
  }
}
