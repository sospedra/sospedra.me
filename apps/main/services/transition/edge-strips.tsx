import cn from 'clsx'
import { usePathname } from 'next/navigation'
import type React from 'react'
import { useEffect, useState } from 'react'
import { barsFor } from './altitude'
import { useRouteTransition } from './context'
import css from './edge-strips.module.css'
import { destinationUrl } from './reducer'

// Safari re-samples the bar tints only on strip layout changes, and
// back-navigation samples before the route settles; the delayed 1px nudge
// forces a clean re-sample on the settled page
const NUDGE_DELAY_MS = 900

const EdgeStrips: React.FunctionComponent = () => {
  const pathname = usePathname() || '/'
  const destination = destinationUrl(useRouteTransition()) ?? pathname
  const { top, bottom } = barsFor(destination)
  const [nudgedFor, setNudgedFor] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setNudgedFor(destination), NUDGE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [destination])

  const height = nudgedFor === destination ? 41 : 40
  return (
    <>
      {top && (
        <div
          aria-hidden='true'
          className={cn(css.strip, css.top)}
          style={{ backgroundColor: top, height }}
        />
      )}
      {bottom && (
        <div
          aria-hidden='true'
          className={cn(css.strip, css.bottom)}
          style={{ backgroundColor: bottom, height }}
        />
      )}
    </>
  )
}

export default EdgeStrips
