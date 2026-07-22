import type { Route } from 'next'
import { usePathname, useRouter } from 'next/navigation'
import type React from 'react'
import { useEffect, useRef } from 'react'
import { recordPathname } from './altitude'
import Background from './Background'
import { TransitionCTX } from './context'
import Offshore from './Offshore'
import { useStateReducer } from './reducer'
import css from './transition.module.css'

const UNMOUNT_DELAY_MS = 360

export const Provider: React.FunctionComponent<{
  children: React.ReactNode
}> = ({ children }) => {
  const transition = useStateReducer()
  const pathname = usePathname()
  const router = useRouter()
  const lastPathname = useRef(pathname)

  // pathname commit replaces the old Router.events routeChangeComplete
  useEffect(() => {
    if (lastPathname.current === pathname) return
    lastPathname.current = pathname
    transition.reset()
  }, [pathname, transition.reset])

  // passive effect: entering stages read the origin in their layout
  // effect first, then this records the new pathname for the next hop
  useEffect(() => {
    recordPathname(pathname)
  }, [pathname])

  // timer, not spring onStart: v10 fires onStart only from idle,
  // so retargeting a running background pan would never unmount
  useEffect(() => {
    if (!transition.hasRequestedUnmount) return
    const timer = setTimeout(transition.unmount, UNMOUNT_DELAY_MS)
    return () => clearTimeout(timer)
  }, [transition.hasRequestedUnmount, transition.unmount])

  useEffect(() => {
    if (!transition.hasRequestedUnmount || !transition.willUnmount) return
    // state keeps a plain string, navigate() only accepts typed routes
    router.push(transition.url as Route)
  }, [
    transition.hasRequestedUnmount,
    transition.willUnmount,
    transition.url,
    router.push,
  ])

  return (
    <TransitionCTX.Provider value={transition}>
      <div className={css.provider}>{children}</div>
      <Background />
      <Offshore />
    </TransitionCTX.Provider>
  )
}
