import React, { useState, useContext } from 'react'

export const TransitionCTX = React.createContext({})

export const useTransition = () => {
  return useContext(TransitionCTX)
}

export const Provider = ({ children }) => {
  const [transition, setTransition] = useState({ hasRequestedUnmount: false, willUnmount: false })
  const requestUnmount = () => setTransition({ ...transition, hasRequestedUnmount: true })
  const unmount = () => setTransition({ ...transition, willUnmount: true })
  const reset = () => setTransition({ hasRequestedUnmount: false, willUnmount: false })

  return (
    <TransitionCTX.Provider value={{ ...transition, requestUnmount, unmount, reset }}>
      {children}
    </TransitionCTX.Provider>
  )
}