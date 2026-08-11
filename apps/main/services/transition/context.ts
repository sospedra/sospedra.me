import type { Route } from 'next'
import React, { useContext } from 'react'
import { DEFAULT_STATE, type Offshore, type State } from './reducer'

export type TransitionT = State & {
  navigate: (url: Route) => void
  navigateBack: () => void
  navigateLater: (url: Route, delay: number) => void
  unmount: () => void
  reset: () => void
  setOffshore: (offshore: Offshore | undefined) => void
}

export const TransitionCTX = React.createContext<TransitionT>({
  ...DEFAULT_STATE,
  navigate: () => {},
  navigateBack: () => {},
  navigateLater: () => {},
  unmount: () => {},
  reset: () => {},
  setOffshore: () => {},
})

export const useRouteTransition = (): TransitionT => {
  return useContext(TransitionCTX)
}
