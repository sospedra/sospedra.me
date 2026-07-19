import React, { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { TransitionCTX } from './context'
import { useStateReducer } from './reducer'
import Background from './Background'
import Offshore from './Offshore'
import css from './transition.module.css'

const UNMOUNT_DELAY_MS = 360

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

  // timer, not spring onStart: v10 fires onStart only from idle,
  // so retargeting a running background pan would never unmount
  useEffect(() => {
    if (!transition.hasRequestedUnmount) return
    const timer = setTimeout(transition.unmount, UNMOUNT_DELAY_MS)
    return () => clearTimeout(timer)
  }, [transition.hasRequestedUnmount])

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
