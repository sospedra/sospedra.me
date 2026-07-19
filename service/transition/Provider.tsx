import React, { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { TransitionCTX } from './context'
import { useStateReducer } from './reducer'
import Background from './Background'
import Offshore from './Offshore'
import css from './transition.module.css'

export const Provider: React.FunctionComponent<{
  children: React.ReactNode
}> = ({ children }) => {
  const transition = useStateReducer()
  const pathname = usePathname()
  const router = useRouter()

  // pathname commit replaces the old Router.events routeChangeComplete
  useEffect(() => {
    transition.reset()
  }, [pathname])

  useEffect(() => {
    if (!transition.hasRequestedUnmount || !transition.willUnmount) return
    router.push(transition.url)
  }, [transition.hasRequestedUnmount, transition.willUnmount])

  return (
    <TransitionCTX.Provider value={transition}>
      <div className={css.provider}>{children}</div>
      <Background />
      <Offshore />
    </TransitionCTX.Provider>
  )
}
