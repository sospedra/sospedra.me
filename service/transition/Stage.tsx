'use client'

import cn from 'clsx'
import { usePathname } from 'next/navigation'
import type React from 'react'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { getAltitude, getOriginPathname } from './altitude'
import { useTransition } from './context'

const ENTER_MS = 820
const ENTER_EASING = 'cubic-bezier(0.22, 0.61, 0.36, 1)'
// the page unmounts 360ms after NAVIGATE, so the exit accelerates away fast
const EXIT_MS = 420
const EXIT_EASING = 'cubic-bezier(0.5, 0, 0.75, 0.6)'

const shift = (vh: number) => ({ transform: `translate3d(0, ${vh}vh, 0)` })

// synchronous read at animation time: no flicker while media queries settle
const isQuiet = () =>
  document.documentElement.classList.contains('fx-quiet') ||
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Camera-tilt stage: climbing routes drop in from the top and fall out the
// bottom, descending routes do the reverse. WAAPI keeps the transform alive
// only while animating, so position: fixed children re-anchor at rest.
const StageMain: React.FunctionComponent<{
  className?: string
  children: React.ReactNode
}> = ({ className, children }) => {
  const node = useRef<HTMLElement>(null)
  const pathname = usePathname() || '/'
  const { url } = useTransition()
  const altitude = getAltitude(pathname)

  // layout effect: runs before paint and again on every Activity revival
  useLayoutEffect(() => {
    const origin = getOriginPathname(pathname)
    if (origin === null || isQuiet()) return
    const climb = altitude - getAltitude(origin)
    if (climb === 0) return

    const animation = node.current?.animate(
      [shift(climb > 0 ? -100 : 100), shift(0)],
      { duration: ENTER_MS, easing: ENTER_EASING },
    )
    return () => animation?.cancel()
  }, [altitude, pathname])

  useEffect(() => {
    if (!url || isQuiet()) return
    const climb = getAltitude(url) - altitude
    if (climb === 0) return

    // fill forwards: hold the off-screen pose until the route unmounts
    const animation = node.current?.animate(
      [shift(0), shift(climb > 0 ? 100 : -100)],
      { duration: EXIT_MS, easing: EXIT_EASING, fill: 'forwards' },
    )
    return () => animation?.cancel()
  }, [url, altitude])

  return (
    <main
      ref={node}
      id='main-content'
      tabIndex={-1}
      className={cn('site-main', className)}
    >
      {children}
    </main>
  )
}

export default StageMain
