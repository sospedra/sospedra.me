'use client'

import type { KeyboardEvent, PointerEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { SYNODIC_MONTH_MS } from 'service/moon'

const DAY_MS = 86_400_000
const RETURN_MS = 800

// Arrow keys step one day through the cycle
const KEY_NUDGE_MS: Record<string, number> = {
  ArrowDown: -DAY_MS,
  ArrowLeft: -DAY_MS,
  ArrowRight: DAY_MS,
  ArrowUp: DAY_MS,
}

type DragOrigin = {
  x: number
  scrub: number
}

// Horizontal scrub through the lunar cycle: one viewport width sweeps one
// synodic month. Releasing eases the moon back to tonight's real phase.
export const useMoonScrub = (motionAllowed: boolean) => {
  const [scrub, setScrub] = useState(0)
  const scrubRef = useRef(0)
  const dragRef = useRef<DragOrigin | null>(null)
  const rafRef = useRef(0)

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  const moveTo = (value: number) => {
    scrubRef.current = value
    setScrub(value)
  }

  const settle = () => {
    const from = scrubRef.current
    if (from === 0) return
    if (!motionAllowed) {
      moveTo(0)
      return
    }

    const start = performance.now()
    const step = (timestamp: number) => {
      const progress = Math.min((timestamp - start) / RETURN_MS, 1)
      const eased = 1 - (1 - progress) ** 3
      moveTo(from * (1 - eased))
      if (progress < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
  }

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    cancelAnimationFrame(rafRef.current)
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { x: event.clientX, scrub: scrubRef.current }
  }

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const origin = dragRef.current
    if (!origin) return
    const swept = (event.clientX - origin.x) / window.innerWidth
    moveTo(origin.scrub + swept * SYNODIC_MONTH_MS)
  }

  const endDrag = () => {
    if (!dragRef.current) return
    dragRef.current = null
    settle()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const nudge = KEY_NUDGE_MS[event.key]
    if (nudge !== undefined) {
      event.preventDefault()
      cancelAnimationFrame(rafRef.current)
      moveTo(scrubRef.current + nudge)
      return
    }
    if (event.key === 'Escape' || event.key === 'Home') {
      event.preventDefault()
      settle()
    }
  }

  return {
    scrub,
    onBlur: settle,
    onKeyDown,
    onPointerCancel: endDrag,
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
  }
}
