import React, { useEffect } from 'react'
import Router from 'next/router'
import { TransitionCTX } from './context'
import { useStateReducer } from './reducer'
import Background from 'components/Background'

export const Provider: React.FunctionComponent<{
  children: React.ReactNode
}> = ({ children }) => {
  const transition = useStateReducer()

  useEffect(() => {
    Router.events.on('routeChangeComplete', transition.reset)
    transition.reset()
  }, [])

  useEffect(() => {
    if (transition.hasRequestedUnmount && transition.willUnmount) {
      Router.push(transition.url, transition.as)
    }
  }, [transition.hasRequestedUnmount, transition.willUnmount])

  return (
    <TransitionCTX.Provider value={transition}>
      <div
        className='fixed top-0 left-0 w-screen h-screen overflow-hidden'
        style={{
          overscrollBehavior: 'contain',
        }}
      >
        {children}
      </div>
      <Background />
    </TransitionCTX.Provider>
  )
}
