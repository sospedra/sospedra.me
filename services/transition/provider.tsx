import { usePathname, useRouter } from 'next/navigation'
import type React from 'react'
import { useEffect, useRef } from 'react'
import { recordPathname } from './altitude'
import Background from './background'
import { TransitionCTX } from './context'
import Offshore from './offshore'
import { useStateReducer } from './reducer'
import { UNMOUNT_DELAY_MS } from './stage'
import css from './transition.module.css'

export const Provider: React.FunctionComponent<{
  children: React.ReactNode
}> = ({ children }) => {
  const transition = useStateReducer()
  const pathname = usePathname()
  const router = useRouter()
  const lastPathname = useRef(pathname)

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
    if (transition.url === '') return
    router.push(transition.url)
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
