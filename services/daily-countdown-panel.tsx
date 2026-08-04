'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { cssVars } from 'services/css-vars'
import { useDailyCountdown } from 'services/daily-countdown'
import { useSystem } from 'services/system'

type DailyCountdownPanelProps = {
  classes: {
    panel: string
    readout: string
    ready: string
    track: string
  }
  labels: {
    countdown: string
    ready: string
  }
}

const DailyCountdownPanel = ({ classes, labels }: DailyCountdownPanelProps) => {
  const router = useRouter()
  const countdown = useDailyCountdown()
  const { notify } = useSystem()
  const previousStatus = useRef(countdown.status)

  // announce the countdown-to-ready swap; a page that loads already
  // ready shows the button in place and needs no announcement
  useEffect(() => {
    if (previousStatus.current === 'counting' && countdown.status === 'ready') {
      notify(labels.ready)
    }
    previousStatus.current = countdown.status
  }, [countdown.status, labels.ready, notify])

  if (countdown.status === 'pending') return null

  if (countdown.status === 'ready') {
    return (
      <button
        type='button'
        className={classes.ready}
        onClick={() => router.refresh()}
      >
        {labels.ready}
      </button>
    )
  }

  return (
    <div className={classes.panel}>
      <p className={classes.readout}>
        <span>{labels.countdown}</span>
        <strong>{countdown.label}</strong>
      </p>
      <span
        className={classes.track}
        aria-hidden='true'
        style={cssVars({ '--remaining': countdown.remainingFraction })}
      >
        <span />
      </span>
    </div>
  )
}

export default DailyCountdownPanel
