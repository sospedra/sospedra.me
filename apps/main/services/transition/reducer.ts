import type { Route } from 'next'
import { useReducer } from 'react'
import { match } from 'ts-pattern'
import { canGoBackWithinSite } from '../navigation-history.ts'
import { getOriginPathname } from './altitude.ts'
import type { TransitionT } from './context'

export type Offshore = { kind: 'cloud'; duration?: number }

export type NavKind = 'push' | 'pop'

export type NavPhase =
  | { phase: 'idle' }
  | { phase: 'departing'; url: Route; origin: string; nav: NavKind }
  | { phase: 'unmounting'; url: Route; origin: string; nav: NavKind }

export type State = NavPhase & { offshore: Offshore | undefined }

export const DEFAULT_STATE: State = { phase: 'idle', offshore: undefined }

export type Action =
  | { type: 'NAVIGATE'; payload: { url: Route; origin: string; nav: NavKind } }
  | { type: 'UNMOUNT' }
  | { type: 'RESET' }
  | { type: 'OFFSHORE'; payload: { offshore: Offshore | undefined } }

export const destinationUrl = (state: State): Route | null =>
  state.phase === 'idle' ? null : state.url

export const reducer = (state: State, action: Action): State =>
  match(action)
    .returnType<State>()
    .with({ type: 'NAVIGATE' }, ({ payload }) => ({
      // a mid-unmount navigate retargets the push instead of restarting
      phase: state.phase === 'unmounting' ? 'unmounting' : 'departing',
      url: payload.url,
      origin: payload.origin,
      nav: payload.nav,
      offshore: state.offshore,
    }))
    .with({ type: 'UNMOUNT' }, () => {
      if (state.phase !== 'departing') return state
      return {
        phase: 'unmounting',
        url: state.url,
        origin: state.origin,
        nav: state.nav,
        offshore: state.offshore,
      }
    })
    .with({ type: 'RESET' }, () => {
      if (state.phase === 'idle') return state
      return { phase: 'idle', offshore: state.offshore }
    })
    .with({ type: 'OFFSHORE' }, ({ payload }) => ({
      ...state,
      offshore: payload.offshore,
    }))
    .exhaustive()

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
    dispatch({
      type: 'NAVIGATE',
      payload: { url, origin: window.location.pathname, nav: 'push' },
    })
  }
  const navigateBack = () => {
    if (!canGoBackWithinSite()) {
      navigate('/')
      return
    }
    const origin = window.location.pathname
    const destination = getOriginPathname(origin)
    // an unknown or same-route predecessor pops without the climb
    if (destination === null || destination === origin) {
      window.history.back()
      return
    }
    dispatch({
      type: 'NAVIGATE',
      payload: { url: destination as Route, origin, nav: 'pop' },
    })
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
    navigateBack,
    navigateLater,
    setOffshore,
  }
}
