import type React from 'react'
import { useEffect } from 'react'
import { DESTINATIONS, type Destination } from './destinations'
import {
  blendMomentum,
  clampMomentum,
  clampTheta,
  projectDestination,
  VECTORS,
  viewRotation,
} from './globe-projection'
import {
  cancelHoverFrame,
  type GlobeViewState,
  type PointerPoint,
} from './globe-view-state'

const DRAG_RADIANS_PER_PX = 1 / 140
const MOMENTUM_STALE_MS = 90
const CHIP_HIDE_Z = 0.08
const HIT_RADIUS_FINE = 18
const HIT_RADIUS_COARSE = 24
const TAP_SLOP_FINE = 5
const TAP_SLOP_COARSE = 8

const pinchDistance = (points: Map<number, PointerPoint>): number => {
  const [a, b] = [...points.values()]
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function useGlobePointer(state: GlobeViewState) {
  const {
    applyZoom,
    canvasRectRef,
    canvasRef,
    dragRef,
    dragSampleRef,
    focusTimeRef,
    grabRef,
    hoverFrameRef,
    hoverPointRef,
    hoveredRef,
    onSelectRef,
    phiRef,
    pinchRef,
    pointersRef,
    pressRef,
    refreshHoverRef,
    status,
    thetaRef,
    tiltRef,
    velocityRef,
    zoomRef,
    zoomTargetRef,
  } = state

  const setHoveredSpot = (spot: Destination | null) => {
    if (hoveredRef.current?.code === spot?.code) return
    hoveredRef.current = spot
    const canvas = canvasRef.current
    if (!canvas) return
    if (spot) canvas.dataset.hovered = 'true'
    else delete canvas.dataset.hovered
  }

  const hitTest = (
    clientX: number,
    clientY: number,
    coarse: boolean,
  ): Destination | null => {
    const canvas = canvasRef.current
    if (!canvas || status !== 'ready') return null
    const rect = canvasRectRef.current
    const fallbackRect = rect ? null : canvas.getBoundingClientRect()
    const bounds = rect ?? {
      left: (fallbackRect?.left ?? 0) + window.scrollX,
      top: (fallbackRect?.top ?? 0) + window.scrollY,
      width: fallbackRect?.width ?? 0,
      height: fallbackRect?.height ?? 0,
    }
    const localX = clientX + window.scrollX - bounds.left
    const localY = clientY + window.scrollY - bounds.top
    const hitRadius = coarse ? HIT_RADIUS_COARSE : HIT_RADIUS_FINE
    const view = {
      phi: phiRef.current + dragRef.current,
      theta: thetaRef.current + tiltRef.current,
      zoom: zoomRef.current,
      aspect: bounds.width / bounds.height,
    }
    const rotation = viewRotation(view.phi, view.theta)
    let nearest: Destination | null = null
    let nearestDistance = hitRadius
    let nearestDepth = Number.NEGATIVE_INFINITY

    // runs on the hover rAF cadence; a plain min-scan avoids per-frame allocations
    for (const spot of DESTINATIONS) {
      const vec = VECTORS.get(spot.code)
      if (!vec) continue
      const { x, y, z } = projectDestination(vec, view, rotation)
      if (z < CHIP_HIDE_Z) continue
      const markerX = x * bounds.width
      const markerY = y * bounds.height
      const distance = Math.hypot(markerX - localX, markerY - localY)
      const nearTie = Math.abs(distance - nearestDistance) <= 0.75
      const beatsNearest =
        distance <= hitRadius &&
        (distance <= nearestDistance || (nearTie && z > nearestDepth))
      if (!beatsNearest) continue
      nearest = spot
      nearestDistance = distance
      nearestDepth = z
    }
    return nearest
  }

  const refreshHover = () => {
    const point = hoverPointRef.current
    if (!point || pointersRef.current.size > 0) return
    setHoveredSpot(hitTest(point.x, point.y, false))
  }

  const queueHover = (clientX: number, clientY: number) => {
    hoverPointRef.current = { x: clientX, y: clientY }
    if (hoverFrameRef.current !== null) return
    hoverFrameRef.current = requestAnimationFrame(() => {
      hoverFrameRef.current = null
      refreshHover()
    })
  }

  useEffect(() => {
    refreshHoverRef.current = refreshHover
  })

  const grabAt = (clientX: number, clientY: number) => {
    const pxPerRadian = zoomTargetRef.current / DRAG_RADIANS_PER_PX
    grabRef.current = {
      x: clientX - dragRef.current * pxPerRadian,
      y: clientY - tiltRef.current * pxPerRadian,
    }
  }

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const pointers = pointersRef.current
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    pressRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false,
    }
    velocityRef.current = { phi: 0, theta: 0 }
    dragSampleRef.current = {
      x: event.clientX,
      y: event.clientY,
      time: event.timeStamp,
    }
    setHoveredSpot(null)
    cancelHoverFrame(hoverFrameRef)
    event.currentTarget.setPointerCapture(event.pointerId)
    focusTimeRef.current = 0 // a manual grab wins over the tracked destination
    if (pointers.size === 2) {
      if (pressRef.current) pressRef.current.moved = true
      grabRef.current = null
      dragSampleRef.current = null
      velocityRef.current = { phi: 0, theta: 0 }
      pinchRef.current = {
        distance: pinchDistance(pointers),
        zoom: zoomTargetRef.current,
      }
      return
    }
    grabAt(event.clientX, event.clientY)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = pointersRef.current.get(event.pointerId)
    if (!point) {
      queueHover(event.clientX, event.clientY)
      return
    }
    const press = pressRef.current
    const tapSlop =
      event.pointerType === 'touch' ? TAP_SLOP_COARSE : TAP_SLOP_FINE
    if (
      press?.id === event.pointerId &&
      Math.hypot(event.clientX - press.x, event.clientY - press.y) > tapSlop
    ) {
      press.moved = true
    }
    point.x = event.clientX
    point.y = event.clientY
    const pinch = pinchRef.current
    if (pinch && pointersRef.current.size >= 2) {
      const ratio = pinchDistance(pointersRef.current) / pinch.distance
      applyZoom(pinch.zoom * ratio)
      return
    }
    if (grabRef.current === null) return
    const radiansPerPx = DRAG_RADIANS_PER_PX / zoomTargetRef.current
    const sample = dragSampleRef.current
    if (sample) {
      const elapsed = Math.max(1, event.timeStamp - sample.time)
      const instantPhi = clampMomentum(
        ((event.clientX - sample.x) * radiansPerPx) / elapsed,
      )
      const instantTheta = clampMomentum(
        ((event.clientY - sample.y) * radiansPerPx) / elapsed,
      )
      velocityRef.current = {
        phi: blendMomentum(velocityRef.current.phi, instantPhi),
        theta: blendMomentum(velocityRef.current.theta, instantTheta),
      }
    }
    dragSampleRef.current = {
      x: event.clientX,
      y: event.clientY,
      time: event.timeStamp,
    }
    dragRef.current = (event.clientX - grabRef.current.x) * radiansPerPx
    const rawTilt = (event.clientY - grabRef.current.y) * radiansPerPx
    tiltRef.current = clampTheta(thetaRef.current + rawTilt) - thetaRef.current
  }

  // Fold the drag into phi, otherwise every later focus lands offset.
  // Returns null while other pointers remain down.
  const releasePointer = (
    event: React.PointerEvent<HTMLCanvasElement>,
  ): { tapped: boolean; staleFling: boolean } | null => {
    const pointers = pointersRef.current
    const press = pressRef.current
    const lastDragSample = dragSampleRef.current
    pointers.delete(event.pointerId)
    if (pointers.size < 2) pinchRef.current = null
    if (pointers.size === 1) {
      const [rest] = pointers.values()
      grabAt(rest.x, rest.y)
      velocityRef.current = { phi: 0, theta: 0 }
      dragSampleRef.current = {
        x: rest.x,
        y: rest.y,
        time: event.timeStamp,
      }
      return null
    }
    if (pointers.size > 0) return null
    grabRef.current = null
    dragSampleRef.current = null
    phiRef.current += dragRef.current
    thetaRef.current = clampTheta(thetaRef.current + tiltRef.current)
    dragRef.current = 0
    tiltRef.current = 0
    const tapped = press?.id === event.pointerId && !press.moved
    pressRef.current = null
    const staleFling =
      !lastDragSample ||
      event.timeStamp - lastDragSample.time > MOMENTUM_STALE_MS
    return { tapped, staleFling }
  }

  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const release = releasePointer(event)
    if (!release) return
    if (release.tapped || release.staleFling) {
      velocityRef.current = { phi: 0, theta: 0 }
    }
    if (!release.tapped) return
    const spot = hitTest(
      event.clientX,
      event.clientY,
      event.pointerType === 'touch',
    )
    if (!spot) return
    setHoveredSpot(spot)
    onSelectRef.current(spot)
  }

  const onPointerCancel = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!releasePointer(event)) return
    velocityRef.current = { phi: 0, theta: 0 }
  }

  const onPointerLeave = () => {
    hoverPointRef.current = null
    cancelHoverFrame(hoverFrameRef)
    if (pointersRef.current.size === 0) setHoveredSpot(null)
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onPointerLeave,
  }
}
