'use client'

import cn from 'clsx'
import { clamp } from 'es-toolkit'
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from 'react'
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { haversineDistanceKm } from 'services/distance'
import { sceneTrap, useHotkeys } from 'services/hotkeys'
import Link from 'services/link'
import Shell from 'services/shell'
import { useTheme } from 'services/theme'
import { useRouteTransition } from 'services/transition/context'
import {
  fetchVisitorLocation,
  type VisitorLocation,
} from 'services/visitor-location'
import {
  DESTINATIONS,
  type Destination,
  flagOf,
  HOME,
  REGIONS,
  type Region,
  type Visitor,
} from './destinations'
import { disposeRegionSignals, playRegionSignal } from './signals'
import { createTravelAudio } from './travel-audio'
import css from './travel-control.module.css'
import TravelRadio from './travel-radio'
import { useSupernovaLoop } from './use-supernova-loop'
import {
  TRAVEL_PITCH_MAX,
  TRAVEL_ZOOM_MAX,
  TRAVEL_ZOOM_MIN,
  useTravelGlobe,
} from './use-travel-globe'

const SCENE_ZOOM_MAX = TRAVEL_ZOOM_MAX * 2
// 120ms rocker settle + 400ms CRT collapse + a beat of dead screen
const POWER_OFF_EXIT_MS = 850
const ZOOM_KEY_SETTLE_MS = 170
const CITY_PIN_LANDINGS = [
  { rotate: '-18deg', x: '0%', y: '0%' },
  { rotate: '9deg', x: '28%', y: '0%' },
  { rotate: '-11deg', x: '62%', y: '0%' },
  { rotate: '18deg', x: '100%', y: '0%' },
  { rotate: '-23deg', x: '0%', y: '48%' },
  { rotate: '14deg', x: '34%', y: '42%' },
  { rotate: '-8deg', x: '68%', y: '56%' },
  { rotate: '21deg', x: '100%', y: '50%' },
  { rotate: '11deg', x: '0%', y: '100%' },
  { rotate: '-17deg', x: '36%', y: '100%' },
  { rotate: '23deg', x: '72%', y: '100%' },
  { rotate: '-10deg', x: '100%', y: '100%' },
] as const

const CITY_PIN_LANDING_COUNT = CITY_PIN_LANDINGS.length

type CityPinPoint = {
  x: number
  y: number
}

const toRadians = (value: number): number => (value * Math.PI) / 180

const formatCoords = (spot: { lat: number; lon: number }): string => {
  const lat = `${Math.abs(spot.lat).toFixed(2)}°${spot.lat >= 0 ? 'N' : 'S'}`
  const lon = `${Math.abs(spot.lon).toFixed(2)}°${spot.lon >= 0 ? 'E' : 'W'}`
  return `${lat} ${lon}`
}

const distanceFormatter = new Intl.NumberFormat('en', {
  maximumFractionDigits: 0,
})
const countryFormatter = new Intl.DisplayNames(['en'], { type: 'region' })

const distanceFromHome = (spot: Destination): number =>
  Math.round(
    haversineDistanceKm(
      { latitude: HOME.lat, longitude: HOME.lon },
      { latitude: spot.lat, longitude: spot.lon },
    ),
  )

const formatRange = (spot: Destination): string =>
  spot.home
    ? 'Home · right here'
    : `${distanceFormatter.format(distanceFromHome(spot))} km`

const formatCountry = (country: string): string =>
  countryFormatter.of(country) ?? country

const bearingFromHome = (spot: Destination): number => {
  if (spot.home) return 0
  const homeLat = toRadians(HOME.lat)
  const spotLat = toRadians(spot.lat)
  const lonDelta = toRadians(spot.lon - HOME.lon)
  const y = Math.sin(lonDelta) * Math.cos(spotLat)
  const x =
    Math.cos(homeLat) * Math.sin(spotLat) -
    Math.sin(homeLat) * Math.cos(spotLat) * Math.cos(lonDelta)
  return Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360)
}

const formatBearing = (spot: Destination): string =>
  `${String(bearingFromHome(spot)).padStart(3, '0')}°T`

const formatViewHeading = (longitude: number): string => {
  const normalized = ((Math.round(longitude) % 360) + 360) % 360
  return `${String(normalized).padStart(3, '0')}°`
}

const formatViewLatitude = (latitude: number): string => {
  const rounded = Math.round(latitude)
  return `${rounded >= 0 ? '+' : '−'}${String(Math.abs(rounded)).padStart(2, '0')}°`
}

const formatPitchAria = (latitude: number): string => {
  const rounded = Math.round(latitude)
  if (rounded === 0) return '0 degrees, equator'
  return `${Math.abs(rounded)} degrees ${rounded > 0 ? 'north' : 'south'}`
}

type Rgb = [number, number, number]

const SUN_CORE_YOUNG: Rgb = [255, 233, 176]
const SUN_CORE_OLD: Rgb = [255, 90, 42]
const SUN_EDGE_YOUNG: Rgb = [255, 154, 60]
const SUN_EDGE_OLD: Rgb = [184, 31, 5]

const mixChannel = (from: number, to: number, t: number): number =>
  Math.round(from + (to - from) * t)

const mixRgb = (from: Rgb, to: Rgb, t: number): string =>
  `rgb(${mixChannel(from[0], to[0], t)} ${mixChannel(from[1], to[1], t)} ${mixChannel(from[2], to[2], t)})`

