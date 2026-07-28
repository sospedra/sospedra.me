'use client'

import type { GeoCoordinate } from 'lib/geo/model'
import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import css from './GeoGame.module.css'

const MAP_WIDTH = 1000
const MAP_HEIGHT = 500
const MIN_ZOOM = 1
const MAX_ZOOM = 4
const KEYBOARD_STEP_DEGREES = 2
const KEYBOARD_LARGE_STEP_DEGREES = 10
const ANNOUNCEMENT_DELAY_MS = 220

const LONGITUDES = Array.from(
  { length: 11 },
  (_, index) => ((index + 1) * MAP_WIDTH) / 12,
)
const LATITUDES = Array.from(
  { length: 5 },
  (_, index) => ((index + 1) * MAP_HEIGHT) / 6,
)

export type Coordinate = GeoCoordinate

type RegionKey =
  | 'africa'
  | 'antarctic'
  | 'arctic'
  | 'asia'
  | 'europe'
  | 'northAmerica'
  | 'oceania'
  | 'ocean'
  | 'southAmerica'

export type GeoMapLabels = {
  map: string
  instructions: string
  zoomIn: string
  zoomOut: string
  recenter: string
  submit: string
  latitude: string
  longitude: string
  position: string
  zoom: string
  selectedPoint: string
  correctPoint: string
  distance: string
  kilometres: string
  regions: Record<RegionKey, string>
}

export type GeoMapFeedback = {
  answerCoordinate: Coordinate
  distanceKm: number
}

export type GeoMapProps = {
  locale: 'en' | 'es'
  labels: GeoMapLabels
  disabled?: boolean
  selectedCoordinate?: Coordinate | null
  onSelectedCoordinateChange: (coordinate: Coordinate) => void
  onSubmit: (coordinate: Coordinate) => void
  feedback?: GeoMapFeedback
}

type WorldPoint = {
  x: number
  y: number
}

type Viewport = {
  centerX: number
  centerY: number
  zoom: number
}

type PointerPoint = {
  clientX: number
  clientY: number
}

type PinchSession = {
  distance: number
  viewport: Viewport
  worldPoint: WorldPoint
}

