import type { Route } from 'next'
import { useReducer } from 'react'
import type { TransitionT } from './context'

export type State = {
  offshore?: 'cloud'
  offshoreDuration?: number
  hasRequestedUnmount: boolean
  willUnmount: boolean
  url: Route | ''
}

export const DEFAULT_STATE: State = {
  hasRequestedUnmount: false,
  willUnmount: false,
  url: '',
}

type Action =
  | { type: 'NAVIGATE'; payload: { url: Route } }
  | { type: 'UNMOUNT' }
  | { type: 'RESET' }
  | {
      type: 'OFFSHORE'
      payload: { offshore: State['offshore']; duration?: number }
    }

const assertNever = (value: never): never => {
  throw new Error(`Unhandled action: ${JSON.stringify(value)}`)
}

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'NAVIGATE':
      return {
        ...state,
        hasRequestedUnmount: true,
        url: action.payload.url,
      }
    case 'UNMOUNT':
      return { ...state, willUnmount: true }
    case 'RESET':
      return { ...DEFAULT_STATE, offshore: state.offshore }
    case 'OFFSHORE':
      return {
        ...state,
        offshore: action.payload.offshore,
        offshoreDuration: action.payload.duration,
      }
    default:
      return assertNever(action)
  }
}

export const useStateReducer = (): TransitionT => {
  const [state, dispatch] = useReducer(reducer, DEFAULT_STATE)
  const unmount = () => dispatch({ type: 'UNMOUNT' })
  const reset = () => dispatch({ type: 'RESET' })
  const setOffshore = (offshore: State['offshore'], duration?: number) =>
    dispatch({ type: 'OFFSHORE', payload: { offshore, duration } })
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
