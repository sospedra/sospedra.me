import createGlobe from 'cobe'
import { clamp } from 'es-toolkit'
import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DESTINATIONS,
  type Destination,
  flagPaletteOf,
  HOME,
  type Visitor,
} from './destinations'
import { type LunarOrbitPoint, lunarOrbitAtVisit } from './lunar-position'

const TAU = Math.PI * 2
const EASE = 0.08
const ZOOM_EASE = 0.16
const DRIFT = 0.00135
const FOCUS_DURATION_MS = 1200
const DRAG_RADIANS_PER_PX = 1 / 140
export const TRAVEL_ZOOM_MIN = 0.82
export const TRAVEL_ZOOM_MAX = 1.2
const AUTO_ZOOM_MAX = TRAVEL_ZOOM_MAX
const HOME_ZOOM = 1.06
const ZOOM_STEP = 1.12
const WHEEL_ZOOM_RATE = 0.004
const MOMENTUM_BLEND = 0.42
const MOMENTUM_FRICTION = 0.925
const MOMENTUM_CUTOFF = 0.000004
const MOMENTUM_MAX = 0.0028
const MOMENTUM_STALE_MS = 90
// vertical drag tilts, never rolls over the poles
const TILT_LIMIT = 1.35
export const TRAVEL_PITCH_MAX = (TILT_LIMIT * 180) / Math.PI

const MARKER_ELEVATION = 0.018
const ROUTE_ARC_HEIGHT = 0.34
const ROUTE_VIEW_BIAS = 0.2
const LUNAR_DISPLAY_RADIUS = 1.08
const LUNAR_SVG_SIZE = 1000
// Cobe draws markers at the sphere radius plus the configured elevation.
// Sharing the constant keeps HTML reticles and hit testing on the WebGL dot.
const CHIP_RADIUS = 0.8 + MARKER_ELEVATION
const CHIP_HIDE_Z = 0.08
const HIT_RADIUS_FINE = 18
const HIT_RADIUS_COARSE = 24
const TAP_SLOP_FINE = 5
const TAP_SLOP_COARSE = 8
const DESKTOP_MAP_SAMPLES = 16000
const TABLET_MAP_SAMPLES = 12000
const MOBILE_MAP_SAMPLES = 8000
const TARGET_FRAME_MS = 1000 / 60
const FRAME_EARLY_TOLERANCE_MS = 0.25
const LUNAR_ORBIT_SAMPLES = 48
const LUNAR_ORBIT_FRAME_STEP = 2
const HOVER_FRAME_STEP = 6
const ZOOM_UI_INTERVAL_MS = 1000 / 30
const DIAL_IDLE_GRACE_MS = 220
const MAX_GLOBE_BACKING_PIXELS = 900_000
const MIN_RENDER_PIXEL_RATIO = 0.75

type Vec3 = [number, number, number]
type ViewRotation = {
  cosPhi: number
  cosTheta: number
  sinPhi: number
  sinTheta: number
}
type CanvasBounds = { height: number; left: number; top: number; width: number }
type PointerPoint = { x: number; y: number }
type DragSample = PointerPoint & { time: number }
type AngularVelocity = { phi: number; theta: number }
export type TravelGlobeStatus = 'loading' | 'ready' | 'unavailable'

type TravelGlobeColorway = 'classic' | 'signalscope'
type TravelGlobePalette = {
  base: Vec3
  glow: Vec3
  signal: Vec3
  visitor: Vec3
  visitorFallback: Vec3
}

const GLOBE_PALETTES: Record<TravelGlobeColorway, TravelGlobePalette> = {
  classic: {
    base: [0.14, 0.34, 0.39],
    glow: [0.024, 0.1, 0.125],
    signal: [1, 0.3, 0.76],
    visitor: [1, 1, 1],
    visitorFallback: [0.43, 0.97, 0.92],
  },
  signalscope: {
    base: [0.1, 0.34, 0.31],
    glow: [0.018, 0.085, 0.12],
    signal: [0.32, 0.7, 0.86],
    visitor: [0.75, 0.98, 0.82],
    visitorFallback: [0.35, 0.88, 0.68],
  },
}