const INITIAL_VIEWPORT: Viewport = {
  centerX: MAP_WIDTH / 2,
  centerY: MAP_HEIGHT / 2,
  zoom: 1,
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

const clampZoom = (zoom: number) => clamp(zoom, MIN_ZOOM, MAX_ZOOM)

const viewBoxFor = ({ centerX, centerY, zoom }: Viewport) => {
  const width = MAP_WIDTH / zoom
  const height = MAP_HEIGHT / zoom
  const x = clamp(centerX - width / 2, 0, MAP_WIDTH - width)
  const y = clamp(centerY - height / 2, 0, MAP_HEIGHT - height)

  return { height, width, x, y }
}

const normalizeViewport = (viewport: Viewport): Viewport => {
  const zoom = clampZoom(viewport.zoom)
  const width = MAP_WIDTH / zoom
  const height = MAP_HEIGHT / zoom

  return {
    zoom,
    centerX: clamp(viewport.centerX, width / 2, MAP_WIDTH - width / 2),
    centerY: clamp(viewport.centerY, height / 2, MAP_HEIGHT - height / 2),
  }
}

const coordinateToWorldPoint = ({
  latitude,
  longitude,
}: Coordinate): WorldPoint => ({
  x: ((clamp(longitude, -180, 180) + 180) / 360) * MAP_WIDTH,
  y: ((90 - clamp(latitude, -90, 90)) / 180) * MAP_HEIGHT,
})

const worldPointToCoordinate = ({ x, y }: WorldPoint): Coordinate => ({
  latitude: clamp(90 - (y / MAP_HEIGHT) * 180, -90, 90),
  longitude: clamp((x / MAP_WIDTH) * 360 - 180, -180, 180),
})

const roundCoordinate = (coordinate: Coordinate): Coordinate => ({
  latitude: Math.round(coordinate.latitude * 100_000) / 100_000,
  longitude: Math.round(coordinate.longitude * 100_000) / 100_000,
})

const pointerDistance = (points: Map<number, PointerPoint>) => {
  const [first, second] = [...points.values()]
  if (!first || !second) return 0
  return Math.hypot(
    second.clientX - first.clientX,
    second.clientY - first.clientY,
  )
}

const pointerMidpoint = (
  points: Map<number, PointerPoint>,
): PointerPoint | null => {
  const [first, second] = [...points.values()]
  if (!first || !second) return null
  return {
    clientX: (first.clientX + second.clientX) / 2,
    clientY: (first.clientY + second.clientY) / 2,
  }
}

const clientPointToWorldPoint = (
  svg: SVGSVGElement,
  point: PointerPoint,
  viewport: Viewport,
): WorldPoint => {
  const rect = svg.getBoundingClientRect()
  const viewBox = viewBoxFor(viewport)
  const xRatio = rect.width > 0 ? (point.clientX - rect.left) / rect.width : 0.5
  const yRatio =
    rect.height > 0 ? (point.clientY - rect.top) / rect.height : 0.5

  return {
    x: clamp(viewBox.x + xRatio * viewBox.width, 0, MAP_WIDTH),
    y: clamp(viewBox.y + yRatio * viewBox.height, 0, MAP_HEIGHT),
  }
}

const broadRegion = ({ latitude, longitude }: Coordinate): RegionKey => {
  if (latitude >= 66) return 'arctic'
  if (latitude <= -60) return 'antarctic'
  if (latitude >= 7 && longitude >= -170 && longitude <= -50)
    return 'northAmerica'
  if (latitude < 15 && latitude > -60 && longitude >= -90 && longitude <= -30)
    return 'southAmerica'
  if (latitude >= 34 && longitude >= -25 && longitude <= 55) return 'europe'
  if (latitude > -40 && latitude < 38 && longitude >= -20 && longitude <= 55)
    return 'africa'
  if (latitude >= 0 && longitude >= 25 && longitude <= 180) return 'asia'
  if (latitude < 0 && longitude >= 105 && longitude <= 180) return 'oceania'
  return 'ocean'
}

const connectionSegments = (from: WorldPoint, to: WorldPoint) => {
  if (Math.abs(from.x - to.x) <= MAP_WIDTH / 2) {
    return [{ from, to }]
  }

  return from.x < to.x
    ? [
        { from, to: { ...to, x: to.x - MAP_WIDTH } },
        { from: { ...from, x: from.x + MAP_WIDTH }, to },
      ]
    : [
        { from, to: { ...to, x: to.x + MAP_WIDTH } },
        { from: { ...from, x: from.x - MAP_WIDTH }, to },
      ]
}

export default function GeoMap({
  locale,
  labels,
  disabled = false,
  selectedCoordinate,
  onSelectedCoordinateChange,
  onSubmit,
  feedback,
}: GeoMapProps) {
  const [uncontrolledCoordinate, setUncontrolledCoordinate] =
    useState<Coordinate | null>(selectedCoordinate ?? null)
  const [viewport, setViewport] = useState<Viewport>(INITIAL_VIEWPORT)
  const [announcement, setAnnouncement] = useState('')
  const svgRef = useRef<SVGSVGElement>(null)
  const pointersRef = useRef(new Map<number, PointerPoint>())
  const dragPointerRef = useRef<number | null>(null)
  const pinchRef = useRef<PinchSession | null>(null)
  const descriptionId = useId()
  const liveRegionId = useId()

  const selected =
    selectedCoordinate === undefined
      ? uncontrolledCoordinate
      : selectedCoordinate
  const selectionLocked = disabled || Boolean(feedback)
  const viewBox = viewBoxFor(viewport)
  const selectedPoint = selected ? coordinateToWorldPoint(selected) : null
  const answerPoint = feedback
    ? coordinateToWorldPoint(feedback.answerCoordinate)
    : null
  const segments =
    selectedPoint && answerPoint
      ? connectionSegments(selectedPoint, answerPoint)
      : []

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-US', {
        maximumFractionDigits: 1,
        minimumFractionDigits: 1,
      }),
    [locale],
  )
  const distanceFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-US', {
        maximumFractionDigits: 0,
      }),
    [locale],
  )

  const describeCoordinate = (coordinate: Coordinate) => {
    const latitudeDirection = coordinate.latitude < 0 ? 'S' : 'N'
    const longitudeDirection =
      coordinate.longitude < 0 ? (locale === 'es' ? 'O' : 'W') : 'E'
    return `${labels.latitude} ${numberFormatter.format(
      Math.abs(coordinate.latitude),
    )}° ${latitudeDirection}, ${labels.longitude} ${numberFormatter.format(
      Math.abs(coordinate.longitude),
    )}° ${longitudeDirection}`
  }

  const positionText = selected
    ? `${labels.position}: ${describeCoordinate(selected)}. ${
        labels.regions[broadRegion(selected)]
      }. ${labels.zoom} ${numberFormatter.format(viewport.zoom)}×.`
    : labels.instructions
  const announcementText =
    feedback && selected
      ? `${labels.selectedPoint}: ${describeCoordinate(selected)}. ${
          labels.correctPoint
        }: ${describeCoordinate(feedback.answerCoordinate)}. ${
          labels.distance
        }: ${distanceFormatter.format(feedback.distanceKm)} ${
          labels.kilometres
        }.`
      : positionText

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setAnnouncement(announcementText),
      ANNOUNCEMENT_DELAY_MS,
    )
    return () => window.clearTimeout(timeout)
  }, [announcementText])

  const selectCoordinate = (coordinate: Coordinate): Coordinate | null => {
    if (selectionLocked) return null
    const next = roundCoordinate(coordinate)
    if (selectedCoordinate === undefined) setUncontrolledCoordinate(next)
    onSelectedCoordinateChange(next)
    return next
  }

  const selectAtClientPoint = (svg: SVGSVGElement, point: PointerPoint) => {
    return selectCoordinate(
      worldPointToCoordinate(clientPointToWorldPoint(svg, point, viewport)),
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

    const rect = svgRef.current.getBoundingClientRect()
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
          event.currentTarget,
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
    const coordinate =
      dragPointerRef.current === event.pointerId && !selectionLocked
        ? selectAtClientPoint(event.currentTarget, {
            clientX: event.clientX,
            clientY: event.clientY,
          })
        : null
    releasePointer(event)
    if (coordinate) onSubmit(coordinate)
  }

  const moveMarker = (latitudeDelta: number, longitudeDelta: number) => {
    const origin =
      selected ??
      worldPointToCoordinate({ x: viewport.centerX, y: viewport.centerY })
    selectCoordinate({
      latitude: clamp(origin.latitude + latitudeDelta, -85, 85),
      longitude: clamp(origin.longitude + longitudeDelta, -180, 180),
    })
  }

  const submitSelection = () => {
    if (!selected || selectionLocked) return
    onSubmit(selected)
  }

  const handleKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (disabled || event.altKey || event.ctrlKey || event.metaKey) return
    const step =
      (event.shiftKey ? KEYBOARD_LARGE_STEP_DEGREES : KEYBOARD_STEP_DEGREES) /
      viewport.zoom

    if (event.key === 'ArrowUp') {
      if (selectionLocked) return
      event.preventDefault()
      moveMarker(step, 0)
    } else if (event.key === 'ArrowDown') {
      if (selectionLocked) return
      event.preventDefault()
      moveMarker(-step, 0)
    } else if (event.key === 'ArrowLeft') {
      if (selectionLocked) return
      event.preventDefault()
      moveMarker(0, -step)
    } else if (event.key === 'ArrowRight') {
      if (selectionLocked) return
      event.preventDefault()
      moveMarker(0, step)
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault()
      zoomTo(viewport.zoom * 1.25)
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault()
      zoomTo(viewport.zoom / 1.25)
    } else if (event.key === 'Home') {
      event.preventDefault()
      setViewport(INITIAL_VIEWPORT)
    } else if (event.key === 'Enter') {
      if (selectionLocked) return
      event.preventDefault()
      submitSelection()
    }
  }

  return (
    <section
      className={css.mapPanel}
      data-disabled={disabled}
      data-selection-locked={selectionLocked}
      data-feedback={Boolean(feedback)}
    >
      <p id={descriptionId} className={css.mapInstructions}>
        {labels.instructions}
      </p>

      <div className={css.mapStage}>
        <svg
          ref={svgRef}
          className={css.mapCanvas}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
          preserveAspectRatio='none'
          role='application'
          // biome-ignore lint/a11y/noNoninteractiveTabindex: the map is a single keyboard-operated application control
          tabIndex={0}
          aria-label={labels.map}
          aria-describedby={`${descriptionId} ${liveRegionId}`}
          aria-disabled={disabled}
          aria-keyshortcuts='ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight + - Home Enter'
          data-has-marker={Boolean(selected)}
          onKeyDown={handleKeyDown}
          onPointerCancel={releasePointer}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ touchAction: 'none' }}
        >
          <title>{labels.map}</title>
          <desc>{labels.instructions}</desc>

          <rect
            className={css.mapOcean}
            width={MAP_WIDTH}
            height={MAP_HEIGHT}
          />
          <image
            className={css.mapLand}
            href='/games/geo/assets/map/world-map.svg'
            width={MAP_WIDTH}
            height={MAP_HEIGHT}
            preserveAspectRatio='none'
          />

          <g className={css.mapGrid}>
            {LONGITUDES.map((x) => (
              <line
                key={`longitude-${x}`}
                x1={x}
                y1={0}
                x2={x}
                y2={MAP_HEIGHT}
              />
            ))}
            {LATITUDES.map((y) => (
              <line key={`latitude-${y}`} x1={0} y1={y} x2={MAP_WIDTH} y2={y} />
            ))}
            <line
              className={css.mapEquator}
              x1={0}
              y1={MAP_HEIGHT / 2}
              x2={MAP_WIDTH}
              y2={MAP_HEIGHT / 2}
            />
          </g>

          {segments.length > 0 && (
            <g className={css.mapConnection}>
              {segments.map((segment) => (
                <line
                  key={`${segment.from.x}:${segment.from.y}-${segment.to.x}:${segment.to.y}`}
                  x1={segment.from.x}
                  y1={segment.from.y}
                  x2={segment.to.x}
                  y2={segment.to.y}
                  vectorEffect='non-scaling-stroke'
                />
              ))}
            </g>
          )}

          {selectedPoint && (
            <g
              className={css.mapSelectedMarker}
              transform={`translate(${selectedPoint.x} ${selectedPoint.y}) scale(${
                1 / viewport.zoom
              })`}
            >
              <circle className={css.mapMarkerPulse} r={16} />
              <circle className={css.mapMarkerRing} r={9} />
              <circle className={css.mapMarkerCore} r={3.5} />
            </g>
          )}

          {answerPoint && (
            <g
              className={css.mapAnswerMarker}
              transform={`translate(${answerPoint.x} ${answerPoint.y}) scale(${
                1 / viewport.zoom
              })`}
            >
              <circle r={10} />
              <path d='M -15 0 H 15 M 0 -15 V 15' />
              <circle className={css.mapAnswerCore} r={3} />
            </g>
          )}
        </svg>

        <fieldset className={css.mapZoomControls}>
          <legend className={css.mapControlLegend}>{labels.zoom}</legend>
          <button
            type='button'
            className={css.mapControlButton}
            disabled={disabled || viewport.zoom <= MIN_ZOOM}
            aria-label={labels.zoomOut}
            onClick={() => zoomTo(viewport.zoom / 1.25)}
          >
            <span aria-hidden='true'>−</span>
            <span>{labels.zoomOut}</span>
          </button>
          <output className={css.mapZoomReadout} aria-label={labels.zoom}>
            {numberFormatter.format(viewport.zoom)}×
          </output>
          <button
            type='button'
            className={css.mapControlButton}
            disabled={disabled || viewport.zoom >= MAX_ZOOM}
            aria-label={labels.zoomIn}
            onClick={() => zoomTo(viewport.zoom * 1.25)}
          >
            <span aria-hidden='true'>+</span>
            <span>{labels.zoomIn}</span>
          </button>
          <button
            type='button'
            className={css.mapRecenterButton}
            disabled={disabled}
            onClick={() => setViewport(INITIAL_VIEWPORT)}
          >
            <span aria-hidden='true'>⌂</span>
            <span>{labels.recenter}</span>
          </button>
        </fieldset>
      </div>

      <div className={css.mapStatusBar}>
        <p className={css.mapPosition}>{positionText}</p>
        {feedback && (
          <p className={css.mapFeedback} role='status'>
            <span>{labels.distance}</span>
            <strong>
              {distanceFormatter.format(feedback.distanceKm)}{' '}
              {labels.kilometres}
            </strong>
          </p>
        )}
        <div className={css.mapLegend} aria-hidden='true'>
          <span data-marker='selected'>{labels.selectedPoint}</span>
          {feedback && <span data-marker='answer'>{labels.correctPoint}</span>}
        </div>
      </div>

      <p
        id={liveRegionId}
        className={css.mapLiveRegion}
        aria-live='polite'
        aria-atomic='true'
      >
        {announcement}
      </p>
    </section>
  )
}
