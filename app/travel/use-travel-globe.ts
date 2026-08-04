import { useEffect, useRef } from 'react'
import type { Destination, Visitor } from './destinations'
import { createDialControls } from './globe-dials'
import {
  buildArcs,
  buildMarkers,
  GLOBE_PALETTES,
  type TravelGlobeColorway,
} from './globe-markers'
import type { TravelMoonRefs } from './globe-moon-layer'
import { useGlobePointer } from './globe-pointer'
import {
  routeFrameFor,
  TRAVEL_PITCH_MAX,
  TRAVEL_ZOOM_MAX,
  TRAVEL_ZOOM_MIN,
} from './globe-projection'
import { useGlobeRenderer } from './globe-renderer'
import { FOCUS_DURATION_MS, useGlobeViewState } from './globe-view-state'

export type { TravelMoonRefs } from './globe-moon-layer'
export type { TravelGlobeStatus } from './globe-view-state'
export { TRAVEL_PITCH_MAX, TRAVEL_ZOOM_MAX, TRAVEL_ZOOM_MIN }

type TravelGlobeOptions = {
  tracked: Destination
  quiet: boolean
  visitor: Visitor | null
  onSelect: (spot: Destination) => void
  manualZoomMax?: number
  canvasFit?: 'square' | 'viewport'
  visitorMarkerScale?: number
  colorway?: TravelGlobeColorway
  devicePixelRatioCap?: number
  moon?: TravelMoonRefs
}

export function useTravelGlobe({
  tracked,
  quiet,
  visitor,
  onSelect,
  manualZoomMax = TRAVEL_ZOOM_MAX,
  canvasFit = 'square',
  visitorMarkerScale = 1,
  colorway = 'classic',
  devicePixelRatioCap = 2,
  moon,
}: TravelGlobeOptions) {
  const resolvedZoomMax = Math.max(TRAVEL_ZOOM_MIN, manualZoomMax)
  const resolvedPixelRatioCap = Math.max(1, devicePixelRatioCap)
  const palette = GLOBE_PALETTES[colorway]
  const state = useGlobeViewState({
    tracked,
    quiet,
    onSelect,
    moon,
    resolvedZoomMax,
  })
  const {
    focusRef,
    focusTimeRef,
    globeRef,
    hasAppliedTrackedRef,
    onSelectRef,
    publishZoomLevel,
    quietRef,
    velocityRef,
    zoomTargetRef,
  } = state
  const initialMarkersRef = useRef(
    buildMarkers(tracked, visitor, palette, visitorMarkerScale),
  )
  const initialArcsRef = useRef(buildArcs(tracked, palette))

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect, onSelectRef])

  useEffect(() => {
    quietRef.current = quiet
    if (quiet) velocityRef.current = { phi: 0, theta: 0 }
  }, [quiet, quietRef, velocityRef])

  useEffect(() => {
    const frame = routeFrameFor(tracked)
    focusRef.current = frame.focus
    zoomTargetRef.current = frame.zoom
    publishZoomLevel(frame.zoom, true)
    velocityRef.current = { phi: 0, theta: 0 }
    const isInitialHome = !hasAppliedTrackedRef.current && tracked.home
    focusTimeRef.current = isInitialHome ? 0 : FOCUS_DURATION_MS
    hasAppliedTrackedRef.current = true
  }, [
    focusRef,
    focusTimeRef,
    hasAppliedTrackedRef,
    publishZoomLevel,
    tracked,
    velocityRef,
    zoomTargetRef,
  ])

  useGlobeRenderer({
    state,
    palette,
    canvasFit,
    resolvedPixelRatioCap,
    initialMarkersRef,
    initialArcsRef,
  })

  useEffect(() => {
    globeRef.current?.update({
      markers: buildMarkers(tracked, visitor, palette, visitorMarkerScale),
      arcs: buildArcs(tracked, palette),
    })
  }, [globeRef, palette, tracked, visitor, visitorMarkerScale])

  const pointer = useGlobePointer(state)
  const dials = createDialControls(state)

  return {
    status: state.status,
    zoomLevel: state.zoomLevel,
    canvasRef: state.canvasRef,
    orbitControlRef: state.orbitControlRef,
    orbitKnobRef: state.orbitKnobRef,
    pitchControlRef: state.pitchControlRef,
    pitchKnobRef: state.pitchKnobRef,
    compassRef: state.compassRef,
    compassHeadingRef: state.compassHeadingRef,
    compassLatitudeRef: state.compassLatitudeRef,
    onPointerDown: pointer.onPointerDown,
    onPointerMove: pointer.onPointerMove,
    onPointerUp: pointer.onPointerUp,
    onPointerCancel: pointer.onPointerCancel,
    onPointerLeave: pointer.onPointerLeave,
    orbitBy: dials.orbitBy,
    orbitTo: dials.orbitTo,
    pitchBy: dials.pitchBy,
    pitchTo: dials.pitchTo,
    setDialControlActive: dials.setDialControlActive,
    zoomIn: dials.zoomIn,
    zoomOut: dials.zoomOut,
  }
}
