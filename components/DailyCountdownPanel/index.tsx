'use client'

import type { CSSProperties } from 'react'
import { useDailyCountdown } from 'service/daily-countdown'

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
  const countdown = useDailyCountdown()
  if (!countdown.label) return null
  if (countdown.ready) {
    return (
      <button
        type='button'
        className={classes.ready}
        onClick={() => window.location.reload()}
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
        style={
          { '--remaining': countdown.remainingFraction ?? 0 } as CSSProperties
        }
      >
        <span />
      </span>
    </div>
  )
}

export default DailyCountdownPanel
