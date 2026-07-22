import createGlobe from 'cobe'
import { clamp } from 'es-toolkit'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import {
  DESTINATIONS,
  type Destination,
  flagPaletteOf,
  HOME,
  type Visitor,
} from './destinations'

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

const MARKER_ELEVATION = 0.018
const ROUTE_ARC_HEIGHT = 0.34
const ROUTE_VIEW_BIAS = 0.2
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

type Vec3 = [number, number, number]
type PointerPoint = { x: number; y: number }
type DragSample = PointerPoint & { time: number }
type AngularVelocity = { phi: number; theta: number }
export type TravelGlobeStatus = 'loading' | 'ready' | 'unavailable'

const BASE_COLOR: Vec3 = [0.14, 0.34, 0.39]
const GLOW_COLOR: Vec3 = [0.024, 0.1, 0.125]
const DOT_PINK: Vec3 = [1, 0.3, 0.76]
const DOT_PHOSPHOR: Vec3 = [0.43, 0.97, 0.92]
const DOT_VISITOR: Vec3 = [1, 1, 1]

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

// cobe's own view rotation, x/y are clip offsets, z faces the viewer
const rotate = (vec: Vec3, phi: number, theta: number): Vec3 => {
  const cosT = Math.cos(theta)
  const sinT = Math.sin(theta)
  const cosP = Math.cos(phi)
  const sinP = Math.sin(phi)
  return [
    cosP * vec[0] + sinP * vec[2],
    sinP * sinT * vec[0] + cosT * vec[1] - cosP * sinT * vec[2],
    -sinP * cosT * vec[0] + sinT * vec[1] + cosP * cosT * vec[2],
  ]
}

type GlobeView = { phi: number; theta: number; zoom: number }

