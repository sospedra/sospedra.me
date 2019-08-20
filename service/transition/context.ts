import React, { useContext } from 'react'
import { State } from './reducer'
import { DEFAULT_STATE } from './reducer'

export type TransitionT = State & {
  navigate: (href: string) => void,
  unmount: () => void,
  reset: () => void,
}

export const TransitionCTX = React.createContext({
  ...DEFAULT_STATE,
  navigate: () => {},
  unmount: () => {},
  reset: () => {},
} as TransitionT)

export const useTransition = (): TransitionT => {
  return useContext(TransitionCTX)
}