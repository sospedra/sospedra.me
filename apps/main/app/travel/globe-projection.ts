import { clamp } from 'es-toolkit'
import { DESTINATIONS, type Destination, HOME } from './destinations'
import type { LunarOrbitPoint } from './lunar-position'

export const TAU = Math.PI * 2
export const TRAVEL_ZOOM_MIN = 0.82
export const TRAVEL_ZOOM_MAX = 1.2
const AUTO_ZOOM_MAX = TRAVEL_ZOOM_MAX
const HOME_ZOOM = 1.06
const MOMENTUM_BLEND = 0.42
const MOMENTUM_MAX = 0.0028
// vertical drag tilts, never rolls over the poles
const TILT_LIMIT = 1.35
export const TRAVEL_PITCH_MAX = (TILT_LIMIT * 180) / Math.PI

export const MARKER_ELEVATION = 0.018
const ROUTE_VIEW_BIAS = 0.2
const LUNAR_DISPLAY_RADIUS = 1.08
// Cobe draws markers at the sphere radius plus the configured elevation.
// Sharing the constant keeps HTML reticles and hit testing on the WebGL dot.
const CHIP_RADIUS = 0.8 + MARKER_ELEVATION

export type Vec3 = [number, number, number]
export type ViewRotation = {
  cosPhi: number
  cosTheta: number
  sinPhi: number
  sinTheta: number
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

export const viewRotation = (phi: number, theta: number): ViewRotation => ({
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

export type GlobeView = {
  phi: number
  theta: number
  zoom: number
  aspect?: number
}

export const projectDestination = (
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

export const projectLunarPoint = (
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

export const VECTORS = new Map(
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
export const routeFrameFor = (
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
export const stepAngle = (
  current: number,
  target: number,
  ease: number,
): number => {
  const forward = (target - current + TAU) % TAU
  if (forward < Math.PI) return current + forward * ease
  return current - (TAU - forward) * ease
}

export const viewLongitude = (phi: number): number =>
  (((270 - (phi * 180) / Math.PI) % 360) + 360) % 360

export const clampZoom = (zoom: number, maxZoom = TRAVEL_ZOOM_MAX): number =>
  clamp(zoom, TRAVEL_ZOOM_MIN, maxZoom)

export const clampTheta = (theta: number): number =>
  clamp(theta, -TILT_LIMIT, TILT_LIMIT)

export const clampMomentum = (value: number): number =>
  clamp(value, -MOMENTUM_MAX, MOMENTUM_MAX)

export const blendMomentum = (previous: number, instant: number): number =>
  previous * (1 - MOMENTUM_BLEND) + instant * MOMENTUM_BLEND
