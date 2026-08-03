import { clamp } from 'es-toolkit'
import { useEffect, useState } from 'react'

const DAY_MS = 86_400_000

export type DailyCountdown =
  | { status: 'pending' }
  | { status: 'counting'; label: string; remainingFraction: number }
  | { status: 'ready' }

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

const countdownFrom = (remainingMs: number): DailyCountdown => {
  if (remainingMs <= 0) return { status: 'ready' }
  return {
    status: 'counting',
    label: formatDailyCountdown(remainingMs),
    remainingFraction: clamp(remainingMs / DAY_MS, 0, 1),
  }
}

export const useDailyCountdown = (
  boundary: (now: Date) => Date = nextDailyBoundary,
): DailyCountdown => {
  const [countdown, setCountdown] = useState<DailyCountdown>({
    status: 'pending',
  })

  useEffect(() => {
    const target = boundary(new Date()).getTime()
    const update = () => {
      const remainingMs = target - Date.now()
      setCountdown(countdownFrom(remainingMs))
      return remainingMs
    }
    if (update() <= 0) return
    const interval = window.setInterval(() => {
      if (update() <= 0) window.clearInterval(interval)
    }, 1000)
    return () => window.clearInterval(interval)
  }, [boundary])

  return countdown
}
