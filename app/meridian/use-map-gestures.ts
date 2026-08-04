import { clamp } from 'es-toolkit'
import type { KeyboardEvent, PointerEvent } from 'react'
import { useRef, useState } from 'react'
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  roundCoordinate,
  type WorldPoint,
  worldPointToCoordinate,
} from './map-projection'
import {
  clampZoom,
  clientPointToWorldPoint,
  INITIAL_VIEWPORT,
  normalizeViewport,
  type PinchSession,
  type PointerPoint,
  pointerDistance,
  pointerMidpoint,
  type Viewport,
  ZOOM_STEP,
} from './map-viewport'
import type { GeoCoordinate } from './model'

const KEYBOARD_STEP_DEGREES = 2
const KEYBOARD_LARGE_STEP_DEGREES = 10

// 90 is the projection domain edge. Keyboard placement stops at 85 so the marker glyph stays inside the drawn frame.
const KEYBOARD_LATITUDE_LIMIT = 85

export const useMapGestures = ({
  disabled,
  feedback,
  onSelectedCoordinateChange,
  onSubmit,
  selectedCoordinate,
  selectionLocked,
}: {
  disabled: boolean
  feedback: boolean
  onSelectedCoordinateChange: (coordinate: GeoCoordinate) => void
  onSubmit: (coordinate: GeoCoordinate) => void
  selectedCoordinate: GeoCoordinate | null
  selectionLocked: boolean
}) => {
  const [viewport, setViewport] = useState<Viewport>(INITIAL_VIEWPORT)

  const svgRef = useRef<SVGSVGElement>(null)
  // measured once per gesture: a getBoundingClientRect per pointermove forces layout
  const svgRectRef = useRef<DOMRect | null>(null)
  const pointersRef = useRef(new Map<number, PointerPoint>())
  const dragPointerRef = useRef<number | null>(null)
  const pinchRef = useRef<PinchSession | null>(null)

  const selectCoordinate = (
    coordinate: GeoCoordinate,
  ): GeoCoordinate | null => {
    if (selectionLocked) return null
    const next = roundCoordinate(coordinate)
    onSelectedCoordinateChange(next)
    return next
  }

  const selectAtClientPoint = (svg: SVGSVGElement, point: PointerPoint) => {
    const rect = svgRectRef.current ?? svg.getBoundingClientRect()
    return selectCoordinate(
      worldPointToCoordinate(clientPointToWorldPoint(rect, point, viewport)),
    )
  }

  const zoomTo = (
    zoom: number,
    focalPoint?: { client: PointerPoint; world: WorldPoint },
  ) => {
    const nextZoom = clampZoom(zoom)
    if (!focalPoint || !svgRef.current) {
      setViewport((current) =>
        normalizeViewport({ ...current, zoom: nextZoom }),
      )
      return
    }

    const rect = svgRectRef.current ?? svgRef.current.getBoundingClientRect()
    const nextWidth = MAP_WIDTH / nextZoom
    const nextHeight = MAP_HEIGHT / nextZoom
    const xRatio =
      rect.width > 0
        ? (focalPoint.client.clientX - rect.left) / rect.width
        : 0.5
    const yRatio =
      rect.height > 0
        ? (focalPoint.client.clientY - rect.top) / rect.height
        : 0.5

    setViewport(
      normalizeViewport({
        zoom: nextZoom,
        centerX: focalPoint.world.x - xRatio * nextWidth + nextWidth / 2,
        centerY: focalPoint.world.y - yRatio * nextHeight + nextHeight / 2,
      }),
    )
  }

  const releasePointer = (event: PointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(event.pointerId)
    if (dragPointerRef.current === event.pointerId) {
      dragPointerRef.current = null
    }
    if (pointersRef.current.size < 2) pinchRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (disabled || (event.pointerType === 'mouse' && event.button !== 0)) {
      return
    }

    event.preventDefault()
    event.currentTarget.focus({ preventScroll: true })
    event.currentTarget.setPointerCapture(event.pointerId)
    svgRectRef.current = event.currentTarget.getBoundingClientRect()
    pointersRef.current.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
    })

    if (pointersRef.current.size === 1) {
      dragPointerRef.current = feedback ? null : event.pointerId
      return
    }

    if (pointersRef.current.size === 2) {
      dragPointerRef.current = null
      const midpoint = pointerMidpoint(pointersRef.current)
      if (!midpoint) return
      pinchRef.current = {
        distance: Math.max(1, pointerDistance(pointersRef.current)),
        viewport,
        worldPoint: clientPointToWorldPoint(
          svgRectRef.current ?? event.currentTarget.getBoundingClientRect(),
          midpoint,
          viewport,
        ),
      }
    }
  }

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const pointer = pointersRef.current.get(event.pointerId)
    if (!pointer) return
    pointer.clientX = event.clientX
    pointer.clientY = event.clientY

    if (pointersRef.current.size >= 2 && pinchRef.current) {
      event.preventDefault()
      const midpoint = pointerMidpoint(pointersRef.current)
      if (!midpoint) return
      const ratio =
        pointerDistance(pointersRef.current) / pinchRef.current.distance
      zoomTo(pinchRef.current.viewport.zoom * ratio, {
        client: midpoint,
        world: pinchRef.current.worldPoint,
      })
      return
    }

    if (dragPointerRef.current !== event.pointerId) return
    event.preventDefault()
    selectAtClientPoint(event.currentTarget, pointer)
  }

  const handlePointerUp = (event: PointerEvent<SVGSVGElement>) => {
    // WCAG 2.5.2: release only places the pin; the lock button confirms.
    if (dragPointerRef.current === event.pointerId && !selectionLocked) {
      selectAtClientPoint(event.currentTarget, {
        clientX: event.clientX,
        clientY: event.clientY,
      })
    }
    releasePointer(event)
  }

  const moveMarker = (latitudeDelta: number, longitudeDelta: number) => {
    const origin =
      selectedCoordinate ??
      worldPointToCoordinate({ x: viewport.centerX, y: viewport.centerY })
    selectCoordinate({
      latitude: clamp(
        origin.latitude + latitudeDelta,
        -KEYBOARD_LATITUDE_LIMIT,
        KEYBOARD_LATITUDE_LIMIT,
      ),
      longitude: clamp(origin.longitude + longitudeDelta, -180, 180),
    })
  }

  const submitSelection = () => {
    if (!selectedCoordinate || selectionLocked) return
    onSubmit(selectedCoordinate)
  }

  const handleKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (disabled || event.altKey || event.ctrlKey || event.metaKey) return
    const step =
      (event.shiftKey ? KEYBOARD_LARGE_STEP_DEGREES : KEYBOARD_STEP_DEGREES) /
      viewport.zoom

    const markerActions: Record<string, () => void> = {
      ArrowUp: () => moveMarker(step, 0),
      ArrowDown: () => moveMarker(-step, 0),
      ArrowLeft: () => moveMarker(0, -step),
      ArrowRight: () => moveMarker(0, step),
      Enter: submitSelection,
    }
    const viewportActions: Record<string, () => void> = {
      '+': () => zoomTo(viewport.zoom * ZOOM_STEP),
      '=': () => zoomTo(viewport.zoom * ZOOM_STEP),
      '-': () => zoomTo(viewport.zoom / ZOOM_STEP),
      _: () => zoomTo(viewport.zoom / ZOOM_STEP),
      Home: () => setViewport(INITIAL_VIEWPORT),
    }

    const markerAction = markerActions[event.key]
    if (markerAction) {
      if (selectionLocked) return
      event.preventDefault()
      markerAction()
      return
    }

    const viewportAction = viewportActions[event.key]
    if (!viewportAction) return
    event.preventDefault()
    viewportAction()
  }

  return {
    handleKeyDown,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    releasePointer,
    setViewport,
    submitSelection,
    svgRef,
    viewport,
    zoomTo,
  }
}