const sunStyle = (phase: number): CSSProperties =>
  ({
    '--sun-core': mixRgb(SUN_CORE_YOUNG, SUN_CORE_OLD, phase),
    '--sun-edge': mixRgb(SUN_EDGE_YOUNG, SUN_EDGE_OLD, phase),
    '--sun-scale': String(1 + phase * 0.5),
  }) as CSSProperties

// one squiggle per traveler: harmonica, banjo, drums, flute
const WAVEFORMS: Record<Region, string> = {
  americas:
    'M0 10 Q6 2 12 10 T24 10 T36 10 T48 10 T60 10 T72 10 T84 10 T96 10 T108 10 T120 10',
  europe:
    'M0 10 L14 10 L17 3 L20 16 L23 10 L44 10 L47 4 L50 15 L53 10 L82 10 L85 2 L88 17 L91 10 L120 10',
  africa:
    'M0 10 L12 10 L12 4 L20 4 L20 10 L44 10 L44 3 L54 3 L54 10 L84 10 L84 5 L92 5 L92 10 L120 10',
  asia: 'M0 10 C18 2 34 2 52 10 S94 18 120 10',
}

type UplinkState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'located'; visitor: Visitor }
  | { status: 'unavailable' }

type UplinkEvent =
  | { type: 'locate' }
  | { type: 'located'; visitor: Visitor }
  | { type: 'unavailable' }

const uplinkReducer = (state: UplinkState, event: UplinkEvent): UplinkState => {
  switch (event.type) {
    case 'locate':
      return { status: 'locating' }
    case 'located':
      return state.status === 'locating'
        ? { status: 'located', visitor: event.visitor }
        : state
    case 'unavailable':
      return state.status === 'locating' ? { status: 'unavailable' } : state
  }
}

const visitorFrom = (location: VisitorLocation | null): Visitor | null => {
  if (!location?.located) return null
  if (location.lat === undefined || location.lon === undefined) return null
  return {
    lat: location.lat,
    lon: location.lon,
    city: location.city ?? null,
    country: location.country ?? null,
  }
}

const useVisitor = () => {
  const [state, dispatch] = useReducer(uplinkReducer, { status: 'idle' })

  const locate = useCallback(async () => {
    dispatch({ type: 'locate' })
    const visitor = visitorFrom(await fetchVisitorLocation())
    dispatch(visitor ? { type: 'located', visitor } : { type: 'unavailable' })
  }, [])

  useEffect(() => {
    void locate()
  }, [locate])

  const visitor = state.status === 'located' ? state.visitor : null
  return { locate, state, visitor }
}

type VisitorNote = { title: string; detail: string }

const SEARCHING_NOTE: VisitorNote = {
  title: 'Finding this patch of Earth…',
  detail: 'Listening for nearby towers…',
}

const UNLOCATED_NOTES: Record<
  'idle' | 'locating' | 'unavailable',
  VisitorNote
> = {
  idle: SEARCHING_NOTE,
  locating: SEARCHING_NOTE,
  unavailable: {
    title: 'Position signal went quiet.',
    detail: 'Still on Earth. Probably.',
  },
}

const visitorNoteFor = (state: UplinkState): VisitorNote => {
  if (state.status !== 'located') return UNLOCATED_NOTES[state.status]
  const { visitor } = state
  const country = visitor.country ? formatCountry(visitor.country) : null
  return {
    title: `Woke up in ${visitor.city ?? country ?? 'a familiar place'}.`,
    detail: `${formatCoords(visitor)} · roughly`,
  }
}

const DIAL_DEGREES_PER_PIXEL = 0.42
const DIAL_KEY_STEP = 2
const DIAL_PAGE_STEP = 15

type DialKeyTurn = { dir: -1 | 1; step: number; horizontalOnly?: boolean }

const DIAL_KEY_TURNS: Record<string, DialKeyTurn> = {
  ArrowUp: { dir: 1, step: DIAL_KEY_STEP },
  ArrowRight: { dir: 1, step: DIAL_KEY_STEP, horizontalOnly: true },
  ArrowDown: { dir: -1, step: DIAL_KEY_STEP },
  ArrowLeft: { dir: -1, step: DIAL_KEY_STEP, horizontalOnly: true },
  PageUp: { dir: 1, step: DIAL_PAGE_STEP },
  PageDown: { dir: -1, step: DIAL_PAGE_STEP },
}

type AxisDialDrag = {
  angle: number | null
  pointerId: number
  x: number
  y: number
}

const normalizeHeading = (heading: number): number =>
  ((heading % 360) + 360) % 360

const pointerAngle = (event: ReactPointerEvent<HTMLDivElement>): number => {
  const rect = event.currentTarget.getBoundingClientRect()
  return (
    (Math.atan2(
      event.clientY - (rect.top + rect.height / 2),
      event.clientX - (rect.left + rect.width / 2),
    ) *
      180) /
    Math.PI
  )
}

const signedAngleDelta = (from: number, to: number): number =>
  ((to - from + 540) % 360) - 180

const isMechanicalControl = (
  target: EventTarget | null,
  console: HTMLElement,
): boolean => {
  if (!(target instanceof Element)) return false
  const control = target.closest<HTMLElement>('button:not(:disabled), a[href]')
  return Boolean(
    control &&
      console.contains(control) &&
      control.getAttribute('aria-disabled') !== 'true',
  )
}

const isRotaryControl = (
  target: EventTarget | null,
  console: HTMLElement,
): boolean => {
  if (!(target instanceof Element)) return false
  const control = target.closest<HTMLElement>('[data-travel-sfx="knob"]')
  return Boolean(control && console.contains(control))
}

