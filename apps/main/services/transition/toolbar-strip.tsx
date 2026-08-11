import { usePathname } from 'next/navigation'
import type React from 'react'
import { useEffect, useState } from 'react'
import { chromeFor } from './altitude'
import { useRouteTransition } from './context'
import { destinationUrl } from './reducer'
import css from './toolbar-strip.module.css'

// Safari re-samples the bar tints only on strip layout changes, and
// back-navigation samples before the route settles; the delayed 1px nudge
// forces a clean re-sample on the settled page
const NUDGE_DELAY_MS = 900
const PARKED_OFFSET = -40
const NUDGED_OFFSET = -41

const ToolbarStrip: React.FunctionComponent = () => {
  const pathname = usePathname() || '/'
  const destination = destinationUrl(useRouteTransition()) ?? pathname
  const { toolbarTint } = chromeFor(destination)
  const [nudgedFor, setNudgedFor] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setNudgedFor(destination), NUDGE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [destination])

  if (!toolbarTint) return null
  const bottom = nudgedFor === destination ? NUDGED_OFFSET : PARKED_OFFSET
  return (
    <div
      aria-hidden='true'
      className={css.strip}
      style={{ backgroundColor: toolbarTint, bottom }}
    />
  )
}

export default ToolbarStrip
