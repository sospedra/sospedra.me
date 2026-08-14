import { usePathname } from 'next/navigation'
import type React from 'react'
import { useEffect } from 'react'
import { chromeFor } from './index.ts'

// iOS re-samples the bar tints only on route swaps and strip layout moves,
// never on color-only style writes; the strip subscribes to this override
// and shifts 1px so an imperative write still reaches the bars
export type BarOverride = { tint: string } | null

let override: BarOverride = null
const listeners = new Set<() => void>()
const notify = () => {
  for (const listener of listeners) listener()
}

export const subscribeBarOverride = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
export const getBarOverride = () => override
export const getServerBarOverride = () => null

const writeChrome = (
  statusTint: string,
  overscroll: string,
  themeColor: string,
) => {
  document.documentElement.style.backgroundColor = statusTint
  document.body.style.backgroundColor = statusTint
  document.documentElement.style.setProperty('--route-overscroll', overscroll)
  // load-time only on iOS; Android Chrome follows runtime writes
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', themeColor)
}

export const applyChrome = (href: string) => {
  const { statusTint, toolbarTint, overscroll } = chromeFor(href)
  override = null
  writeChrome(statusTint, overscroll, toolbarTint ?? overscroll)
  notify()
}

// the ride's fade to black: both bars join the blackout and stay black
// until the next route commit applies the destination chrome
export const blackoutChrome = () => {
  override = { tint: '#000000' }
  writeChrome('#000000', '#000000', '#000000')
  notify()
}

// schedules the blackout while a ride runs; the ride's unmount or an
// early skip clears the pending timer before it can repaint the bars
export const useRideBlackout = (active: boolean, delayMs: number) => {
  useEffect(() => {
    if (!active) return
    const timer = window.setTimeout(blackoutChrome, Math.round(delayMs))
    return () => window.clearTimeout(timer)
  }, [active, delayMs])
}

// chrome follows the committed pathname, not the transition destination:
// mid-flight tints belong to explicit overrides like blackoutChrome
const ChromeController: React.FunctionComponent = () => {
  const pathname = usePathname() || '/'
  useEffect(() => applyChrome(pathname), [pathname])
  return null
}

export default ChromeController
