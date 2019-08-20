import { useReducer } from 'react'
import Router from 'next/router'
import { TransitionT } from './context'

export const DEFAULT_STATE = {
  hasRequestedUnmount: false,
  willUnmount: false,
  href: '',
}

export enum ActionTypes {
  NAVIGATE = 'NAVIGATE',
  UNMOUNT = 'UNMOUNT',
  RESET = 'RESET',
}

export type State = {
  hasRequestedUnmount: boolean,
  willUnmount: boolean,
  href: string,
}

const reducer: (
  state: State,
  action: { type: keyof typeof ActionTypes, payload?: { [key: string]: any } },
) => State = (state, action) => {
  switch (action.type) {
    case ActionTypes.NAVIGATE: return {
      ...state,
      hasRequestedUnmount: true,
      href: action.payload && action.payload.href,
    }
    case ActionTypes.UNMOUNT: return { ...state, willUnmount: true }
    case ActionTypes.RESET: return DEFAULT_STATE
    default: return state
  }
}

export const useStateReducer = (): TransitionT => {
  const [state, dispatch] = useReducer(reducer, DEFAULT_STATE)
  const unmount = () => dispatch({ type: ActionTypes.UNMOUNT })
  const reset = () => dispatch({ type: ActionTypes.RESET })
  const navigate = (href: string) => {
    Router.prefetch(href)
    dispatch({ type: ActionTypes.NAVIGATE, payload: { href } })
  }

  return {
    ...state,
    unmount,
    reset,
    navigate,
  }
}
