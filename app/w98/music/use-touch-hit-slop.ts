'use client'

import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useRef,
} from 'react'

const MIN_TOUCH_TARGET = 44
const TAP_MOVE_TOLERANCE = 10

type Point = {
  x: number
  y: number
}

type TouchSession = {
  origin: Point
  pointerId: number
  target: HTMLButtonElement
}

const isNativeInteractiveTarget = (target: EventTarget | null): boolean =>
  target instanceof Element &&
  Boolean(
    target.closest(
      'button, input, select, textarea, a, [role="option"], [data-no-drag], [data-touch-slop-ignore]',
    ),
  )

const distanceToRect = (point: Point, rect: DOMRect): number => {
  const dx = Math.max(rect.left - point.x, 0, point.x - rect.right)
  const dy = Math.max(rect.top - point.y, 0, point.y - rect.bottom)
  return dx * dx + dy * dy
}

const centerDistance = (point: Point, rect: DOMRect): number => {
  const dx = point.x - (rect.left + rect.right) / 2
  const dy = point.y - (rect.top + rect.bottom) / 2
  return dx * dx + dy * dy
}

const nearestTouchTarget = (
  root: HTMLElement,
  selector: string,
  point: Point,
): HTMLButtonElement | null => {
  const candidates = Array.from(
    root.querySelectorAll<HTMLButtonElement>(selector),
  )
    .filter((button) => {
      if (
        button.disabled ||
        button.ariaDisabled === 'true' ||
        !button.isConnected ||
        button.getClientRects().length === 0
      ) {
        return false
      }
      const style = getComputedStyle(button)
      return style.visibility !== 'hidden' && style.pointerEvents !== 'none'
    })
    .map((button) => {
      const rect = button.getBoundingClientRect()
      const xSlop = Math.max(0, (MIN_TOUCH_TARGET - rect.width) / 2)
      const ySlop = Math.max(0, (MIN_TOUCH_TARGET - rect.height) / 2)
      const withinTarget =
        point.x >= rect.left - xSlop &&
        point.x <= rect.right + xSlop &&
        point.y >= rect.top - ySlop &&
        point.y <= rect.bottom + ySlop

      return {
        button,
        centerDistance: centerDistance(point, rect),
        distance: distanceToRect(point, rect),
        withinTarget,
      }
    })
    .filter((candidate) => candidate.withinTarget)
    .sort(
      (a, b) => a.distance - b.distance || a.centerDistance - b.centerDistance,
    )

  return candidates[0]?.button ?? null
}

const releasePointer = (element: HTMLElement, pointerId: number) => {
  if (!element.hasPointerCapture(pointerId)) return
  try {
    element.releasePointerCapture(pointerId)
  } catch {
    // The browser may release a touch before React receives pointerup.
  }
}

export const useTouchHitSlop = (selector: string) => {
  const sessionRef = useRef<TouchSession | null>(null)

  const begin = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (
        !event.isPrimary ||
        (event.pointerType !== 'touch' && event.pointerType !== 'pen') ||
        isNativeInteractiveTarget(event.target)
      ) {
        return
      }

      const point = { x: event.clientX, y: event.clientY }
      const target = nearestTouchTarget(event.currentTarget, selector, point)
      if (!target) return

      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        return
      }
      sessionRef.current = {
        origin: point,
        pointerId: event.pointerId,
        target,
      }
      event.preventDefault()
      event.stopPropagation()
    },
    [selector],
  )

  const move = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const session = sessionRef.current
    if (!session || session.pointerId !== event.pointerId) return

    if (
      Math.hypot(
        event.clientX - session.origin.x,
        event.clientY - session.origin.y,
      ) > TAP_MOVE_TOLERANCE
    ) {
      sessionRef.current = null
      releasePointer(event.currentTarget, event.pointerId)
    }
    event.preventDefault()
    event.stopPropagation()
  }, [])

  const finish = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const session = sessionRef.current
    if (!session || session.pointerId !== event.pointerId) return

    sessionRef.current = null
    releasePointer(event.currentTarget, event.pointerId)
    event.preventDefault()
    event.stopPropagation()
    session.target.click()
  }, [])

  const cancel = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const session = sessionRef.current
    if (!session || session.pointerId !== event.pointerId) return
    sessionRef.current = null
    releasePointer(event.currentTarget, event.pointerId)
    event.stopPropagation()
  }, [])

  return {
    onLostPointerCaptureCapture: cancel,
    onPointerCancelCapture: cancel,
    onPointerDownCapture: begin,
    onPointerMoveCapture: move,
    onPointerUpCapture: finish,
  }
}