function AxisDial(props: {
  id: string
  leftLimit: string
  rightLimit: string
  min: number
  max: number
  initialValue: number
  initialKnobAngle: number
  orientation: 'horizontal' | 'vertical'
  increaseKnobDirection: -1 | 1
  ariaLabel: string
  hint: string
  formatAriaValue: (value: number) => string
  controlRef: RefObject<HTMLDivElement | null>
  knobRef: RefObject<HTMLSpanElement | null>
  onTurn: (knobDelta: number) => void
  onSetValue: (value: number) => void
  onInteractionChange: (active: boolean) => void
  armAudio: () => void
  playRotaryTick: (direction: -1 | 1) => void
}) {
  const {
    id,
    leftLimit,
    rightLimit,
    min,
    max,
    initialValue,
    initialKnobAngle,
    orientation,
    increaseKnobDirection,
    ariaLabel,
    hint,
    formatAriaValue,
    controlRef,
    knobRef,
    onTurn,
    onSetValue,
    onInteractionChange,
    armAudio,
    playRotaryTick,
  } = props
  const dragRef = useRef<AxisDialDrag | null>(null)
  const [dragging, setDragging] = useState(false)

  const turnDial = useCallback(
    (turn: number) => {
      if (!Number.isFinite(turn) || Math.abs(turn) < 0.001) return
      onTurn(turn)
      playRotaryTick(turn > 0 ? 1 : -1)
    },
    [onTurn, playRotaryTick],
  )

  useEffect(() => {
    const control = controlRef.current
    if (!control) return
    // React delegates wheel events passively. This physical control must keep
    // the page still while the user turns it.
    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey || event.deltaY === 0) return
      event.preventDefault()
      event.stopPropagation()
      armAudio()
      const valueDirection = event.deltaY < 0 ? 1 : -1
      turnDial(valueDirection * increaseKnobDirection * DIAL_KEY_STEP)
    }
    control.addEventListener('wheel', handleWheel, { passive: false })
    return () => control.removeEventListener('wheel', handleWheel)
  }, [armAudio, controlRef, increaseKnobDirection, turnDial])

  const beginDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const rect = event.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const radius = Math.hypot(event.clientX - centerX, event.clientY - centerY)
    armAudio()
    event.currentTarget.focus({ preventScroll: true })
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      angle:
        radius > Math.min(rect.width, rect.height) * 0.2
          ? pointerAngle(event)
          : null,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    }
    setDragging(true)
    onInteractionChange(true)
    event.preventDefault()
    event.stopPropagation()
  }

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    let turn: number
    if (drag.angle === null) {
      const distance = event.clientX - drag.x - (event.clientY - drag.y)
      turn = distance * DIAL_DEGREES_PER_PIXEL
    } else {
      const angle = pointerAngle(event)
      turn = signedAngleDelta(drag.angle, angle)
      drag.angle = angle
    }
    drag.x = event.clientX
    drag.y = event.clientY
    turnDial(event.shiftKey ? turn / 4 : turn)
    event.preventDefault()
    event.stopPropagation()
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    setDragging(false)
    onInteractionChange(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId)
    event.stopPropagation()
  }

  const snapToLimit = (
    event: ReactKeyboardEvent<HTMLDivElement>,
    value: number,
    tick: -1 | 1,
  ) => {
    event.preventDefault()
    if (Number(event.currentTarget.getAttribute('aria-valuenow')) === value)
      return
    armAudio()
    onSetValue(value)
    playRotaryTick(tick)
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Home') {
      snapToLimit(event, min, increaseKnobDirection === 1 ? -1 : 1)
      return
    }
    if (event.key === 'End') {
      snapToLimit(event, max, increaseKnobDirection)
      return
    }
    const turn = DIAL_KEY_TURNS[event.key]
    if (!turn) return
    if (turn.horizontalOnly && orientation === 'vertical') return
    event.preventDefault()
    armAudio()
    turnDial(turn.dir * increaseKnobDirection * turn.step)
  }

  return (
    <div className={css.axisDial}>
      <span className={css.rangeDialLimit} data-side='left' aria-hidden='true'>
        {leftLimit}
      </span>
      <span className={css.rangeDialWell}>
        <div
          id={id}
          ref={controlRef}
          className={css.rangeDialInput}
          data-travel-sfx='knob'
          role='slider'
          tabIndex={0}
          data-dragging={dragging}
          aria-label={ariaLabel}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={Math.round(initialValue)}
          aria-valuetext={formatAriaValue(initialValue)}
          aria-orientation={orientation}
          aria-controls='travel-globe-canvas'
          aria-describedby={`${id}-hint`}
          onKeyDown={handleKeyDown}
          onPointerDown={beginDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={() => {
            if (!dragRef.current) return
            dragRef.current = null
            setDragging(false)
            onInteractionChange(false)
          }}
        />
        <span
          ref={knobRef}
          className={css.rangeKnob}
          style={
            {
              '--range-angle': `${initialKnobAngle}deg`,
            } as CSSProperties
          }
          aria-hidden='true'
        >
          <span className={css.rangeKnobShaft} />
          <span className={css.rangeKnobFace}>
            <i />
          </span>
        </span>
      </span>
      <span className={css.rangeDialLimit} data-side='right' aria-hidden='true'>
        {rightLimit}
      </span>
      <span id={`${id}-hint`} className='sr-only'>
        {hint}
      </span>
    </div>
  )
}

