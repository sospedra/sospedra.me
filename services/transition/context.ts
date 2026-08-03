import type { Route } from 'next'
import React, { useContext } from 'react'
import { DEFAULT_STATE, type State } from './reducer'

export type TransitionT = State & {
  navigate: (url: Route) => void
  navigateLater: (url: Route, delay: number) => void
  unmount: () => void
  reset: () => void
  setOffshore: (offshore: State['offshore'], duration?: number) => void
}

export const TransitionCTX = React.createContext<TransitionT>({
  ...DEFAULT_STATE,
  navigate: () => {},
  navigateLater: () => {},
  unmount: () => {},
  reset: () => {},
  setOffshore: () => {},
})

export const useRouteTransition = (): TransitionT => {
  return useContext(TransitionCTX)
}
