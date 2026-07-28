'use client'

import { clamp } from 'es-toolkit'
import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useRef,
  useState,
} from 'react'
import type { DragPanelProps } from './types'

type Point = { x: number; y: number }

type DragSession = {
  bounds: {
    maxX: number
    maxY: number
    minX: number
    minY: number
  }
  origin: Point
  pointer: Point
  pointerId: number
}

const isInteractiveTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  Boolean(
    target.closest(
      'button, input, select, textarea, a, [role="option"], [data-no-drag]',
    ),
  )

export const useDraggablePanel = (
  label: string,
  layer: number,
  onActivate: () => void,
): DragPanelProps => {
  const [dragging, setDragging] = useState(false)
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 })
  const dragRef = useRef<DragSession | null>(null)

  const startDrag = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return
    onActivate()
    if (isInteractiveTarget(event.target)) return

    const panel = event.currentTarget
    const stage = panel.parentElement
    if (!stage) return

    const panelRect = panel.getBoundingClientRect()
    const stageRect = stage.getBoundingClientRect()
    dragRef.current = {
      bounds: {
        maxX: offset.x + stageRect.right - panelRect.right,
        maxY: offset.y + stageRect.bottom - panelRect.bottom,
        minX: offset.x + stageRect.left - panelRect.left,
        minY: offset.y + stageRect.top - panelRect.top,
      },
      origin: offset,
      pointer: { x: event.clientX, y: event.clientY },
      pointerId: event.pointerId,
    }
    panel.setPointerCapture(event.pointerId)
    setDragging(true)
    event.preventDefault()
  }

  const moveDrag = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    setOffset({
      x: clamp(
        drag.origin.x + event.clientX - drag.pointer.x,
        drag.bounds.minX,
        drag.bounds.maxX,
      ),
      y: clamp(
        drag.origin.y + event.clientY - drag.pointer.y,
        drag.bounds.minY,
        drag.bounds.maxY,
      ),
    })
  }

  const endDrag = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragRef.current = null
    setDragging(false)
  }

  const moveWithKeyboard = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return
    if (event.key === 'Home') {
      setOffset({ x: 0, y: 0 })
      onActivate()
      event.preventDefault()
      return
    }

    const amount = event.shiftKey ? 25 : 10
    const movement = {
      ArrowDown: { x: 0, y: amount },
      ArrowLeft: { x: -amount, y: 0 },
      ArrowRight: { x: amount, y: 0 },
      ArrowUp: { x: 0, y: -amount },
    }[event.key]
    if (!movement) return

    const panelRect = event.currentTarget.getBoundingClientRect()
    const stageRect = event.currentTarget.parentElement?.getBoundingClientRect()
    if (!stageRect) return
    setOffset((current) => ({
      x:
        current.x +
        clamp(
          movement.x,
          stageRect.left - panelRect.left,
          stageRect.right - panelRect.right,
        ),
      y:
        current.y +
        clamp(
          movement.y,
          stageRect.top - panelRect.top,
          stageRect.bottom - panelRect.bottom,
        ),
    }))
    onActivate()
    event.preventDefault()
  }

  return {
    'aria-label': `${label}. Drag with pointer, or use arrow keys while focused.`,
    'aria-roledescription': 'draggable panel',
    'data-dragging': dragging,
    onKeyDown: moveWithKeyboard,
    onPointerCancel: endDrag,
    onPointerDown: startDrag,
    onPointerMove: moveDrag,
    onPointerUp: endDrag,
    style: {
      '--drag-x': `${offset.x}px`,
      '--drag-y': `${offset.y}px`,
      '--panel-z': layer,
    } as CSSProperties,
    tabIndex: 0,
  }
}
