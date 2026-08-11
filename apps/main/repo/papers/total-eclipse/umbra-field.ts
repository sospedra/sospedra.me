/**
 * Turns the shadow engine into map layers: an obscuration grid per country
 * frame, the band outline, and the answer to the only question a reader outside
 * the band asks. How far do I have to drive.
 */

import { contours } from 'd3-contour'
import { bearingFrom, compassPoint, greatCircleKm } from './local-format.ts'
import type { ShadowEngine } from './shadow-engine.ts'

export type FrameBox = [number, number, number, number]

export const GRID_COLUMNS = 96
export const GRID_ROWS = 68

export type UmbraField = {
  /** Fraction of the sun covered at maximum, row-major from the top edge. */
  obscuration: Float64Array
  /** Signed umbra margin, positive inside the band. */
  margin: Float64Array
}

export type MultiPolygonGeometry = {
  type: 'MultiPolygon'
  coordinates: [number, number][][][]
}

/**
 * Each cell warm-starts the time-of-maximum search from its left neighbour, so
 * a 96x68 frame resolves in one frame instead of blocking for a second.
 */
export const computeField = (
  engine: ShadowEngine,
  box: FrameBox,
): UmbraField => {
  const [west, south, east, north] = box
  const obscuration = new Float64Array(GRID_COLUMNS * GRID_ROWS)
  const margin = new Float64Array(GRID_COLUMNS * GRID_ROWS)
  for (let row = 0; row < GRID_ROWS; row += 1) {
    const latitude = north - ((row + 0.5) * (north - south)) / GRID_ROWS
    let hint: number | undefined
    for (let column = 0; column < GRID_COLUMNS; column += 1) {
      const longitude = west + ((column + 0.5) * (east - west)) / GRID_COLUMNS
      const site = engine.siteAt(latitude, longitude)
      const maximum = engine.maximumTime(site, hint)
      hint = maximum
      const moment = engine.instantAt(site, maximum)
      obscuration[row * GRID_COLUMNS + column] = moment.obscuration
      margin[row * GRID_COLUMNS + column] = engine.bandMargin(moment)
    }
  }
  return { obscuration, margin }
}

/** d3-contour emits GeoJSON positions: an array of numbers per point. */
type ContourRing = number[][]

/**
 * Grid row 0 is the north edge, so latitude runs against y. That flip reverses
 * every ring, and reversed rings read as holes under the nonzero fill rule and
 * as the outside of the world to d3-geo. Reversing back restores the winding
 * d3-contour intended.
 */
const gridToGeo = (ring: ContourRing, box: FrameBox): [number, number][] => {
  const [west, south, east, north] = box
  const flipped: [number, number][] = ring.map(([x, y]) => [
    west + ((x ?? 0) * (east - west)) / GRID_COLUMNS,
    north - ((y ?? 0) * (north - south)) / GRID_ROWS,
  ])
  return flipped.toReversed()
}

const toGeometry = (
  rings: ContourRing[][],
  box: FrameBox,
): MultiPolygonGeometry => ({
  type: 'MultiPolygon',
  coordinates: rings.map((polygon) =>
    polygon.map((ring) => gridToGeo(ring, box)),
  ),
})

export const bandOutline = (
  field: UmbraField,
  box: FrameBox,
): MultiPolygonGeometry | null => {
  const [contour] = contours().size([GRID_COLUMNS, GRID_ROWS]).thresholds([0])(
    Array.from(field.margin),
  )
  if (!contour || contour.coordinates.length === 0) return null
  return toGeometry(contour.coordinates, box)
}

export type ObscurationContour = {
  level: number
  geometry: MultiPolygonGeometry
}

const STEP_LADDER = [0.0025, 0.005, 0.01, 0.02, 0.05]
const MAX_CONTOURS = 6

/** Round numbers a reader recognises, tightening as they approach the switch. */
const PREFERRED_LEVELS = [
  0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.92, 0.94, 0.96, 0.97, 0.98, 0.99, 0.995,
]

const evenLevels = (low: number, high: number): number[] => {
  const step =
    STEP_LADDER.find((candidate) => (high - low) / candidate <= MAX_CONTOURS) ??
    STEP_LADDER[STEP_LADDER.length - 1]
  const levels: number[] = []
  const first = Math.floor(low / step + 1) * step
  for (let level = first; level < high; level += step) {
    levels.push(Number(level.toFixed(4)))
  }
  return levels
}

