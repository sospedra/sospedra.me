import React, { useEffect } from 'react'
import Router from 'next/router'
import { TransitionCTX } from './context'
import { useStateReducer } from './reducer'
import Background from './Background'
import Offshore from './Offshore'
import css from './transition.module.css'

export const Provider: React.FunctionComponent<{
  children: React.ReactNode
}> = ({ children }) => {
  const transition = useStateReducer()

  useEffect(() => {
    Router.events.on('routeChangeComplete', transition.reset)
    transition.reset()
    return () => {
      Router.events.off('routerChangeComplete', transition.reset)
    }
  }, [])

  useEffect(() => {
    if (transition.hasRequestedUnmount && transition.willUnmount) {
      Router.push(transition.url, transition.as)
    }
  }, [transition.hasRequestedUnmount, transition.willUnmount])

  return (
    <TransitionCTX.Provider value={transition}>
      <div className={css.provider}>{children}</div>
      <Background />
      <Offshore />
    </TransitionCTX.Provider>
  )
}
