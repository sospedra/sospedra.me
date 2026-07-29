import { useEffect, useState } from 'react'

/**
 * Every daily game on the site resets at server (UTC) midnight, so the
 * countdown always targets the next UTC day boundary.
 */
const DAY_MS = 86_400_000

export interface DailyCountdown {
  /** HH:MM:SS until the next edition; null until mounted (SSR-safe). */
  label: string | null
  /** The boundary passed while the page stayed open; a reload gets the new game. */
  ready: boolean
  /** Share of the UTC day still ahead, 0..1; null until mounted. */
  remainingFraction: number | null
}

export const nextDailyBoundary = (now: Date): Date =>
  new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  )

const pad = (value: number) => String(value).padStart(2, '0')

export const formatDailyCountdown = (remainingMs: number): string => {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

export const useDailyCountdown = (): DailyCountdown => {
  const [countdown, setCountdown] = useState<DailyCountdown>({
    label: null,
    ready: false,
    remainingFraction: null,
  })

  useEffect(() => {
    const target = nextDailyBoundary(new Date()).getTime()
    const update = () => {
      const remainingMs = target - Date.now()
      setCountdown({
        label: formatDailyCountdown(remainingMs),
        ready: remainingMs <= 0,
        remainingFraction: Math.min(1, Math.max(0, remainingMs / DAY_MS)),
      })
      return remainingMs
    }
    if (update() <= 0) return
    const interval = window.setInterval(() => {
      if (update() <= 0) window.clearInterval(interval)
    }, 1000)
    return () => window.clearInterval(interval)
  }, [])

  return countdown
}
