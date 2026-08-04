'use client'

import {
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { cssVars } from 'services/css-vars'
import {
  clampDragOffset,
  clampPanelOffset,
  type DragBounds,
  type DragPoint,
  panelDragBounds,
} from './drag-geometry'
import type { DragPanelProps } from './types'

type DragSession = {
  bounds: DragBounds
  origin: DragPoint
  pointer: DragPoint
  pointerId: number
}

const isInteractiveTarget = (target: EventTarget | null): boolean =>
  target instanceof Element &&
  Boolean(
    target.closest(
      'button, input, select, textarea, a, [role="option"], [data-no-drag]',
    ),
  )

const isDragPointer = (event: PointerEvent<HTMLElement>): boolean =>
  event.isPrimary && (event.pointerType !== 'mouse' || event.button === 0)

const capturePointer = (panel: HTMLElement, pointerId: number): boolean => {
  try {
    panel.setPointerCapture(pointerId)
    return true
  } catch {
    return false
  }
}

const releasePointer = (panel: HTMLElement, pointerId: number) => {
  if (!panel.hasPointerCapture(pointerId)) return
  try {
    panel.releasePointerCapture(pointerId)
  } catch {
    // The browser may end the pointer between the capture check and release.
  }
}

export const useDraggablePanel = (
  label: string,
  layer: number,
  onActivate: () => void,
): DragPanelProps => {
  const [dragging, setDragging] = useState(false)
  const [offset, setOffset] = useState<DragPoint>({ x: 0, y: 0 })
  const [panelNode, setPanelNode] = useState<HTMLElement | null>(null)
  const dragRef = useRef<DragSession | null>(null)
  const panelRef = useRef<HTMLElement | null>(null)

  const clampToStage = useCallback((panel: HTMLElement) => {
    const stage = panel.parentElement
    if (!stage || !panel.isConnected) return

    const panelRect = panel.getBoundingClientRect()
    const stageRect = stage.getBoundingClientRect()
    setOffset((current) => {
      const next = clampPanelOffset(current, panelRect, stageRect)
      return next.x === current.x && next.y === current.y ? current : next
    })
  }, [])

  const bindPanel = useCallback(
    (panel: HTMLElement | null) => {
      const previous = panelRef.current
      if (previous === panel) return

      const drag = dragRef.current
      dragRef.current = null
      setDragging(false)
      if (drag && previous) releasePointer(previous, drag.pointerId)

      panelRef.current = panel
      setPanelNode(panel)
      if (panel) clampToStage(panel)
    },
    [clampToStage],
  )

  useEffect(() => {
    if (!panelNode) return

    let frame = 0
    const scheduleClamp = () => {
      const drag = dragRef.current
      if (drag) {
        dragRef.current = null
        setDragging(false)
        releasePointer(panelNode, drag.pointerId)
      }
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => clampToStage(panelNode))
    }
    const stage = panelNode.parentElement
    const observer = new ResizeObserver(scheduleClamp)
    observer.observe(panelNode)
    if (stage) observer.observe(stage)
    window.addEventListener('resize', scheduleClamp)
    window.visualViewport?.addEventListener('resize', scheduleClamp)
    scheduleClamp()

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', scheduleClamp)
      window.visualViewport?.removeEventListener('resize', scheduleClamp)
    }
  }, [clampToStage, panelNode])

  const recoverStaleDrag = (panel: HTMLElement) => {
    const drag = dragRef.current
    if (!drag || panel.hasPointerCapture(drag.pointerId)) return
    dragRef.current = null
    setDragging(false)
  }

  const startDrag = (event: PointerEvent<HTMLElement>) => {
    const panel = event.currentTarget
    recoverStaleDrag(panel)
    if (dragRef.current || !isDragPointer(event)) return
    onActivate()
    if (isInteractiveTarget(event.target)) return

    const stage = panel.parentElement
    if (!stage) return

    const panelRect = panel.getBoundingClientRect()
    const stageRect = stage.getBoundingClientRect()
    const drag: DragSession = {
      bounds: panelDragBounds(offset, panelRect, stageRect),
      origin: offset,
      pointer: { x: event.clientX, y: event.clientY },
      pointerId: event.pointerId,
    }
    if (!capturePointer(panel, event.pointerId)) return
    event.preventDefault()
    dragRef.current = drag
    setDragging(true)
  }

  const moveDrag = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    setOffset(
      clampDragOffset(
        {
          x: drag.origin.x + event.clientX - drag.pointer.x,
          y: drag.origin.y + event.clientY - drag.pointer.y,
        },
        drag.bounds,
      ),
    )
    event.preventDefault()
  }

  const endDrag = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    setDragging(false)
    releasePointer(event.currentTarget, event.pointerId)
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
    setOffset((current) =>
      clampDragOffset(
        { x: current.x + movement.x, y: current.y + movement.y },
        panelDragBounds(current, panelRect, stageRect),
      ),
    )
    onActivate()
    event.preventDefault()
  }

  return {
    'aria-label': `${label}. Drag with pointer, or use arrow keys while focused.`,
    'aria-roledescription': 'draggable panel',
    'data-dragging': dragging,
    onKeyDown: moveWithKeyboard,
    onLostPointerCapture: endDrag,
    onPointerCancel: endDrag,
    onPointerDown: startDrag,
    onPointerMove: moveDrag,
    onPointerUp: endDrag,
    ref: bindPanel,
    style: cssVars({
      '--drag-x': `${offset.x}px`,
      '--drag-y': `${offset.y}px`,
      '--panel-z': layer,
    }),
    tabIndex: 0,
  }
}
