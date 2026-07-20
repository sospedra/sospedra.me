import type { Route } from 'next'
import { useReducer } from 'react'
import type { TransitionT } from './context'

enum ActionTypes {
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
  url: string
}

export const DEFAULT_STATE: State = {
  offshore: '',
  hasRequestedUnmount: false,
  willUnmount: false,
  url: '',
}

type Action =
  | { type: ActionTypes.NAVIGATE; payload: { url: string } }
  | { type: ActionTypes.UNMOUNT }
  | { type: ActionTypes.RESET }
  | {
      type: ActionTypes.OFFSHORE
      payload: { offshore: State['offshore']; duration?: number }
    }

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case ActionTypes.NAVIGATE:
      return {
        ...state,
        hasRequestedUnmount: true,
        url: action.payload.url,
      }
    case ActionTypes.UNMOUNT:
      return { ...state, willUnmount: true }
    case ActionTypes.RESET:
      return { ...DEFAULT_STATE, offshore: state.offshore }
    case ActionTypes.OFFSHORE:
      return {
        ...state,
        offshore: action.payload.offshore,
        offshoreDuration: action.payload.duration,
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
  const navigate = (url: Route) => {
    // same-route guard: the pathname never changes, so reset instead
    if (url === window.location.pathname) {
      dispatch({ type: ActionTypes.RESET })
      return
    }
    dispatch({ type: ActionTypes.NAVIGATE, payload: { url } })
  }

  return {
    ...state,
    unmount,
    reset,
    navigate,
    setOffshore,
  }
}
