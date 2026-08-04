import type createGlobe from 'cobe'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Destination } from './destinations'
import type { TravelMoonRefs } from './globe-moon-layer'
import { clampZoom, routeFrameFor, viewLongitude } from './globe-projection'

export const FOCUS_DURATION_MS = 1200
const ZOOM_UI_INTERVAL_MS = 1000 / 30

export type CanvasBounds = {
  height: number
  left: number
  top: number
  width: number
}
export type PointerPoint = { x: number; y: number }
export type DragSample = PointerPoint & { time: number }
export type AngularVelocity = { phi: number; theta: number }
export type TravelGlobeStatus = 'loading' | 'ready' | 'unavailable'

export const cancelHoverFrame = (hoverFrame: { current: number | null }) => {
  if (hoverFrame.current === null) return
  cancelAnimationFrame(hoverFrame.current)
  hoverFrame.current = null
}

export type GlobeViewState = ReturnType<typeof useGlobeViewState>

export function useGlobeViewState({
  tracked,
  quiet,
  onSelect,
  moon,
  resolvedZoomMax,
}: {
  tracked: Destination
  quiet: boolean
  onSelect: (spot: Destination) => void
  moon: TravelMoonRefs | undefined
  resolvedZoomMax: number
}) {
  const initialFrameRef = useRef(routeFrameFor(tracked))
  const [status, setStatus] = useState<TravelGlobeStatus>('loading')
  const [zoomLevel, setZoomLevel] = useState(initialFrameRef.current.zoom)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasRectRef = useRef<CanvasBounds | null>(null)
  const globeRef = useRef<ReturnType<typeof createGlobe> | null>(null)
  const orbitControlRef = useRef<HTMLDivElement>(null)
  const orbitKnobRef = useRef<HTMLSpanElement>(null)
  const pitchControlRef = useRef<HTMLDivElement>(null)
  const pitchKnobRef = useRef<HTMLSpanElement>(null)
  const focusRef = useRef(initialFrameRef.current.focus)
  const phiRef = useRef(focusRef.current[0])
  const thetaRef = useRef(focusRef.current[1])
  const focusTimeRef = useRef(tracked.home ? 0 : FOCUS_DURATION_MS)
  const hasAppliedTrackedRef = useRef(false)
  const quietRef = useRef(quiet)
  const dragRef = useRef(0)
  const tiltRef = useRef(0)
  const grabRef = useRef<PointerPoint | null>(null)
  const dragSampleRef = useRef<DragSample | null>(null)
  const velocityRef = useRef<AngularVelocity>({ phi: 0, theta: 0 })
  const zoomRef = useRef(initialFrameRef.current.zoom)
  const zoomTargetRef = useRef(initialFrameRef.current.zoom)
  const zoomUiValueRef = useRef(initialFrameRef.current.zoom)
  const zoomUiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pointersRef = useRef(new Map<number, PointerPoint>())
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null)
  const pressRef = useRef<{
    id: number
    x: number
    y: number
    moved: boolean
  } | null>(null)
  const hoveredRef = useRef<Destination | null>(null)
  const onSelectRef = useRef(onSelect)
  const hoverFrameRef = useRef<number | null>(null)
  const hoverPointRef = useRef<PointerPoint | null>(null)
  const refreshHoverRef = useRef<(() => void) | null>(null)
  const moonRef = useRef(moon)
  const compassRef = useRef<HTMLSpanElement>(null)
  const compassHeadingRef = useRef<HTMLSpanElement>(null)
  const compassLatitudeRef = useRef<HTMLSpanElement>(null)
  const compassReadoutRef = useRef({ heading: -1, latitude: Number.NaN })
  const dialControlCountRef = useRef(0)
  const dialIdleUntilRef = useRef(0)
  const initialLongitude = viewLongitude(focusRef.current[0])
  const orbitKnobStateRef = useRef({
    angle: -initialLongitude,
    raw: initialLongitude,
  })
  const publishZoomLevel = useCallback((next: number, immediate = false) => {
    zoomUiValueRef.current = next
    if (immediate) {
      if (zoomUiTimerRef.current !== null) {
        clearTimeout(zoomUiTimerRef.current)
        zoomUiTimerRef.current = null
      }
      setZoomLevel(next)
      return
    }
    if (zoomUiTimerRef.current !== null) return
    zoomUiTimerRef.current = setTimeout(() => {
      zoomUiTimerRef.current = null
      setZoomLevel(zoomUiValueRef.current)
    }, ZOOM_UI_INTERVAL_MS)
  }, [])

  useEffect(
    () => () => {
      if (zoomUiTimerRef.current !== null) {
        clearTimeout(zoomUiTimerRef.current)
      }
    },
    [],
  )

  const applyZoom = (value: number) => {
    const nextZoom = clampZoom(value, resolvedZoomMax)
    zoomTargetRef.current = nextZoom
    publishZoomLevel(nextZoom)
  }

  return {
    status,
    setStatus,
    zoomLevel,
    publishZoomLevel,
    applyZoom,
    resolvedZoomMax,
    canvasRef,
    canvasRectRef,
    globeRef,
    orbitControlRef,
    orbitKnobRef,
    pitchControlRef,
    pitchKnobRef,
    focusRef,
    phiRef,
    thetaRef,
    focusTimeRef,
    hasAppliedTrackedRef,
    quietRef,
    dragRef,
    tiltRef,
    grabRef,
    dragSampleRef,
    velocityRef,
    zoomRef,
    zoomTargetRef,
    pointersRef,
    pinchRef,
    pressRef,
    hoveredRef,
    onSelectRef,
    hoverFrameRef,
    hoverPointRef,
    refreshHoverRef,
    moonRef,
    compassRef,
    compassHeadingRef,
    compassLatitudeRef,
    compassReadoutRef,
    dialControlCountRef,
    dialIdleUntilRef,
    orbitKnobStateRef,
  }
}
