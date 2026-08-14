import { usePathname } from 'next/navigation'
import type React from 'react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  getBarOverride,
  getServerBarOverride,
  subscribeBarOverride,
} from './controller.tsx'
import { chromeFor } from './index.ts'
import css from './toolbar-strip.module.css'

// Safari re-samples the bar tints only on strip layout changes, and
// back-navigation samples before the route settles; the delayed 1px nudge
// forces a clean re-sample on the settled page. iOS ignores a box with zero
// in-viewport pixels (sim-proven 2026-08-13), so the strip keeps a 4px
// sliver inside; toolbarTint must match the page's own bottom edge
const NUDGE_DELAY_MS = 900
const PARKED_OFFSET = -36
const NUDGED_OFFSET = -37

const ToolbarStrip: React.FunctionComponent = () => {
  const pathname = usePathname() || '/'
  const override = useSyncExternalStore(
    subscribeBarOverride,
    getBarOverride,
    getServerBarOverride,
  )
  const { toolbarTint } = chromeFor(pathname)
  const [nudgedFor, setNudgedFor] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setNudgedFor(pathname), NUDGE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [pathname])

  const tint = override ? override.tint : toolbarTint
  if (!tint) return null
  const parked = nudgedFor === pathname ? NUDGED_OFFSET : PARKED_OFFSET
  // the extra 1px move makes the override itself a layout change
  const bottom = override ? parked - 1 : parked
  return (
    <div
      aria-hidden='true'
      className={css.strip}
      style={{ backgroundColor: tint, bottom }}
    />
  )
}

export default ToolbarStrip
