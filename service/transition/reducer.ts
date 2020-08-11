import { useReducer, useEffect } from 'react'
import Router from 'next/router'
import { TransitionT } from './context'

export enum ActionTypes {
  NAVIGATE = 'NAVIGATE',
  UNMOUNT = 'UNMOUNT',
  RESET = 'RESET',
  OFFSHORE = 'OFFSHORE',
}

export type State = {
  offshore: '' | 'cloud'
  offshoreDuration?: number
  hasRequestedUnmount: boolean
  willUnmount: boolean
  as?: string
  url: string
}

export const DEFAULT_STATE: State = {
  offshore: '',
  hasRequestedUnmount: false,
  willUnmount: false,
  url: '',
}

const reducer: (
  state: State,
  action: { type: keyof typeof ActionTypes; payload?: { [key: string]: any } },
) => State = (state, action) => {
  switch (action.type) {
    case ActionTypes.NAVIGATE:
      return {
        ...state,
        hasRequestedUnmount: true,
        url: action.payload?.url,
        as: action.payload?.as,
      }
    case ActionTypes.UNMOUNT:
      return { ...state, willUnmount: true }
    case ActionTypes.RESET:
      return { ...DEFAULT_STATE, offshore: state.offshore }
    case ActionTypes.OFFSHORE:
      return {
        ...state,
        offshore: action.payload?.offshore,
        offshoreDuration: action.payload?.duration,
      }
    default:
      return state
  }
}

export const useStateReducer = (): TransitionT => {
  const [state, dispatch] = useReducer(reducer, DEFAULT_STATE)
  const unmount = () => dispatch({ type: ActionTypes.UNMOUNT })
  const reset = () => dispatch({ type: ActionTypes.RESET })
  const setOffshore = (offshore: State['offshore'], duration?: number) =>
    dispatch({ type: ActionTypes.OFFSHORE, payload: { offshore, duration } })
  const navigate = (url: string, as?: string) => {
    dispatch({ type: ActionTypes.NAVIGATE, payload: { url, as } })
  }
  const usePrefetch = (url: string) => {
    useEffect(() => {
      Router.prefetch(url)
    }, [])
  }

  return {
    ...state,
    unmount,
    reset,
    navigate,
    usePrefetch,
    setOffshore,
  }
}
