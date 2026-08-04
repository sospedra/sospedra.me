'use client'

import { clamp } from 'es-toolkit'
import { map, pipe } from 'es-toolkit/fp'
import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  EQUAL_EARTH_ASPECT,
  equalEarthForward,
  equalEarthInverse,
} from './equal-earth'
import css from './geo-game.module.css'
import type { GeoCoordinate } from './model'

const MAP_WIDTH = 1000
const MAP_HEIGHT = MAP_WIDTH / EQUAL_EARTH_ASPECT
const MIN_ZOOM = 1
const MAX_ZOOM = 4
const ZOOM_STEP = 1.25
const KEYBOARD_STEP_DEGREES = 2
const KEYBOARD_LARGE_STEP_DEGREES = 10
const ANNOUNCEMENT_DELAY_MS = 220
const GRATICULE_STEP_DEGREES = 5
const PROJECTION_LATITUDE_LIMIT = 90
// 90 is the projection domain edge. Keyboard placement stops at 85 so the marker glyph stays inside the drawn frame.
const KEYBOARD_LATITUDE_LIMIT = 85

const projectToMap = (longitude: number, latitude: number) => {
  const point = equalEarthForward(longitude, latitude)
  return { x: point.x * MAP_WIDTH, y: point.y * MAP_HEIGHT }
}

const graticulePath = (points: readonly GeoCoordinate[]): string =>
  points
    .map(({ longitude, latitude }, index) => {
      const point = projectToMap(longitude, latitude)
      return `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`
    })
    .join('')

const degreeRange = (from: number, to: number): number[] =>
  Array.from(
    { length: Math.floor((to - from) / GRATICULE_STEP_DEGREES) + 1 },
    (_, index) => from + index * GRATICULE_STEP_DEGREES,
  )

const meridianPath = (longitude: number): string =>
  pipe(
    degreeRange(-90, 90),
    map((latitude) => ({ latitude, longitude })),
    graticulePath,
  )

const parallelPath = (latitude: number): string =>
  pipe(
    degreeRange(-180, 180),
    map((longitude) => ({ latitude, longitude })),
    graticulePath,
  )

const GRATICULE_MERIDIANS = [
  -150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150,
].map((longitude) => ({ id: longitude, d: meridianPath(longitude) }))
const GRATICULE_PARALLELS = [-60, -30, 30, 60].map((latitude) => ({
  id: latitude,
  d: parallelPath(latitude),
}))
const EQUATOR_PATH = parallelPath(0)
const WORLD_OUTLINE_PATH = `${graticulePath([
  ...degreeRange(-90, 90).map((latitude) => ({ latitude, longitude: -180 })),
  ...degreeRange(-90, 90)
    .toReversed()
    .map((latitude) => ({ latitude, longitude: 180 })),
])}Z`

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
  projection: string
  zoom: string
  selectedPoint: string
  correctPoint: string
  distance: string
  kilometres: string
  regions: Record<RegionKey, string>
}

export type GeoMapFeedback = {
  answerCoordinate: GeoCoordinate
  distanceKm: number
}

export type GeoMapProps = {
  locale: 'en' | 'es'
  labels: GeoMapLabels
  prompt?: string
  disabled?: boolean
  selectedCoordinate: GeoCoordinate | null
  onSelectedCoordinateChange: (coordinate: GeoCoordinate) => void
  onSubmit: (coordinate: GeoCoordinate) => void
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
}: GeoCoordinate): WorldPoint =>
  projectToMap(
    clamp(longitude, -180, 180),
    clamp(latitude, -PROJECTION_LATITUDE_LIMIT, PROJECTION_LATITUDE_LIMIT),
  )

const worldPointToCoordinate = ({ x, y }: WorldPoint): GeoCoordinate => {
  const coordinate = equalEarthInverse({
    x: clamp(x / MAP_WIDTH, 0, 1),
    y: clamp(y / MAP_HEIGHT, 0, 1),
  })
  return {
    latitude: clamp(
      coordinate.latitude,
      -PROJECTION_LATITUDE_LIMIT,
      PROJECTION_LATITUDE_LIMIT,
    ),
    longitude: clamp(coordinate.longitude, -180, 180),
  }
}

