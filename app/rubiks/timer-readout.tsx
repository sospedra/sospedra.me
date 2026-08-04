import type React from 'react'
import { useEffect, useState } from 'react'
import type { TimerState } from './engine'

const TIMER_TICK_MS = 53

export const formatMs = (ms: number) => {
  const clamped = Math.max(0, ms)
  const minutes = Math.floor(clamped / 60_000)
  const seconds = Math.floor((clamped % 60_000) / 1000)
  const centis = String(Math.floor((clamped % 1000) / 10)).padStart(2, '0')
  if (minutes > 0) {
    return `${minutes}:${String(seconds).padStart(2, '0')}.${centis}`
  }
  return `${seconds}.${centis}`
}

export const TimerReadout: React.FC<{ timer: TimerState }> = ({ timer }) => {
  const startedAt = timer.status === 'running' ? timer.startedAt : null
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (startedAt === null) {
      setElapsed(0)
      return
    }
    const tick = window.setInterval(
      () => setElapsed(Date.now() - startedAt),
      TIMER_TICK_MS,
    )
    return () => window.clearInterval(tick)
  }, [startedAt])

  if (timer.status === 'done') return <>{formatMs(timer.resultMs)}</>
  return <>{formatMs(startedAt === null ? 0 : elapsed)}</>
}
