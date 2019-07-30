import React, { useReducer, useContext } from 'react'

export const TransitionCTX = React.createContext({})

export const useTransition = () => {
  return useContext(TransitionCTX)
}

const DEFAULT_STATE = { hasRequestedUnmount: false, willUnmount: false }

const reducer = (state, action) => {
  switch (action.type) {
    case 'requestUnmount': return { ...state, hasRequestedUnmount: true }
    case 'unmount': return { ...state, willUnmount: true }
    case 'reset': return DEFAULT_STATE
    default: return state
  }
}

export const Provider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, DEFAULT_STATE)
  const requestUnmount = () => dispatch({ type: 'requestUnmount' })
  const unmount = () => dispatch({ type: 'unmount' })
  const reset = () => dispatch({ type: 'reset' })

  return (
    <TransitionCTX.Provider value={{ ...state, requestUnmount, unmount, reset }}>
      {children}
    </TransitionCTX.Provider>
  )
}