const toAngles = (spot: Destination): [number, number] => [
  Math.PI - ((spot.lon * Math.PI) / 180 - Math.PI / 2),
  (spot.lat * Math.PI) / 180,
]

// cobe's own location-to-unit-vector mapping
const toUnitVector = (lat: number, lon: number): Vec3 => {
  const latRad = (lat * Math.PI) / 180
  const lonRad = (lon * Math.PI) / 180 - Math.PI
  const cosLat = Math.cos(latRad)
  return [
    -cosLat * Math.cos(lonRad),
    Math.sin(latRad),
    cosLat * Math.sin(lonRad),
  ]
}

const viewRotation = (phi: number, theta: number): ViewRotation => ({
  cosTheta: Math.cos(theta),
  sinTheta: Math.sin(theta),
  cosPhi: Math.cos(phi),
  sinPhi: Math.sin(phi),
})

// cobe's own view rotation, x/y are clip offsets, z faces the viewer
const rotate = (
  vec: Vec3,
  { cosPhi, cosTheta, sinPhi, sinTheta }: ViewRotation,
): Vec3 => {
  return [
    cosPhi * vec[0] + sinPhi * vec[2],
    sinPhi * sinTheta * vec[0] + cosTheta * vec[1] - cosPhi * sinTheta * vec[2],
    -sinPhi * cosTheta * vec[0] +
      sinTheta * vec[1] +
      cosPhi * cosTheta * vec[2],
  ]
}

type GlobeView = {
  phi: number
  theta: number
  zoom: number
  aspect?: number
}

const projectDestination = (
  vec: Vec3,
  view: GlobeView,
  rotation: ViewRotation,
) => {
  const [x, y, z] = rotate(vec, rotation)
  const aspect = view.aspect ?? 1
  return {
    x: ((CHIP_RADIUS * x * view.zoom) / aspect + 1) * 0.5,
    y: (1 - CHIP_RADIUS * y * view.zoom) * 0.5,
    z,
  }
}

const projectLunarPoint = (
  point: LunarOrbitPoint,
  view: GlobeView,
  rotation: ViewRotation,
) => {
  const [x, y, z] = rotate(point.vector, rotation)
  const radius = LUNAR_DISPLAY_RADIUS * point.distanceRatio
  return {
    x: (radius * x * view.zoom + 1) * 0.5,
    y: (1 - radius * y * view.zoom) * 0.5,
    z,
  }
}

const VECTORS = new Map(
  DESTINATIONS.map((spot) => [spot.code, toUnitVector(spot.lat, spot.lon)]),
)

const dot = (a: Vec3, b: Vec3): number =>
  a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]

const normalize = (vec: Vec3): Vec3 => {
  const length = Math.hypot(...vec)
  return length > 0 ? [vec[0] / length, vec[1] / length, vec[2] / length] : vec
}

const anglesForVector = (vec: Vec3): [number, number] => {
  const latitude = Math.asin(clamp(vec[1], -1, 1))
  const longitude = Math.atan2(-vec[2], vec[0])
  return [Math.PI * 1.5 - longitude, latitude]
}

/* Centers the great-circle midpoint and picks the tightest safe scale that
   keeps home, destination and the raised route inside the sphere. */
const routeFrameFor = (
  tracked: Destination,
): { focus: [number, number]; zoom: number } => {
  if (tracked.home) return { focus: toAngles(HOME), zoom: HOME_ZOOM }

  const homeVector = VECTORS.get(HOME.code) ?? toUnitVector(HOME.lat, HOME.lon)
  const targetVector =
    VECTORS.get(tracked.code) ?? toUnitVector(tracked.lat, tracked.lon)
  const midpoint = normalize([
    homeVector[0] + targetVector[0],
    homeVector[1] + targetVector[1],
    homeVector[2] + targetVector[2],
  ])
  // Looking straight down the midpoint flattens Cobe's raised Bezier; a small
  // route-normal bias keeps endpoint depth equal while revealing arc height.
  const routeNormal = normalize(cross(homeVector, targetVector))
  const view = normalize([
    midpoint[0] + routeNormal[0] * ROUTE_VIEW_BIAS,
    midpoint[1] + routeNormal[1] * ROUTE_VIEW_BIAS,
    midpoint[2] + routeNormal[2] * ROUTE_VIEW_BIAS,
  ])
  const endpointSpan = Math.acos(clamp(dot(view, homeVector), -1, 1))
  const halfSpan = Math.max(0.01, Math.sin(endpointSpan))
  // 0.72 leaves room for the raised arc, marker reticles and their labels.
  const zoom = clamp(
    0.72 / (CHIP_RADIUS * halfSpan),
    TRAVEL_ZOOM_MIN,
    AUTO_ZOOM_MAX,
  )

  return { focus: anglesForVector(view), zoom }
}

