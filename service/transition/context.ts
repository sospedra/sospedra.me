import React, { useContext } from 'react'
import { State } from './reducer'
import { DEFAULT_STATE } from './reducer'

export type TransitionT = State & {
  navigate: (url: string) => void
  unmount: () => void
  reset: () => void
  setOffshore: (offshore: State['offshore'], duration?: number) => void
}

export const TransitionCTX = React.createContext({
  ...DEFAULT_STATE,
  navigate: () => {},
  unmount: () => {},
  reset: () => {},
  setOffshore: () => {},
} as TransitionT)

export const useTransition = (): TransitionT => {
  return useContext(TransitionCTX)
}