/**
 * Denmark tops out at 86 percent and Spain at 100, so one fixed ladder draws
 * nothing for half the countries. Preferred levels win when the frame spans
 * enough of them; otherwise the frame's own range sets an even step.
 */
export const obscurationLevels = (field: UmbraField): number[] => {
  let low = Number.POSITIVE_INFINITY
  let high = 0
  for (const value of field.obscuration) {
    if (value <= 0) continue
    if (value < low) low = value
    if (value > high) high = value
  }
  if (!Number.isFinite(low) || high - low < 0.002) return []
  const preferred = PREFERRED_LEVELS.filter(
    (level) => level > low && level < high,
  )
  const levels = preferred.length >= 3 ? preferred : evenLevels(low, high)
  return levels.slice(-MAX_CONTOURS)
}

export const obscurationContours = (
  field: UmbraField,
  box: FrameBox,
): ObscurationContour[] => {
  const levels = obscurationLevels(field)
  if (levels.length === 0) return []
  return contours()
    .size([GRID_COLUMNS, GRID_ROWS])
    .thresholds(levels)(Array.from(field.obscuration))
    .filter((contour) => contour.coordinates.length > 0)
    .map((contour) => ({
      level: contour.value,
      geometry: toGeometry(contour.coordinates, box),
    }))
}

export type CenterLinePoint = {
  seconds: number
  latitude: number
  longitude: number
}

const CENTER_LINE_HORIZON_DEG = -1

/**
 * The umbra center on the ground, sampled from first touch to last. Points
 * where the sun already set are dropped: the geometric track runs on past
 * dusk, and the map only shows the visible eclipse.
 */
export const centerLine = (
  engine: ShadowEngine,
  stepSeconds = 60,
): CenterLinePoint[] => {
  const points: CenterLinePoint[] = []
  for (
    let seconds = engine.startSeconds;
    seconds <= engine.endSeconds;
    seconds += stepSeconds
  ) {
    const ground = engine.axisGroundPoint(seconds)
    if (!ground) continue
    const site = engine.siteAt(ground.latitude, ground.longitude)
    const sunAltitude = engine.instantAt(site, seconds).sunAltitude
    if (sunAltitude < CENTER_LINE_HORIZON_DEG) continue
    points.push({ seconds, ...ground })
  }
  return points
}

export type BandDistance = {
  /** Distance to ground that holds at least `minSeconds` of totality. */
  km: number
  compass: string
  latitude: number
  longitude: number
  /** Distance to the center line, where the same shadow pays in full. */
  centerKm: number
  centerSeconds: number
}

/**
 * The paper's rule: totality at the edge lasts seconds, the center line pays in
 * full. So the drive is measured to ground that holds at least `minSeconds`, not
 * to the band edge. Madrid sits 9 km from the edge and it buys nothing.
 */
export const PAYING_TOTALITY_SECONDS = 60

const totalitySeconds = (engine: ShadowEngine, lat: number, lon: number) =>
  engine.circumstances(lat, lon).totality?.seconds ?? 0

/** Bisects along the great circle towards the nearest center-line point. */
export const nearestBandPoint = (
  engine: ShadowEngine,
  line: CenterLinePoint[],
  latitude: number,
  longitude: number,
  minSeconds = PAYING_TOTALITY_SECONDS,
): BandDistance | null => {
  if (line.length === 0) return null
  if (totalitySeconds(engine, latitude, longitude) >= minSeconds) return null

  let target = line[0]
  let bestKm = Number.POSITIVE_INFINITY
  for (const point of line) {
    const km = greatCircleKm(
      latitude,
      longitude,
      point.latitude,
      point.longitude,
    )
    if (km < bestKm) {
      bestKm = km
      target = point
    }
  }

  let low = 0
  let high = 1
  for (let step = 0; step < 22; step += 1) {
    const mid = (low + high) / 2
    const lat = latitude + (target.latitude - latitude) * mid
    const lon = longitude + (target.longitude - longitude) * mid
    if (totalitySeconds(engine, lat, lon) >= minSeconds) high = mid
    else low = mid
  }
  const edgeLat = latitude + (target.latitude - latitude) * high
  const edgeLon = longitude + (target.longitude - longitude) * high
  return {
    km: greatCircleKm(latitude, longitude, edgeLat, edgeLon),
    compass: compassPoint(bearingFrom(latitude, longitude, edgeLat, edgeLon)),
    latitude: edgeLat,
    longitude: edgeLon,
    centerKm: bestKm,
    centerSeconds: totalitySeconds(engine, target.latitude, target.longitude),
  }
}