// eases along the shortest arc, phi wraps at 2π
const stepAngle = (current: number, target: number, ease: number): number => {
  const forward = (target - current + TAU) % TAU
  if (forward < Math.PI) return current + forward * ease
  return current - (TAU - forward) * ease
}

const viewLongitude = (phi: number): number =>
  (((270 - (phi * 180) / Math.PI) % 360) + 360) % 360

const clampZoom = (zoom: number, maxZoom = TRAVEL_ZOOM_MAX): number =>
  clamp(zoom, TRAVEL_ZOOM_MIN, maxZoom)

const clampTheta = (theta: number): number =>
  clamp(theta, -TILT_LIMIT, TILT_LIMIT)

const clampMomentum = (value: number): number =>
  clamp(value, -MOMENTUM_MAX, MOMENTUM_MAX)

const blendMomentum = (previous: number, instant: number): number =>
  previous * (1 - MOMENTUM_BLEND) + instant * MOMENTUM_BLEND

const mapSamplesForSize = (size: number): number => {
  if (size <= 480) return MOBILE_MAP_SAMPLES
  if (size <= 800) return TABLET_MAP_SAMPLES
  return DESKTOP_MAP_SAMPLES
}

const renderPixelRatioForSize = (
  size: { height: number; width: number },
  pixelRatioCap: number,
): number => {
  const deviceRatio = Math.min(window.devicePixelRatio || 1, pixelRatioCap)
  const pixelBudgetRatio = Math.sqrt(
    MAX_GLOBE_BACKING_PIXELS / (size.width * size.height),
  )
  return clamp(pixelBudgetRatio, MIN_RENDER_PIXEL_RATIO, deviceRatio)
}

const supportsWebGL = (): boolean => {
  try {
    const probe = document.createElement('canvas')
    return Boolean(probe.getContext('webgl2') ?? probe.getContext('webgl'))
  } catch {
    return false
  }
}

const cancelHoverFrame = (hoverFrame: { current: number | null }) => {
  if (hoverFrame.current === null) return
  cancelAnimationFrame(hoverFrame.current)
  hoverFrame.current = null
}

const pinchDistance = (points: Map<number, PointerPoint>): number => {
  const [a, b] = [...points.values()]
  return Math.hypot(a.x - b.x, a.y - b.y)
}

const hexToVec = (hex: string): Vec3 => {
  const value = Number.parseInt(hex.slice(1), 16)
  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ]
}

const visitorMarkers = (
  visitor: Visitor | null,
  palette: TravelGlobePalette,
  scale = 1,
) => {
  if (!visitor) return []
  const location = [visitor.lat, visitor.lon] as [number, number]
  const visitorColor = visitor.country
    ? hexToVec(flagPaletteOf(visitor.country)[0])
    : palette.visitorFallback
  return [
    { location, size: 0.055 * scale, color: palette.visitor },
    { location, size: 0.028 * scale, color: visitorColor },
  ]
}

const buildMarkers = (
  tracked: Destination,
  visitor: Visitor | null,
  palette: TravelGlobePalette,
  visitorScale = 1,
) => [
  ...DESTINATIONS.flatMap((spot) => {
    const location = [spot.lat, spot.lon] as [number, number]
    const [primary, secondary] = flagPaletteOf(spot.country).map(hexToVec)
    const activeScale = spot.code === tracked.code ? 1.5 : 1
    return [
      {
        location,
        size: 0.023 * activeScale,
        color: secondary,
      },
      { location, size: 0.01 * activeScale, color: primary },
    ]
  }),
  ...visitorMarkers(visitor, palette, visitorScale),
]