const roundCoordinate = (coordinate: GeoCoordinate): GeoCoordinate => ({
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
  rect: DOMRect,
  point: PointerPoint,
  viewport: Viewport,
): WorldPoint => {
  const viewBox = viewBoxFor(viewport)
  const xRatio = rect.width > 0 ? (point.clientX - rect.left) / rect.width : 0.5
  const yRatio =
    rect.height > 0 ? (point.clientY - rect.top) / rect.height : 0.5

  return {
    x: clamp(viewBox.x + xRatio * viewBox.width, 0, MAP_WIDTH),
    y: clamp(viewBox.y + yRatio * viewBox.height, 0, MAP_HEIGHT),
  }
}

const REGION_BOUNDS: {
  region: RegionKey
  contains: (latitude: number, longitude: number) => boolean
}[] = [
  { region: 'arctic', contains: (latitude) => latitude >= 66 },
  { region: 'antarctic', contains: (latitude) => latitude <= -60 },
  {
    region: 'northAmerica',
    contains: (latitude, longitude) =>
      latitude >= 7 && longitude >= -170 && longitude <= -50,
  },
  {
    region: 'southAmerica',
    contains: (latitude, longitude) =>
      latitude < 15 && latitude > -60 && longitude >= -90 && longitude <= -30,
  },
  {
    region: 'europe',
    contains: (latitude, longitude) =>
      latitude >= 34 && longitude >= -25 && longitude <= 55,
  },
  {
    region: 'africa',
    contains: (latitude, longitude) =>
      latitude > -40 && latitude < 38 && longitude >= -20 && longitude <= 55,
  },
  {
    region: 'asia',
    contains: (latitude, longitude) =>
      latitude >= 0 && longitude >= 25 && longitude <= 180,
  },
  {
    region: 'oceania',
    contains: (latitude, longitude) =>
      latitude < 0 && longitude >= 105 && longitude <= 180,
  },
]

const broadRegion = ({ latitude, longitude }: GeoCoordinate): RegionKey =>
  REGION_BOUNDS.find((bounds) => bounds.contains(latitude, longitude))
    ?.region ?? 'ocean'

const wrappedWorldPoint = (
  coordinate: GeoCoordinate,
  direction: 1 | -1,
): WorldPoint =>
  projectToMap(coordinate.longitude + 360 * direction, coordinate.latitude)

const connectionSegments = (selected: GeoCoordinate, answer: GeoCoordinate) => {
  const from = coordinateToWorldPoint(selected)
  const to = coordinateToWorldPoint(answer)
  if (Math.abs(selected.longitude - answer.longitude) <= 180) {
    return [{ from, to }]
  }

  return selected.longitude < answer.longitude
    ? [
        { from, to: wrappedWorldPoint(answer, -1) },
        { from: wrappedWorldPoint(selected, 1), to },
      ]
    : [
        { from, to: wrappedWorldPoint(answer, 1) },
        { from: wrappedWorldPoint(selected, -1), to },
      ]
}

export default function GeoMap({
  locale,
  labels,
  prompt,
  disabled = false,
  selectedCoordinate,
  onSelectedCoordinateChange,
  onSubmit,
  feedback,
}: GeoMapProps) {
  const [viewport, setViewport] = useState<Viewport>(INITIAL_VIEWPORT)
  const [announcement, setAnnouncement] = useState('')
  const svgRef = useRef<SVGSVGElement>(null)
  // measured once per gesture: a getBoundingClientRect per pointermove forces layout
  const svgRectRef = useRef<DOMRect | null>(null)
  const pointersRef = useRef(new Map<number, PointerPoint>())
  const dragPointerRef = useRef<number | null>(null)
  const pinchRef = useRef<PinchSession | null>(null)
  const descriptionId = useId()
  const liveRegionId = useId()

  const selectionLocked = disabled || Boolean(feedback)
  const viewBox = viewBoxFor(viewport)
  const selectedPoint = selectedCoordinate
    ? coordinateToWorldPoint(selectedCoordinate)
    : null
  const answerPoint = feedback
    ? coordinateToWorldPoint(feedback.answerCoordinate)
    : null
  const segments =
    selectedCoordinate && feedback
      ? connectionSegments(selectedCoordinate, feedback.answerCoordinate)
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

  const describeCoordinate = (coordinate: GeoCoordinate) => {
    const latitudeDirection = coordinate.latitude < 0 ? 'S' : 'N'
    const longitudeDirection =
      coordinate.longitude < 0 ? (locale === 'es' ? 'O' : 'W') : 'E'
    return `${labels.latitude} ${numberFormatter.format(
      Math.abs(coordinate.latitude),
    )}° ${latitudeDirection}, ${labels.longitude} ${numberFormatter.format(
      Math.abs(coordinate.longitude),
    )}° ${longitudeDirection}`
  }

  const positionText = selectedCoordinate
    ? `${labels.position}: ${describeCoordinate(selectedCoordinate)}. ${
        labels.regions[broadRegion(selectedCoordinate)]
      }. ${labels.zoom} ${numberFormatter.format(viewport.zoom)}×.`
    : labels.instructions
  const announcementText =
    feedback && selectedCoordinate
      ? `${labels.selectedPoint}: ${describeCoordinate(selectedCoordinate)}. ${
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
        {prompt && (
          <p className={css.mapPromptBanner} aria-hidden='true'>
            {prompt}
          </p>
        )}
        <span className={css.mapProjectionTag}>{labels.projection}</span>
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
          data-has-marker={Boolean(selectedCoordinate)}
          onKeyDown={handleKeyDown}
          onPointerCancel={releasePointer}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ touchAction: 'none' }}
        >
          <title>{labels.map}</title>
          <desc>{labels.instructions}</desc>

          <path className={css.mapOcean} d={WORLD_OUTLINE_PATH} />
          <image
            className={css.mapLand}
            href='/games/geo/assets/map/world-map.svg'
            width={MAP_WIDTH}
            height={MAP_HEIGHT}
            preserveAspectRatio='none'
          />

          <g className={css.mapGrid}>
            {GRATICULE_MERIDIANS.map((meridian) => (
              <path key={`meridian-${meridian.id}`} d={meridian.d} />
            ))}
            {GRATICULE_PARALLELS.map((parallel) => (
              <path key={`parallel-${parallel.id}`} d={parallel.d} />
            ))}
            <path className={css.mapEquator} d={EQUATOR_PATH} />
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
            onClick={() => zoomTo(viewport.zoom / ZOOM_STEP)}
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
            onClick={() => zoomTo(viewport.zoom * ZOOM_STEP)}
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
        {selectedCoordinate && !selectionLocked && (
          <button
            type='button'
            className={css.secondaryButton}
            onClick={submitSelection}
          >
            <span>{labels.submit}</span>
            <span aria-hidden='true'>◉</span>
          </button>
        )}
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