function ContactRow(props: {
  index: number
  spot: Destination
  tracked: boolean
  pinLanding: number
  pinPoint: CityPinPoint | null
  onTrack: (spot: Destination, pinPoint?: CityPinPoint) => void
}) {
  const { index, spot, tracked, pinLanding, pinPoint, onTrack } = props
  const pinPosition = CITY_PIN_LANDINGS[pinLanding] ?? CITY_PIN_LANDINGS[0]
  const mouseActivationRef = useRef(false)
  const pinX = pinPoint ? `${pinPoint.x}%` : pinPosition.x
  const pinY = pinPoint ? `${pinPoint.y}%` : pinPosition.y

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    mouseActivationRef.current =
      event.pointerType === 'mouse' && event.button === 0 && event.isPrimary
  }

  const handleClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    const activatedWithMouse = mouseActivationRef.current
    mouseActivationRef.current = false

    if (!activatedWithMouse || event.detail === 0) {
      onTrack(spot)
      return
    }

    const bounds = event.currentTarget.getBoundingClientRect()
    if (bounds.width <= 0 || bounds.height <= 0) {
      onTrack(spot)
      return
    }

    const clampPercent = (value: number): number =>
      clamp(Math.round(value * 100) / 100, 0, 100)

    onTrack(spot, {
      x: clampPercent(((event.clientX - bounds.left) / bounds.width) * 100),
      y: clampPercent(((event.clientY - bounds.top) / bounds.height) * 100),
    })
  }

  return (
    <li>
      <button
        type='button'
        className={css.contact}
        aria-pressed={tracked}
        aria-label={`Tune the signalscope to ${spot.name}. ${formatCoords(spot)}. Bearing ${formatBearing(spot)}; ${formatRange(spot)} from home. Ship log: ${spot.log}`}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
      >
        {tracked && (
          <span
            key={pinLanding}
            className={css.cityPin}
            data-landing={pinLanding}
            style={
              {
                '--pin-rotate': pinPosition.rotate,
                '--pin-x': pinX,
                '--pin-y': pinY,
              } as CSSProperties
            }
            aria-hidden='true'
          >
            <span className={css.cityPinHead} />
          </span>
        )}
        <span className={css.contactIndex} aria-hidden='true'>
          {String(index).padStart(2, '0')}
        </span>
        <span className={css.contactIdentity}>
          <span className={css.name}>
            <span aria-hidden='true'>{flagOf(spot.country)}</span>
            {spot.name}
            {spot.home && <em>HOME</em>}
          </span>
          <span className={css.coords}>{formatCoords(spot)}</span>
          <span className={css.contactNote}>{spot.log}</span>
        </span>
        <span className={css.contactRange}>
          <span className={css.code}>{spot.code}</span>
          <span>
            {formatBearing(spot)} · {formatRange(spot)}
          </span>
        </span>
      </button>
    </li>
  )
}