const buildArcs = (tracked: Destination, palette: TravelGlobePalette) =>
  tracked.home
    ? []
    : [
        {
          from: [HOME.lat, HOME.lon] as [number, number],
          to: [tracked.lat, tracked.lon] as [number, number],
          color: palette.signal,
        },
      ]

type TravelMoonLayerRefs = {
  body: React.RefObject<SVGGElement | null>
  label: React.RefObject<SVGTextElement | null>
  orbit?: React.RefObject<SVGPathElement | null>
  svg: React.RefObject<SVGSVGElement | null>
}

export type TravelMoonRefs = {
  back: TravelMoonLayerRefs
  front: TravelMoonLayerRefs
}

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
  const compassHeadingRef = useRef<HTMLOutputElement>(null)
  const compassLatitudeRef = useRef<HTMLOutputElement>(null)
  const compassReadoutRef = useRef({ heading: -1, latitude: Number.NaN })
  const dialControlCountRef = useRef(0)
  const dialIdleUntilRef = useRef(0)
  const initialLongitude = viewLongitude(focusRef.current[0])
  const orbitKnobStateRef = useRef({
    angle: -initialLongitude,
    raw: initialLongitude,
  })
  const initialMarkersRef = useRef(
    buildMarkers(tracked, visitor, palette, visitorMarkerScale),
  )
  const initialArcsRef = useRef(buildArcs(tracked, palette))
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

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    quietRef.current = quiet
    if (quiet) velocityRef.current = { phi: 0, theta: 0 }
  }, [quiet])

  useEffect(() => {
    const frame = routeFrameFor(tracked)
    focusRef.current = frame.focus
    zoomTargetRef.current = frame.zoom
    publishZoomLevel(frame.zoom, true)
    velocityRef.current = { phi: 0, theta: 0 }
    const isInitialHome = !hasAppliedTrackedRef.current && tracked.home
    focusTimeRef.current = isInitialHome ? 0 : FOCUS_DURATION_MS
    hasAppliedTrackedRef.current = true
  }, [publishZoomLevel, tracked])

  useEffect(
    () => () => {
      if (zoomUiTimerRef.current !== null) {
        clearTimeout(zoomUiTimerRef.current)
      }
    },
    [],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    setStatus('loading')
    if (!supportsWebGL()) {
      setStatus('unavailable')
      return
    }

    const viewport = canvas.parentElement ?? canvas
    const measureCanvasBounds = () => {
      const rect = canvas.getBoundingClientRect()
      canvasRectRef.current = {
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height,
      }
    }
    const fitCanvas = (box: { width: number; height: number }) => {
      const width = Math.floor(box.width)
      const height = Math.floor(box.height)
      if (canvasFit === 'viewport') return { width, height }
      const side = Math.min(width, height)
      return { width: side, height: side }
    }
    const applyCanvasSize = (size: { width: number; height: number }) => {
      canvas.style.width = `${size.width}px`
      canvas.style.height = `${size.height}px`
      const lunarSide = Math.min(size.width, size.height)
      for (const layer of [moonRef.current?.back, moonRef.current?.front]) {
        const svg = layer?.svg.current
        if (!svg) continue
        svg.style.width = `${lunarSide}px`
        svg.style.height = `${lunarSide}px`
      }
    }
    let renderSize = fitCanvas(viewport.getBoundingClientRect())
    if (renderSize.width <= 0 || renderSize.height <= 0) {
      renderSize = { width: 600, height: 600 }
    }
    applyCanvasSize(renderSize)
    let pendingSize: { width: number; height: number } | null = null
    const observer = new ResizeObserver(([entry]) => {
      const next = fitCanvas(entry.contentRect)
      if (
        next.width <= 0 ||
        next.height <= 0 ||
        (next.width === renderSize.width && next.height === renderSize.height)
      )
        return
      applyCanvasSize(next)
      renderSize = next
      pendingSize = next
      measureCanvasBounds()
    })
    observer.observe(viewport)

    const renderPixelRatio = renderPixelRatioForSize(
      renderSize,
      resolvedPixelRatioCap,
    )
    const stylesBeforeGlobe = new Set(
      document.head.querySelectorAll<HTMLStyleElement>('style'),
    )
    let globe: ReturnType<typeof createGlobe>
    try {
      globe = createGlobe(canvas, {
        devicePixelRatio: renderPixelRatio,
        width: renderSize.width,
        height: renderSize.height,
        phi: phiRef.current,
        theta: thetaRef.current,
        dark: 1,
        diffuse: 1.68,
        mapSamples: mapSamplesForSize(
          Math.min(renderSize.width, renderSize.height),
        ),
        mapBrightness: 9,
        mapBaseBrightness: 0.018,
        baseColor: palette.base,
        markerColor: palette.signal,
        glowColor: palette.glow,
        markers: initialMarkersRef.current,
        arcs: initialArcsRef.current,
        arcColor: palette.signal,
        arcWidth: 0.76,
        arcHeight: ROUTE_ARC_HEIGHT,
        markerElevation: MARKER_ELEVATION,
        context: {
          antialias: true,
          desynchronized: true,
          powerPreference: 'high-performance',
        },
      })
    } catch {
      observer.disconnect()
      setStatus('unavailable')
      return
    }

    // Cobe 2.0.1 maintains CSS anchors for optional marker IDs. This globe
    // does not use IDs, so leaving its empty style node connected would force
    // a global style invalidation on every update.
    for (const style of document.head.querySelectorAll<HTMLStyleElement>(
      'style',
    )) {
      if (
        !stylesBeforeGlobe.has(style) &&
        style.textContent?.trim() === ':root{}'
      ) {
        style.remove()
      }
    }

    globeRef.current = globe
    measureCanvasBounds()
    canvas.dataset.ready = 'true'
    canvas.dataset.renderMode = canvasFit
    canvas.dataset.renderPixelRatio = renderPixelRatio.toFixed(2)
    setStatus('ready')

    // React's root wheel listener is passive, so preventDefault needs a
    // manual non-passive one
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return
      const nextZoom = clampZoom(
        zoomTargetRef.current * Math.exp(-event.deltaY * WHEEL_ZOOM_RATE),
        resolvedZoomMax,
      )
      if (nextZoom === zoomTargetRef.current) return
      event.preventDefault()
      zoomTargetRef.current = nextZoom
      publishZoomLevel(nextZoom)
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })

    let lastFrameTime = performance.now()

    const stepFrame = (now: number) => {
      const elapsed = clamp(now - lastFrameTime, 1, 32)
      lastFrameTime = now
      if (
        grabRef.current !== null ||
        pinchRef.current ||
        dialControlCountRef.current > 0 ||
        now < dialIdleUntilRef.current
      )
        return

      const [targetPhi, targetTheta] = focusRef.current
      const frameFactor = elapsed / TARGET_FRAME_MS
      const ease = quietRef.current ? 1 : 1 - (1 - EASE) ** frameFactor
      if (focusTimeRef.current > 0) {
        focusTimeRef.current = Math.max(0, focusTimeRef.current - elapsed)
        phiRef.current = stepAngle(phiRef.current, targetPhi, ease)
        thetaRef.current += (targetTheta - thetaRef.current) * ease
        return
      }

      if (quietRef.current) return

      phiRef.current += DRIFT * frameFactor
      const velocity = velocityRef.current
      if (
        Math.abs(velocity.phi) > MOMENTUM_CUTOFF ||
        Math.abs(velocity.theta) > MOMENTUM_CUTOFF
      ) {
        phiRef.current += velocity.phi * elapsed
        thetaRef.current = clampTheta(
          thetaRef.current + velocity.theta * elapsed,
        )
        const decay = MOMENTUM_FRICTION ** (elapsed / TARGET_FRAME_MS)
        velocity.phi *= decay
        velocity.theta *= decay
        return
      }

      velocityRef.current = { phi: 0, theta: 0 }
    }

    let frame: number | null = null
    let isIntersecting = true
    let isPageVisible = document.visibilityState === 'visible'
    let contextAvailable = true

    const shouldRender = () =>
      isIntersecting && isPageVisible && contextAvailable

    const hasLunarOrbit = Boolean(
      moonRef.current?.back.orbit?.current ||
        moonRef.current?.front.orbit?.current,
    )
    const lunarVisit = lunarOrbitAtVisit(
      new Date(),
      hasLunarOrbit ? LUNAR_ORBIT_SAMPLES : 1,
    )
    for (const layer of [moonRef.current?.back, moonRef.current?.front]) {
      const svg = layer?.svg.current
      if (!svg) continue
      svg.dataset.observedAt = lunarVisit.observedAt
      svg.dataset.sublunarLatitude = lunarVisit.sublunarLatitude.toFixed(4)
      svg.dataset.sublunarLongitude = lunarVisit.sublunarLongitude.toFixed(4)
      svg.dataset.distanceKm = lunarVisit.distanceKm.toFixed(0)
    }

    let moonIsFront: boolean | null = null
    let moonLabelOnLeft: boolean | null = null
    const updateMoon = (view: GlobeView, updateOrbit: boolean) => {
      const back = moonRef.current?.back
      const front = moonRef.current?.front
      if (!back || !front) return
      const rotation = viewRotation(view.phi, view.theta)

      if (hasLunarOrbit && updateOrbit) {
        let backPath = ''
        let frontPath = ''
        let previous: { front: boolean; x: number; y: number } | undefined

        for (const point of lunarVisit.orbit) {
          const projected = projectLunarPoint(point, view, rotation)
          const next = {
            front: projected.z >= 0,
            x: projected.x * LUNAR_SVG_SIZE,
            y: projected.y * LUNAR_SVG_SIZE,
          }
          const coordinate = `${next.x.toFixed(1)} ${next.y.toFixed(1)}`

          if (!previous) {
            if (next.front) frontPath = `M ${coordinate}`
            else backPath = `M ${coordinate}`
            previous = next
            continue
          }

          if (previous.front === next.front) {
            if (next.front) frontPath += ` L ${coordinate}`
            else backPath += ` L ${coordinate}`
          } else {
            const previousCoordinate = `${previous.x.toFixed(1)} ${previous.y.toFixed(1)}`
            if (previous.front) {
              frontPath += ` L ${coordinate}`
              backPath += ` M ${previousCoordinate} L ${coordinate}`
            } else {
              backPath += ` L ${coordinate}`
              frontPath += ` M ${previousCoordinate} L ${coordinate}`
            }
          }
          previous = next
        }

        back.orbit?.current?.setAttribute('d', backPath)
        front.orbit?.current?.setAttribute('d', frontPath)
      }

      const current = projectLunarPoint(lunarVisit.current, view, rotation)
      const isFront = current.z >= 0
      const labelOnLeft = current.x > 0.5
      if (moonLabelOnLeft !== labelOnLeft) {
        for (const layer of [back, front]) {
          const label = layer.label.current
          if (!label) continue
          label.setAttribute('x', labelOnLeft ? '-12' : '12')
          label.setAttribute('text-anchor', labelOnLeft ? 'end' : 'start')
        }
        moonLabelOnLeft = labelOnLeft
      }
      const body = isFront ? front.body.current : back.body.current
      const transform = `translate(${(current.x * LUNAR_SVG_SIZE).toFixed(
        1,
      )} ${(current.y * LUNAR_SVG_SIZE).toFixed(
        1,
      )}) scale(${view.zoom.toFixed(3)})`
      body?.setAttribute('transform', transform)
      if (moonIsFront !== isFront) {
        body?.setAttribute('opacity', '1')
        const hiddenBody = isFront ? back.body.current : front.body.current
        hiddenBody?.setAttribute('opacity', '0')
        moonIsFront = isFront
      }
    }

    const updateCompass = (view: GlobeView) => {
      const card = compassRef.current
      if (!card) return

      const longitude = viewLongitude(view.phi)
      const latitude = clamp((view.theta * 180) / Math.PI, -90, 90)
      card.style.transform = `rotate(${(-longitude).toFixed(2)}deg)`

      const orbitKnob = orbitKnobStateRef.current
      const longitudeDelta = ((longitude - orbitKnob.raw + 540) % 360) - 180
      orbitKnob.angle -= longitudeDelta
      orbitKnob.raw = longitude
      orbitKnobRef.current?.style.setProperty(
        '--range-angle',
        `${orbitKnob.angle.toFixed(2)}deg`,
      )
      pitchKnobRef.current?.style.setProperty(
        '--range-angle',
        `${(-latitude).toFixed(2)}deg`,
      )

      const heading = Math.round(longitude) % 360
      const roundedLatitude = Math.round(latitude)
      const previous = compassReadoutRef.current
      if (heading !== previous.heading) {
        compassHeadingRef.current?.replaceChildren(
          `${String(heading).padStart(3, '0')}°`,
        )
        orbitControlRef.current?.setAttribute('aria-valuenow', String(heading))
        orbitControlRef.current?.setAttribute(
          'aria-valuetext',
          `${String(heading).padStart(3, '0')} degrees heading`,
        )
        previous.heading = heading
      }
      if (roundedLatitude !== previous.latitude) {
        const sign = roundedLatitude >= 0 ? '+' : '−'
        compassLatitudeRef.current?.replaceChildren(
          `${sign}${String(Math.abs(roundedLatitude)).padStart(2, '0')}°`,
        )
        pitchControlRef.current?.setAttribute(
          'aria-valuenow',
          String(roundedLatitude),
        )
        pitchControlRef.current?.setAttribute(
          'aria-valuetext',
          roundedLatitude === 0
            ? '0 degrees, equator'
            : `${Math.abs(roundedLatitude)} degrees ${
                roundedLatitude > 0 ? 'north' : 'south'
              }`,
        )
        previous.latitude = roundedLatitude
      }
    }

    let hoverTick = 0
    let lunarFrame = 0
    let lastRenderTime = performance.now() - TARGET_FRAME_MS
    const tick = (now: number) => {
      frame = null
      if (!shouldRender()) return
      const renderElapsed = now - lastRenderTime
      if (renderElapsed < TARGET_FRAME_MS - FRAME_EARLY_TOLERANCE_MS) {
        frame = requestAnimationFrame(tick)
        return
      }
      lastRenderTime =
        renderElapsed < TARGET_FRAME_MS
          ? now
          : now - (renderElapsed % TARGET_FRAME_MS)
      stepFrame(now)
      const zoomEase = quietRef.current ? 1 : ZOOM_EASE
      zoomRef.current += (zoomTargetRef.current - zoomRef.current) * zoomEase
      const didResize = pendingSize !== null
      const resize =
        pendingSize === null
          ? {}
          : {
              width: pendingSize.width,
              height: pendingSize.height,
              mapSamples: mapSamplesForSize(
                Math.min(pendingSize.width, pendingSize.height),
              ),
            }
      pendingSize = null
      const phi = phiRef.current + dragRef.current
      const theta = thetaRef.current + tiltRef.current
      const view = {
        phi,
        theta,
        zoom: zoomRef.current,
        aspect: renderSize.width / renderSize.height,
      }
      hoverTick = (hoverTick + 1) % HOVER_FRAME_STEP
      if (hoverTick === 0) {
        if (pointersRef.current.size === 0) refreshHoverRef.current?.()
      }
      globe.update({ phi, theta, scale: view.zoom, ...resize })
      updateCompass(view)
      updateMoon(view, didResize || lunarFrame % LUNAR_ORBIT_FRAME_STEP === 0)
      lunarFrame = (lunarFrame + 1) % LUNAR_ORBIT_FRAME_STEP
      frame = requestAnimationFrame(tick)
    }

    const syncRenderLoop = () => {
      if (shouldRender()) {
        if (frame === null) frame = requestAnimationFrame(tick)
        return
      }
      if (frame !== null) cancelAnimationFrame(frame)
      frame = null
    }

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      isIntersecting = entry?.isIntersecting ?? true
      syncRenderLoop()
    })
    intersectionObserver.observe(canvas)

    const onVisibilityChange = () => {
      isPageVisible = document.visibilityState === 'visible'
      syncRenderLoop()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    const onContextLost = (event: Event) => {
      event.preventDefault()
      contextAvailable = false
      delete canvas.dataset.ready
      setStatus('unavailable')
      syncRenderLoop()
    }
    canvas.addEventListener('webglcontextlost', onContextLost)

    syncRenderLoop()

    return () => {
      if (frame !== null) cancelAnimationFrame(frame)
      observer.disconnect()
      intersectionObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('webglcontextlost', onContextLost)
      cancelHoverFrame(hoverFrameRef)
      delete canvas.dataset.ready
      delete canvas.dataset.hovered
      delete canvas.dataset.renderMode
      delete canvas.dataset.renderPixelRatio
      canvasRectRef.current = null
      globe.destroy()
      globeRef.current = null
    }
  }, [
    canvasFit,
    palette,
    publishZoomLevel,
    resolvedPixelRatioCap,
    resolvedZoomMax,
  ])

  useEffect(() => {
    globeRef.current?.update({
      markers: buildMarkers(tracked, visitor, palette, visitorMarkerScale),
      arcs: buildArcs(tracked, palette),
    })
  }, [palette, tracked, visitor, visitorMarkerScale])

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

  const applyZoom = (value: number) => {
    const nextZoom = clampZoom(value, resolvedZoomMax)
    zoomTargetRef.current = nextZoom
    publishZoomLevel(nextZoom)
  }

  const nudgeAxis = (value: number, apply: (value: number) => void) => {
    if (!Number.isFinite(value) || pointersRef.current.size > 0) return
    focusTimeRef.current = 0
    velocityRef.current = { phi: 0, theta: 0 }
    apply(value)
    dialIdleUntilRef.current = performance.now() + DIAL_IDLE_GRACE_MS
  }

  const orbitBy = (knobDelta: number) => {
    if (Math.abs(knobDelta) < 0.001) return
    nudgeAxis(knobDelta, (delta) => {
      phiRef.current =
        (((phiRef.current + (delta * Math.PI) / 180) % TAU) + TAU) % TAU
    })
  }

  const orbitTo = (heading: number) =>
    nudgeAxis(heading, (value) => {
      const normalized = ((value % 360) + 360) % 360
      phiRef.current = (((270 - normalized) * Math.PI) / 180 + TAU) % TAU
    })

  const pitchBy = (knobDelta: number) => {
    if (Math.abs(knobDelta) < 0.001) return
    nudgeAxis(knobDelta, (delta) => {
      thetaRef.current = clampTheta(thetaRef.current - (delta * Math.PI) / 180)
    })
  }

  const pitchTo = (latitude: number) =>
    nudgeAxis(latitude, (value) => {
      thetaRef.current = clampTheta((value * Math.PI) / 180)
    })

  const setDialControlActive = (active: boolean) => {
    dialControlCountRef.current = Math.max(
      0,
      dialControlCountRef.current + (active ? 1 : -1),
    )
    velocityRef.current = { phi: 0, theta: 0 }
    if (dialControlCountRef.current > 0) {
      focusTimeRef.current = 0
      dialIdleUntilRef.current = Number.POSITIVE_INFINITY
      return
    }
    dialIdleUntilRef.current = performance.now() + DIAL_IDLE_GRACE_MS
  }

  const zoomIn = () => applyZoom(zoomTargetRef.current * ZOOM_STEP)
  const zoomOut = () => applyZoom(zoomTargetRef.current / ZOOM_STEP)

  return {
    status,
    zoomLevel,
    canvasRef,
    orbitControlRef,
    orbitKnobRef,
    pitchControlRef,
    pitchKnobRef,
    compassRef,
    compassHeadingRef,
    compassLatitudeRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onPointerLeave,
    orbitBy,
    orbitTo,
    pitchBy,
    pitchTo,
    setDialControlActive,
    zoomIn,
    zoomOut,
  }
}