const projectDestination = (vec: Vec3, view: GlobeView) => {
  const [x, y, z] = rotate(vec, view.phi, view.theta)
  return {
    x: (CHIP_RADIUS * x * view.zoom + 1) * 0.5,
    y: (1 - CHIP_RADIUS * y * view.zoom) * 0.5,
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

const clampZoom = (zoom: number): number =>
  clamp(zoom, TRAVEL_ZOOM_MIN, TRAVEL_ZOOM_MAX)

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

const visitorMarkers = (visitor: Visitor | null) => {
  if (!visitor) return []
  const location = [visitor.lat, visitor.lon] as [number, number]
  const visitorColor = visitor.country
    ? hexToVec(flagPaletteOf(visitor.country)[0])
    : DOT_PHOSPHOR
  return [
    { location, size: 0.055, color: DOT_VISITOR },
    { location, size: 0.028, color: visitorColor },
  ]
}

const buildMarkers = (tracked: Destination, visitor: Visitor | null) => [
  ...DESTINATIONS.flatMap((spot) => {
    const location = [spot.lat, spot.lon] as [number, number]
    const [primary, secondary] = flagPaletteOf(spot.country).map(hexToVec)
    const activeScale = spot.code === tracked.code ? 1.5 : 1
    return [
      {
        id: spot.code,
        location,
        size: 0.023 * activeScale,
        color: secondary,
      },
      { location, size: 0.01 * activeScale, color: primary },
    ]
  }),
  ...visitorMarkers(visitor),
]

const buildArcs = (tracked: Destination) =>
  tracked.home
    ? []
    : [
        {
          from: [HOME.lat, HOME.lon] as [number, number],
          to: [tracked.lat, tracked.lon] as [number, number],
          color: DOT_PINK,
        },
      ]

type TravelGlobeOptions = {
  tracked: Destination
  quiet: boolean
  visitor: Visitor | null
  onSelect: (spot: Destination) => void
}

export function useTravelGlobe({
  tracked,
  quiet,
  visitor,
  onSelect,
}: TravelGlobeOptions) {
  const initialFrameRef = useRef(routeFrameFor(tracked))
  const [status, setStatus] = useState<TravelGlobeStatus>('loading')
  const [zoomLevel, setZoomLevel] = useState(initialFrameRef.current.zoom)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const globeRef = useRef<ReturnType<typeof createGlobe> | null>(null)
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
  const pointersRef = useRef(new Map<number, PointerPoint>())
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null)
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
  const initialMarkersRef = useRef(buildMarkers(tracked, visitor))
  const initialArcsRef = useRef(buildArcs(tracked))

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
    setZoomLevel(frame.zoom)
    velocityRef.current = { phi: 0, theta: 0 }
    const isInitialHome = !hasAppliedTrackedRef.current && tracked.home
    focusTimeRef.current = isInitialHome ? 0 : FOCUS_DURATION_MS
    hasAppliedTrackedRef.current = true
  }, [tracked])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    setStatus('loading')
    if (!supportsWebGL()) {
      setStatus('unavailable')
      return
    }

    const size = canvas.offsetWidth || 600
    let pendingSize: number | null = null
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) pendingSize = entry.contentRect.width
    })
    observer.observe(canvas)

    let globe: ReturnType<typeof createGlobe>
    try {
      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width: size,
        height: size,
        phi: phiRef.current,
        theta: thetaRef.current,
        dark: 1,
        diffuse: 1.68,
        mapSamples: mapSamplesForSize(size),
        mapBrightness: 9,
        mapBaseBrightness: 0.018,
        baseColor: BASE_COLOR,
        markerColor: DOT_PINK,
        glowColor: GLOW_COLOR,
        markers: initialMarkersRef.current,
        arcs: initialArcsRef.current,
        arcColor: DOT_PINK,
        arcWidth: 0.76,
        arcHeight: ROUTE_ARC_HEIGHT,
        markerElevation: MARKER_ELEVATION,
      })
    } catch {
      observer.disconnect()
      setStatus('unavailable')
      return
    }
    globeRef.current = globe
    canvas.dataset.ready = 'true'
    setStatus('ready')

    // React's root wheel listener is passive, so preventDefault needs a
    // manual non-passive one
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return
      const nextZoom = clampZoom(
        zoomTargetRef.current * Math.exp(-event.deltaY * WHEEL_ZOOM_RATE),
      )
      if (nextZoom === zoomTargetRef.current) return
      event.preventDefault()
      zoomTargetRef.current = nextZoom
      setZoomLevel(nextZoom)
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })

    let lastFrameTime = performance.now()

    const stepFrame = (now: number) => {
      const elapsed = clamp(now - lastFrameTime, 1, 32)
      lastFrameTime = now
      if (grabRef.current !== null || pinchRef.current) return

      const [targetPhi, targetTheta] = focusRef.current
      const frameFactor = elapsed / (1000 / 60)
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
        const decay = MOMENTUM_FRICTION ** (elapsed / (1000 / 60))
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

    let hoverTick = 0
    const tick = (now: number) => {
      frame = null
      if (!shouldRender()) return
      stepFrame(now)
      const zoomEase = quietRef.current ? 1 : ZOOM_EASE
      zoomRef.current += (zoomTargetRef.current - zoomRef.current) * zoomEase
      const resize =
        pendingSize === null
          ? {}
          : {
              width: pendingSize,
              height: pendingSize,
              mapSamples: mapSamplesForSize(pendingSize),
            }
      pendingSize = null
      const phi = phiRef.current + dragRef.current
      const theta = thetaRef.current + tiltRef.current
      globe.update({ phi, theta, scale: zoomRef.current, ...resize })
      hoverTick = (hoverTick + 1) % 3
      if (hoverTick === 0 && pointersRef.current.size === 0) {
        refreshHoverRef.current?.()
      }
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
      globe.destroy()
      globeRef.current = null
    }
  }, [])

  useEffect(() => {
    globeRef.current?.update({
      markers: buildMarkers(tracked, visitor),
      arcs: buildArcs(tracked),
    })
  }, [tracked, visitor])

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
    const rect = canvas.getBoundingClientRect()
    const localX = clientX - rect.left
    const localY = clientY - rect.top
    const hitRadius = coarse ? HIT_RADIUS_COARSE : HIT_RADIUS_FINE
    const view = {
      phi: phiRef.current + dragRef.current,
      theta: thetaRef.current + tiltRef.current,
      zoom: zoomRef.current,
    }
    let nearest: Destination | null = null
    let nearestDistance = hitRadius
    let nearestDepth = Number.NEGATIVE_INFINITY

    // runs on the hover rAF cadence; a plain min-scan avoids per-frame allocations
    for (const spot of DESTINATIONS) {
      const vec = VECTORS.get(spot.code)
      if (!vec) continue
      const { x, y, z } = projectDestination(vec, view)
      if (z < CHIP_HIDE_Z) continue
      const markerX = x * rect.width
      const markerY = y * rect.height
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

  refreshHoverRef.current = refreshHover

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
        dist: pinchDistance(pointers),
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
      const ratio = pinchDistance(pointersRef.current) / pinch.dist
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
    const nextZoom = clampZoom(value)
    zoomTargetRef.current = nextZoom
    setZoomLevel(nextZoom)
  }

  const zoomIn = () => applyZoom(zoomTargetRef.current * ZOOM_STEP)
  const zoomOut = () => applyZoom(zoomTargetRef.current / ZOOM_STEP)
  const setZoom = applyZoom

  return {
    status,
    zoomLevel,
    canvasRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onPointerLeave,
    zoomIn,
    zoomOut,
    setZoom,
  }
}
