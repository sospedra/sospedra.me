import { useEffect, useRef, useState } from 'react'

const LOOP_MS = 22 * 60_000
// the reset never yanks an active drag or keypress
const IDLE_GUARD_MS = 8_000
// the state reset hides behind the flash peak
const FLASH_RESET_MS = 700
const FLASH_TOTAL_MS = 1_800

type SupernovaOptions = {
  quiet: boolean
  onLoop: () => void
}

const formatCountdown = (remainingMs: number): string => {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000))
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `T−${minutes}:${seconds}`
}

export function useSupernovaLoop({ quiet, onLoop }: SupernovaOptions) {
  const [remainingMs, setRemainingMs] = useState(LOOP_MS)
  const [loop, setLoop] = useState(1)
  const [flashing, setFlashing] = useState(false)
  const remainingRef = useRef(LOOP_MS)
  const lastTickRef = useRef<number | null>(null)
  const lastInteractionRef = useRef(0)
  const firingRef = useRef(false)
  const quietRef = useRef(quiet)
  const onLoopRef = useRef(onLoop)
  const timeoutsRef = useRef<number[]>([])

  useEffect(() => {
    quietRef.current = quiet
  }, [quiet])

  useEffect(() => {
    onLoopRef.current = onLoop
  }, [onLoop])

  useEffect(() => {
    lastTickRef.current =
      document.visibilityState === 'visible' ? performance.now() : null

    const markInteraction = () => {
      lastInteractionRef.current = performance.now()
    }

    // consumes visible time since the last baseline, hidden time is free
    const rebase = () => {
      const now = performance.now()
      if (lastTickRef.current !== null) {
        remainingRef.current = Math.max(
          0,
          remainingRef.current - (now - lastTickRef.current),
        )
        setRemainingMs(remainingRef.current)
      }
      lastTickRef.current = document.visibilityState === 'visible' ? now : null
    }

    const restart = () => {
      remainingRef.current = LOOP_MS
      setRemainingMs(LOOP_MS)
      setLoop((count) => count + 1)
      firingRef.current = false
    }

    const fire = () => {
      firingRef.current = true
      if (quietRef.current) {
        onLoopRef.current()
        restart()
        return
      }
      setFlashing(true)
      timeoutsRef.current.push(
        window.setTimeout(() => onLoopRef.current(), FLASH_RESET_MS),
        window.setTimeout(() => {
          setFlashing(false)
          restart()
        }, FLASH_TOTAL_MS),
      )
    }

    const tick = () => {
      rebase()
      if (remainingRef.current > 0 || firingRef.current) return
      const idleMs = performance.now() - lastInteractionRef.current
      if (idleMs < IDLE_GUARD_MS) return
      fire()
    }

    const interval = window.setInterval(tick, 1000)
    document.addEventListener('visibilitychange', rebase)
    window.addEventListener('pointerdown', markInteraction, { passive: true })
    window.addEventListener('keydown', markInteraction, { passive: true })
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', rebase)
      window.removeEventListener('pointerdown', markInteraction)
      window.removeEventListener('keydown', markInteraction)
      for (const id of timeoutsRef.current) window.clearTimeout(id)
    }
  }, [])

  return {
    loop,
    flashing,
    phase: 1 - remainingMs / LOOP_MS,
    countdown: formatCountdown(remainingMs),
  }
}
