'use client'

import cn from 'clsx'
import { usePathname } from 'next/navigation'
import type React from 'react'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { prefersQuietFx } from 'services/theme'
import { getAltitude, getOriginPathname } from './altitude'
import { useRouteTransition } from './context'
import { destinationUrl } from './reducer'

const ENTER_MS = 820
const ENTER_EASING = 'cubic-bezier(0.22, 0.61, 0.36, 1)'
const EXIT_MS = 420
const EXIT_EASING = 'cubic-bezier(0.5, 0, 0.75, 0.6)'
// the provider unmounts the route this long after NAVIGATE, just before
// the exit animation lands, so the exit curve front-loads its motion
export const UNMOUNT_DELAY_MS = EXIT_MS - 60

const shift = (vh: number) => ({ transform: `translate3d(0, ${vh}vh, 0)` })

const CLIMB_ANIMATIONS = {
  enter: {
    keyframes: (climb: number) => [shift(climb > 0 ? -100 : 100), shift(0)],
    options: { duration: ENTER_MS, easing: ENTER_EASING },
  },
  exit: {
    // fill forwards: hold the off-screen pose until the route unmounts
    keyframes: (climb: number) => [shift(0), shift(climb > 0 ? 100 : -100)],
    options: { duration: EXIT_MS, easing: EXIT_EASING, fill: 'forwards' },
  },
} satisfies Record<
  string,
  {
    keyframes: (climb: number) => Keyframe[]
    options: KeyframeAnimationOptions
  }
>

const animateClimb = (
  node: HTMLElement | null,
  climb: number,
  direction: keyof typeof CLIMB_ANIMATIONS,
) => {
  const { keyframes, options } = CLIMB_ANIMATIONS[direction]
  const animation = node?.animate(keyframes(climb), options)
  return () => animation?.cancel()
}

// WAAPI keeps the transform alive only while animating,
// so position: fixed children re-anchor at rest
const StageMain: React.FunctionComponent<{
  className?: string
  children: React.ReactNode
}> = ({ className, children }) => {
  const node = useRef<HTMLElement>(null)
  const pathname = usePathname() || '/'
  const destination = destinationUrl(useRouteTransition())
  const altitude = getAltitude(pathname)

  // layout effect: runs before paint and again on every Activity revival
  useLayoutEffect(() => {
    const origin = getOriginPathname(pathname)
    if (origin === null || prefersQuietFx()) return
    const climb = altitude - getAltitude(origin)
    if (climb === 0) return
    return animateClimb(node.current, climb, 'enter')
  }, [altitude, pathname])

  useEffect(() => {
    if (destination === null || prefersQuietFx()) return
    const climb = getAltitude(destination) - altitude
    if (climb === 0) return
    return animateClimb(node.current, climb, 'exit')
  }, [destination, altitude])

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