export default function TravelView() {
  const [tracked, setTracked] = useState<Destination>(HOME)
  const [activeRegion, setActiveRegion] = useState(HOME.region)
  const [pinLanding, setPinLanding] = useState(0)
  const [pinPoint, setPinPoint] = useState<CityPinPoint | null>(null)
  const { locate: locateVisitor, state: uplink, visitor } = useVisitor()
  const { fxMode } = useTheme()
  const transition = useRouteTransition()
  const [travelAudio] = useState(createTravelAudio)
  const [pressedZoom, setPressedZoom] = useState<'in' | 'out' | null>(null)
  const [poweredOff, setPoweredOff] = useState(false)
  const zoomPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const moonBackSvgRef = useRef<SVGSVGElement>(null)
  const moonBackOrbitRef = useRef<SVGPathElement>(null)
  const moonBackBodyRef = useRef<SVGGElement>(null)
  const moonBackLabelRef = useRef<SVGTextElement>(null)
  const moonFrontSvgRef = useRef<SVGSVGElement>(null)
  const moonFrontOrbitRef = useRef<SVGPathElement>(null)
  const moonFrontBodyRef = useRef<SVGGElement>(null)
  const moonFrontLabelRef = useRef<SVGTextElement>(null)
  const trackDestination = useCallback(
    (spot: Destination, nextPinPoint?: CityPinPoint) => {
      setTracked(spot)
      setActiveRegion(spot.region)
      setPinPoint(nextPinPoint ?? null)
      setPinLanding((current) => {
        const offset =
          1 + Math.floor(Math.random() * (CITY_PIN_LANDING_COUNT - 1))
        return (current + offset) % CITY_PIN_LANDING_COUNT
      })
    },
    [],
  )
  const globe = useTravelGlobe({
    tracked,
    quiet: fxMode === 'quiet',
    visitor,
    onSelect: trackDestination,
    manualZoomMax: SCENE_ZOOM_MAX,
    canvasFit: 'viewport',
    visitorMarkerScale: 1.4,
    colorway: 'signalscope',
    devicePixelRatioCap: 1.35,
    moon: {
      back: {
        svg: moonBackSvgRef,
        orbit: moonBackOrbitRef,
        body: moonBackBodyRef,
        label: moonBackLabelRef,
      },
      front: {
        svg: moonFrontSvgRef,
        orbit: moonFrontOrbitRef,
        body: moonFrontBodyRef,
        label: moonFrontLabelRef,
      },
    },
  })
  const zoomInAtLimit = globe.zoomLevel >= SCENE_ZOOM_MAX
  const zoomOutAtLimit = globe.zoomLevel <= TRAVEL_ZOOM_MIN
  const changeZoom = (direction: 'in' | 'out') => {
    if (direction === 'in') globe.zoomIn()
    else globe.zoomOut()
  }
  const actuateZoom = (direction: 'in' | 'out') => {
    const atLimit = direction === 'in' ? zoomInAtLimit : zoomOutAtLimit
    if (atLimit) return
    setPressedZoom(direction)
    if (zoomPressTimerRef.current !== null) {
      clearTimeout(zoomPressTimerRef.current)
    }
    changeZoom(direction)
    zoomPressTimerRef.current = setTimeout(() => {
      setPressedZoom(null)
      zoomPressTimerRef.current = null
    }, ZOOM_KEY_SETTLE_MS)
  }
  const supernova = useSupernovaLoop({ quiet: fxMode === 'quiet' })
  const activeRegionMeta =
    REGIONS.find((region) => region.id === activeRegion) ?? REGIONS[0]
  const activeRegionSpots = DESTINATIONS.filter(
    (spot) => spot.region === activeRegion,
  )
  const activeRegionIndex = REGIONS.findIndex(
    (region) => region.id === activeRegion,
  )
  const [regionStatus, setRegionStatus] = useState('')
  const announcedRegionRef = useRef(activeRegion)
  useEffect(() => {
    if (announcedRegionRef.current === activeRegion) return
    announcedRegionRef.current = activeRegion
    setRegionStatus(`Region: ${activeRegionMeta.label}`)
  }, [activeRegion, activeRegionMeta.label])
  const visitorNote = visitorNoteFor(uplink)
  const visitorNoteBusy =
    uplink.status === 'idle' || uplink.status === 'locating'
  const armTravelAudio = useCallback(() => {
    if (fxMode !== 'quiet') travelAudio.arm()
  }, [fxMode, travelAudio])

  const playTravelRotaryTick = useCallback(
    (direction: -1 | 1) => {
      if (fxMode !== 'quiet') travelAudio.playRotaryTick(direction)
    },
    [fxMode, travelAudio],
  )

  const playTravelButtonPress = useCallback(() => {
    if (fxMode !== 'quiet') travelAudio.playButtonPress()
  }, [fxMode, travelAudio])

  const handleMechanicalPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (
        event.button === 0 &&
        isRotaryControl(event.target, event.currentTarget)
      ) {
        armTravelAudio()
        playTravelRotaryTick(1)
        return
      }
      if (
        event.button === 0 &&
        isMechanicalControl(event.target, event.currentTarget)
      ) {
        playTravelButtonPress()
      }
    },
    [armTravelAudio, playTravelButtonPress, playTravelRotaryTick],
  )

  const handleMechanicalClick = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      if (
        event.detail === 0 &&
        isMechanicalControl(event.target, event.currentTarget)
      ) {
        playTravelButtonPress()
      }
    },
    [playTravelButtonPress],
  )

  useEffect(() => {
    return () => {
      if (zoomPressTimerRef.current !== null) {
        clearTimeout(zoomPressTimerRef.current)
      }
      travelAudio.dispose()
      disposeRegionSignals()
    }
  }, [travelAudio])

  const turnOff = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    if (poweredOff) return
    setPoweredOff(true)
    transition.navigateLater('/', POWER_OFF_EXIT_MS)
  }

  const tuneTo = (region: Region) => {
    if (region === activeRegion) return
    setActiveRegion(region)
    if (fxMode !== 'quiet') playRegionSignal(region)
  }

  const trackSibling = (direction: -1 | 1) => {
    const index = DESTINATIONS.findIndex((spot) => spot.code === tracked.code)
    const count = DESTINATIONS.length
    trackDestination(DESTINATIONS[(index + direction + count) % count])
  }

  const trackSiblingRegion = (direction: -1 | 1) => {
    const index = REGIONS.findIndex((region) => region.id === activeRegion)
    const count = REGIONS.length
    const next = REGIONS[(index + direction + count) % count]
    const first = DESTINATIONS.find((spot) => spot.region === next.id)
    if (!first) return
    trackDestination(first)
    if (fxMode !== 'quiet') playRegionSignal(next.id)
  }

  const radarTrap = (press: () => void) =>
    sceneTrap(() => {
      playTravelButtonPress()
      press()
    })

  useHotkeys([
    ['[', radarTrap(() => trackSibling(-1))],
    [']', radarTrap(() => trackSibling(1))],
    // tinykeys rejects presses with unlisted modifiers: shifted
    // characters need the Shift declared or they never match
    ['Shift+{', radarTrap(() => trackSiblingRegion(-1))],
    ['Shift+}', radarTrap(() => trackSiblingRegion(1))],
    [['Equal', 'Shift+Equal'], radarTrap(() => changeZoom('in'))],
    ['Minus', radarTrap(() => changeZoom('out'))],
    ['0', radarTrap(() => trackDestination(HOME))],
  ])

  return (
    <Shell className={css.frame} shellClassName={css.travelShell}>
      <section
        className={cn(css.console, poweredOff && css.consoleOff)}
        aria-labelledby='travel-control-title'
        onPointerDownCapture={handleMechanicalPointerDown}
        onClickCapture={handleMechanicalClick}
      >
        <header className={css.overheadPanel}>
          <nav className={css.utilityRail} aria-label='Console power'>
            <Link
              url='/'
              className={cn(css.backLink, poweredOff && css.powerOff)}
              aria-label='Turn off the traveler’s console and return home'
              onClick={turnOff}
            >
              <span className={css.powerRocker} aria-hidden='true'>
                <span className={css.powerRockerFace}>
                  <i className={css.powerLight} />
                  <i className={css.powerDots} />
                  <i className={css.powerCharacters} />
                  <i className={css.powerShine} />
                  <i className={css.powerShadow} />
                </span>
              </span>
              <span className={css.powerLabel}>Turn off</span>
            </Link>
          </nav>
          <div className={css.stationIdentity}>
            <p>RS–05 · VENTURES SIGNAL ROOM</p>
            <h1 id='travel-control-title'>Traveler&apos;s signalscope</h1>
            <span>Ship log · Barcelona is home. For now.</span>
          </div>
          <button
            type='button'
            className={css.headerStickyNote}
            onClick={() => void locateVisitor()}
            disabled={visitorNoteBusy}
            aria-busy={visitorNoteBusy}
            aria-label={
              visitorNoteBusy
                ? 'Checking your approximate position'
                : 'Check your approximate position again'
            }
          >
            <span className={css.headerStickyLabel}>NOTE TO SELF</span>
            <strong>{visitorNote.title}</strong>
            <small>{visitorNote.detail}</small>
            <span className={css.headerStickyAction}>
              {visitorNoteBusy ? '… CHECKING' : '↻ CHECK AGAIN'}
            </span>
          </button>
          <dl className={css.missionStats} aria-label='Ship log summary'>
            <div>
              <dt>Found</dt>
              <dd>{String(DESTINATIONS.length).padStart(2, '0')}</dd>
            </div>
            <div>
              <dt>Signals</dt>
              <dd>{String(REGIONS.length).padStart(2, '0')}</dd>
            </div>
            <div>
              <dt>Home</dt>
              <dd>CAT</dd>
            </div>
          </dl>
          <div className={css.annunciators}>
            <span data-state='live'>SIGNALSCOPE</span>
            <span data-state='live'>TRAVELERS</span>
            <span data-state='home'>BCN 05</span>
          </div>
          <span className={css.headerWear} aria-hidden='true'>
            <i data-wear='scratch-a' />
            <i data-wear='scratch-b' />
            <i data-wear='decal-ghost' />
          </span>
        </header>

        <div className={css.panorama}>
          <aside className={cn(css.instrumentWing, css.portWing)}>
            <header>
              <span>01</span>
              <strong className={css.instrumentLabel}>Heading reference</strong>
            </header>
            <div className={css.compassModule}>
              <div className={css.compassRose} aria-hidden='true'>
                <span ref={globe.compassRef} className={css.compassCard}>
                  <span className={css.north}>N</span>
                  <span className={css.compassNeedle} />
                  <span className={css.compassCardHub} />
                </span>
                <span className={css.compassLubber} />
              </div>
              <p>
                <small className={css.compassMeta}>HDG</small>
                {/* spans, not <output>: idle drift rewrites these ~5×/s */}
                <span
                  ref={globe.compassHeadingRef}
                  className={css.bearingValue}
                >
                  {formatViewHeading(HOME.lon)}
                </span>
                <span className={css.compassMeta}>
                  <span ref={globe.compassLatitudeRef}>
                    {formatViewLatitude(HOME.lat)}
                  </span>{' '}
                  LAT
                </span>
              </p>
            </div>
            <section className={css.contactSolution} aria-live='polite'>
              <header>
                <span>02 · SELECTED CITY</span>
                <strong className={css.solutionState}>
                  {tracked.home ? 'HOME' : 'FOUND'}
                </strong>
              </header>
              <div className={css.solutionIdentity}>
                <span aria-hidden='true'>{flagOf(tracked.country)}</span>
                <strong>{tracked.name}</strong>
                <em>{tracked.code}</em>
              </div>
              <dl>
                <div>
                  <dt>Country</dt>
                  <dd>{formatCountry(tracked.country)}</dd>
                </div>
                <div>
                  <dt>Position</dt>
                  <dd>{formatCoords(tracked)}</dd>
                </div>
                <div>
                  <dt>From home</dt>
                  <dd>{formatRange(tracked)}</dd>
                </div>
                <div>
                  <dt>Bearing</dt>
                  <dd>{formatBearing(tracked)}</dd>
                </div>
              </dl>
            </section>
          </aside>

          <section
            className={css.stage}
            aria-labelledby='position-display-title'
          >
            <header className={css.scopeHeader}>
              <div>
                <strong id='position-display-title'>
                  {tracked.code} / {tracked.name}
                </strong>
                <small>
                  CAT → {tracked.code} · {formatRange(tracked)}
                </small>
              </div>
            </header>
            <div className={css.scopeMachine}>
              <div className={css.cabinBrace} aria-hidden='true'>
                <i />
                <i />
                <i />
              </div>
              <div className={css.scopeBezel}>
                <div className={css.screenWell}>
                  <span className={css.screenWalls} aria-hidden='true'>
                    <i data-side='top' />
                    <i data-side='right' />
                    <i data-side='bottom' />
                    <i data-side='left' />
                  </span>
                  <div className={css.viewport}>
                    <div className={css.tube}>
                      <svg
                        ref={moonBackSvgRef}
                        className={cn(css.lunarLayer, css.lunarLayerBack)}
                        viewBox='0 0 1000 1000'
                        aria-hidden='true'
                      >
                        <defs>
                          <radialGradient
                            id='travel-moon-back'
                            cx='34%'
                            cy='30%'
                            r='72%'
                          >
                            <stop offset='0' stopColor='#d8ded6' />
                            <stop offset='62%' stopColor='#79837a' />
                            <stop offset='100%' stopColor='#4a524b' />
                          </radialGradient>
                        </defs>
                        <path
                          ref={moonBackOrbitRef}
                          className={css.lunarOrbitPath}
                        />
                        <g
                          ref={moonBackBodyRef}
                          className={css.attlerock}
                          opacity='0'
                        >
                          <circle r='7.2' fill='url(#travel-moon-back)' />
                          <circle
                            className={css.moonCrater}
                            cx='-2.2'
                            cy='-1.5'
                            r='1.35'
                          />
                          <circle
                            className={css.moonCrater}
                            cx='2.1'
                            cy='2'
                            r='0.9'
                          />
                          <text
                            ref={moonBackLabelRef}
                            className={css.moonLabel}
                            x='12'
                            y='4'
                          >
                            MOON
                          </text>
                        </g>
                      </svg>
                      <canvas
                        id='travel-globe-canvas'
                        ref={globe.canvasRef}
                        className={css.canvas}
                        role='img'
                        aria-label='Interactive world signalscope. Drag the sky, turn the dials, or choose a ship-log entry to tune a signal.'
                        aria-describedby='scope-instructions'
                        onPointerDown={globe.onPointerDown}
                        onPointerMove={globe.onPointerMove}
                        onPointerUp={globe.onPointerUp}
                        onPointerCancel={globe.onPointerCancel}
                        onPointerLeave={globe.onPointerLeave}
                      >
                        The globe fell asleep. Pick a place from the ship log.
                      </canvas>
                      <svg
                        ref={moonFrontSvgRef}
                        className={cn(css.lunarLayer, css.lunarLayerFront)}
                        viewBox='0 0 1000 1000'
                        aria-hidden='true'
                      >
                        <defs>
                          <radialGradient
                            id='travel-moon-front'
                            cx='34%'
                            cy='30%'
                            r='72%'
                          >
                            <stop offset='0' stopColor='#edf1e9' />
                            <stop offset='58%' stopColor='#919c91' />
                            <stop offset='100%' stopColor='#525b53' />
                          </radialGradient>
                        </defs>
                        <path
                          ref={moonFrontOrbitRef}
                          className={css.lunarOrbitPath}
                        />
                        <g
                          ref={moonFrontBodyRef}
                          className={css.attlerock}
                          opacity='0'
                        >
                          <circle r='7.2' fill='url(#travel-moon-front)' />
                          <circle
                            className={css.moonCrater}
                            cx='-2.2'
                            cy='-1.5'
                            r='1.35'
                          />
                          <circle
                            className={css.moonCrater}
                            cx='2.1'
                            cy='2'
                            r='0.9'
                          />
                          <text
                            ref={moonFrontLabelRef}
                            className={css.moonLabel}
                            x='12'
                            y='4'
                          >
                            MOON
                          </text>
                        </g>
                      </svg>
                    </div>
                    <div
                      className={css.scopeFallback}
                      data-visible={globe.status !== 'ready'}
                      role='status'
                    >
                      <strong>
                        {globe.status === 'loading'
                          ? 'WAKING THE SIGNALSCOPE'
                          : 'SIGNALSCOPE FELL ASLEEP'}
                      </strong>
                      <span>
                        {globe.status === 'loading'
                          ? 'Give it a moment. The glass is remembering the sky.'
                          : 'That’s all right. The ship log still remembers every place.'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className={css.scopeControlDeck}>
                <p className={css.readout}>
                  <span className={css.readoutKey}>MFD 05 ▸</span>
                  <span>{tracked.name}</span>
                  <span className={css.readoutCoords}>
                    {formatCoords(tracked)}
                  </span>
                  <span className={css.readoutCoords}>
                    BRG {formatBearing(tracked)}
                  </span>
                  <span className={css.readoutRange}>
                    {formatRange(tracked)}
                  </span>
                  <span
                    className={css.loopMeter}
                    style={sunStyle(supernova.phase)}
                    title='Time until the sun has other plans'
                  >
                    <i className={css.sun} aria-hidden='true' />
                    <span className='sr-only'>
                      Time until the sun has other plans{' '}
                    </span>
                    {supernova.countdown}
                  </span>
                  <span className={css.blink} aria-hidden='true'>
                    ▮
                  </span>
                </p>
                <div className={css.rangeAssembly}>
                  <fieldset className={css.rangeDial}>
                    <legend className='sr-only'>
                      Signalscope position dials
                    </legend>
                    <AxisDial
                      id='travel-orbit-dial'
                      leftLimit='E'
                      rightLimit='W'
                      min={0}
                      max={359}
                      initialValue={normalizeHeading(HOME.lon)}
                      initialKnobAngle={-normalizeHeading(HOME.lon)}
                      orientation='horizontal'
                      increaseKnobDirection={-1}
                      ariaLabel='Globe orbit heading'
                      hint='Turn clockwise and the globe rolls west. Turn counterclockwise and it rolls east. Hold Shift for tiny turns.'
                      formatAriaValue={(value) =>
                        `${formatViewHeading(value)} heading`
                      }
                      controlRef={globe.orbitControlRef}
                      knobRef={globe.orbitKnobRef}
                      onTurn={globe.orbitBy}
                      onSetValue={globe.orbitTo}
                      onInteractionChange={globe.setDialControlActive}
                      armAudio={armTravelAudio}
                      playRotaryTick={playTravelRotaryTick}
                    />
                    <AxisDial
                      id='travel-pitch-dial'
                      leftLimit='N'
                      rightLimit='S'
                      min={-Math.floor(TRAVEL_PITCH_MAX)}
                      max={Math.floor(TRAVEL_PITCH_MAX)}
                      initialValue={HOME.lat}
                      initialKnobAngle={-HOME.lat}
                      orientation='vertical'
                      increaseKnobDirection={-1}
                      ariaLabel='Globe vertical pitch'
                      hint='Turn clockwise and the globe tips south. Turn counterclockwise and it tips north. Hold Shift for tiny turns.'
                      formatAriaValue={formatPitchAria}
                      controlRef={globe.pitchControlRef}
                      knobRef={globe.pitchKnobRef}
                      onTurn={globe.pitchBy}
                      onSetValue={globe.pitchTo}
                      onInteractionChange={globe.setDialControlActive}
                      armAudio={armTravelAudio}
                      playRotaryTick={playTravelRotaryTick}
                    />
                  </fieldset>
                  <fieldset className={css.zoomControls}>
                    <legend>Range</legend>
                    <button
                      type='button'
                      aria-label='Zoom in'
                      aria-disabled={zoomInAtLimit}
                      data-pressed={pressedZoom === 'in'}
                      onClick={() => actuateZoom('in')}
                    >
                      <span className={css.zoomKeyFace} aria-hidden='true'>
                        +
                      </span>
                    </button>
                    <button
                      type='button'
                      aria-label='Zoom out'
                      aria-disabled={zoomOutAtLimit}
                      data-pressed={pressedZoom === 'out'}
                      onClick={() => actuateZoom('out')}
                    >
                      <span className={css.zoomKeyFace} aria-hidden='true'>
                        −
                      </span>
                    </button>
                  </fieldset>
                  <div className={css.auxCluster}>
                    <div className={css.analogGauge} aria-hidden='true'>
                      <i />
                      <span>SUN</span>
                    </div>
                    <fieldset className={css.signalBank}>
                      <legend className='sr-only'>Scope status</legend>
                      <span>SCOPE</span>
                      <span>LOG</span>
                      <span>CAMP</span>
                    </fieldset>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside
            className={cn(css.instrumentWing, css.starboardWing)}
            aria-labelledby='travel-radio-title'
          >
            <header>
              <span>03</span>
              <strong className={css.instrumentLabel} id='travel-radio-title'>
                Local radio
              </strong>
              <i className={css.radioLed} aria-hidden='true' />
            </header>
            <p className={css.radioHint}>Explore each city&apos;s radio.</p>
            <TravelRadio
              destinationCode={tracked.code}
              destinationName={tracked.name}
              travelAudio={travelAudio}
            />
          </aside>
        </div>

        <section className={css.manifest} aria-labelledby='waypoint-register'>
          <header className={css.manifestHeader}>
            <div>
              <p>VENTURES ARCHIVE / SHIP RS–19911201</p>
              <h2 id='waypoint-register'>Ship log</h2>
            </div>
            <span>
              {String(DESTINATIONS.length).padStart(2, '0')} PLACES FOUND
            </span>
          </header>
          <p className={css.manifestMeta}>
            I found every one. Somehow the ship came back, too.
          </p>
          <div className={css.sectorConsole}>
            <fieldset className={css.sectorTabs}>
              <legend className={css.sectorLegend}>
                Choose a signal region
              </legend>
              <div className={css.dialBand} aria-hidden='true'>
                <svg
                  className={css.waveform}
                  viewBox='0 0 120 20'
                  preserveAspectRatio='none'
                  aria-hidden='true'
                >
                  <path d={WAVEFORMS[activeRegion]} />
                </svg>
                <i
                  className={css.needle}
                  style={{ '--station': activeRegionIndex } as CSSProperties}
                />
              </div>
              <div className={css.stations}>
                {REGIONS.map((region) => (
                  <button
                    key={region.id}
                    id={`travel-sector-${region.id}`}
                    type='button'
                    aria-pressed={activeRegion === region.id}
                    aria-controls='travel-sector-panel'
                    data-sector={region.id}
                    onClick={() => tuneTo(region.id)}
                  >
                    <span className={css.stationTop}>
                      <b>{region.freq}</b>
                      <span className={css.stationLabel}>{region.label}</span>
                      <i aria-hidden='true' />
                    </span>
                    <span className={css.stationBottom} aria-hidden='true' />
                    <span className={css.stationBase} aria-hidden='true' />
                  </button>
                ))}
              </div>
            </fieldset>
            <span className='sr-only' role='status'>
              {regionStatus}
            </span>
            <section
              id='travel-sector-panel'
              className={css.stripViewport}
              aria-label={`${activeRegionMeta.label} ship-log places`}
              data-sector={activeRegionMeta.id}
            >
              <ol>
                {activeRegionSpots.map((spot) => (
                  <ContactRow
                    key={spot.code}
                    index={DESTINATIONS.indexOf(spot) + 1}
                    spot={spot}
                    tracked={spot.code === tracked.code}
                    pinLanding={pinLanding}
                    pinPoint={pinPoint}
                    onTrack={trackDestination}
                  />
                ))}
              </ol>
            </section>
          </div>
          <footer className={css.manifestFooter}>
            <span>★ HOME</span>
            <span>◆ TUNED SIGNAL</span>
            <span>● PLACE FOUND</span>
          </footer>
        </section>

        <footer className={css.scopeInstructions} id='scope-instructions'>
          <span>DRAG SKY / TURN DIALS</span>
          <span>WHEEL / PINCH / + − RANGE</span>
          <span>POINT / TAP / PICK A SIGNAL</span>
          <span>KEYS [ ] PLACE / {'{ }'} REGION / 0 HOME</span>
        </footer>

        <div className={css.firelight} aria-hidden='true' />
        {supernova.flashing && (
          <div className={css.supernova} aria-hidden='true' />
        )}
      </section>
    </Shell>
  )
}
