'use client'

import type { KeyboardEvent, PointerEvent, RefObject } from 'react'
import { useEffect, useRef, useState } from 'react'
import {
  clientPointToWorldPoint,
  initialViewport,
  normalizeViewport,
  type PinchSession,
  type PointerPoint,
  pointerDistance,
  pointerMidpoint,
  toCoordinate,
  type Viewport,
  viewBoxFor,
  ZOOM_STEP,
  zoomedViewport,
} from './world-viewport.ts'

const TAP_SLOP_PX = 6
const KEYBOARD_PAN_RATIO = 0.12

/* Synthetic pointers (tests, some pens) have no active pointer to capture. */
const capturePointer = (target: SVGSVGElement, pointerId: number) => {
  try {
    target.setPointerCapture(pointerId)
  } catch {}
}

type DragSession = {
  pointerId: number
  start: PointerPoint
  center: { x: number; y: number }
  moved: number
}

export type PickHandler = (latitude: number, longitude: number) => void

export const useWorldGestures = (
  svgRef: RefObject<SVGSVGElement | null>,
  onPick: PickHandler,
) => {
  const [viewport, setViewport] = useState<Viewport>(initialViewport)
  const rectRef = useRef<DOMRect | null>(null)
  const pointersRef = useRef(new Map<number, PointerPoint>())
  const dragRef = useRef<DragSession | null>(null)
  const pinchRef = useRef<PinchSession | null>(null)

  const measuredRect = () =>
    rectRef.current ?? svgRef.current?.getBoundingClientRect() ?? null

  const focalZoom = (zoom: number, client: PointerPoint) => {
    const rect = measuredRect()
    if (!rect) return
    setViewport((current) =>
      zoomedViewport(zoom, {
        ratioX: (client.clientX - rect.left) / rect.width,
        ratioY: (client.clientY - rect.top) / rect.height,
        world: clientPointToWorldPoint(rect, client, current),
      }),
    )
  }

  const zoomBy = (factor: number) => {
    setViewport((current) =>
      normalizeViewport({ ...current, zoom: current.zoom * factor }),
    )
  }

  const beginPinch = () => {
    dragRef.current = null
    const rect = measuredRect()
    const midpoint = pointerMidpoint(pointersRef.current)
    if (!rect || !midpoint) return
    pinchRef.current = {
      distance: Math.max(1, pointerDistance(pointersRef.current)),
      viewport,
      worldPoint: clientPointToWorldPoint(rect, midpoint, viewport),
    }
  }

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    rectRef.current = event.currentTarget.getBoundingClientRect()
    pointersRef.current.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
    })
    if (pointersRef.current.size === 1) {
      dragRef.current = {
        pointerId: event.pointerId,
        start: { clientX: event.clientX, clientY: event.clientY },
        center: { x: viewport.centerX, y: viewport.centerY },
        moved: 0,
      }
    }
    if (pointersRef.current.size === 2) beginPinch()
    capturePointer(event.currentTarget, event.pointerId)
  }

  const movePinch = () => {
    const pinch = pinchRef.current
    const rect = measuredRect()
    const midpoint = pointerMidpoint(pointersRef.current)
    if (!pinch || !rect || !midpoint) return
    const ratio = pointerDistance(pointersRef.current) / pinch.distance
    setViewport(
      zoomedViewport(pinch.viewport.zoom * ratio, {
        ratioX: (midpoint.clientX - rect.left) / rect.width,
        ratioY: (midpoint.clientY - rect.top) / rect.height,
        world: pinch.worldPoint,
      }),
    )
  }

  const moveDrag = (event: PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current
    const rect = measuredRect()
    if (!drag || !rect || drag.pointerId !== event.pointerId) return
    const deltaX = event.clientX - drag.start.clientX
    const deltaY = event.clientY - drag.start.clientY
    drag.moved = Math.max(drag.moved, Math.hypot(deltaX, deltaY))
    const perPixel = viewBoxFor(viewport).width / rect.width
    setViewport((current) =>
      normalizeViewport({
        zoom: current.zoom,
        centerX: drag.center.x - deltaX * perPixel,
        centerY: drag.center.y - deltaY * perPixel,
      }),
    )
  }

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const pointer = pointersRef.current.get(event.pointerId)
    if (!pointer) return
    pointer.clientX = event.clientX
    pointer.clientY = event.clientY
    if (pointersRef.current.size >= 2) {
      movePinch()
      return
    }
    moveDrag(event)
  }

  const onPointerUp = (event: PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current
    const rect = measuredRect()
    const isTap =
      drag?.pointerId === event.pointerId && drag.moved < TAP_SLOP_PX
    if (isTap && rect && event.type !== 'pointercancel') {
      const world = clientPointToWorldPoint(
        rect,
        { clientX: event.clientX, clientY: event.clientY },
        viewport,
      )
      const { latitude, longitude } = toCoordinate(world)
      onPick(latitude, longitude)
    }
    pointersRef.current.delete(event.pointerId)
    if (drag?.pointerId === event.pointerId) dragRef.current = null
    if (pointersRef.current.size < 2) pinchRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  /* React attaches wheel listeners passively, so ctrl+wheel (a trackpad
     pinch) must bind directly to the node to call preventDefault. */
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return
      event.preventDefault()
      focalZoom(viewport.zoom * Math.exp(-event.deltaY / 220), {
        clientX: event.clientX,
        clientY: event.clientY,
      })
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  })

  const pan = (ratioX: number, ratioY: number) => {
    const viewBox = viewBoxFor(viewport)
    setViewport((current) =>
      normalizeViewport({
        zoom: current.zoom,
        centerX: current.centerX + ratioX * viewBox.width,
        centerY: current.centerY + ratioY * viewBox.height,
      }),
    )
  }

  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    const actions: Record<string, () => void> = {
      '+': () => zoomBy(ZOOM_STEP),
      '=': () => zoomBy(ZOOM_STEP),
      '-': () => zoomBy(1 / ZOOM_STEP),
      ArrowLeft: () => pan(-KEYBOARD_PAN_RATIO, 0),
      ArrowRight: () => pan(KEYBOARD_PAN_RATIO, 0),
      ArrowUp: () => pan(0, -KEYBOARD_PAN_RATIO),
      ArrowDown: () => pan(0, KEYBOARD_PAN_RATIO),
      Home: () => setViewport(initialViewport()),
    }
    const action = actions[event.key]
    if (!action) return
    event.preventDefault()
    action()
  }

  return {
    viewport,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onKeyDown,
    zoomBy,
    reset: () => setViewport(initialViewport()),
  }
}
