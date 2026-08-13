/**
 * Web Mercator, cropped to 85.051°N..60°S. Antarctica holds no game targets,
 * so the crop trades dead ocean for a usable frame. Both the generated
 * world-map SVG and the interactive GeoMap must project through this module
 * so clicks invert exactly onto the drawn land.
 */

import { clamp } from 'es-toolkit'

const DEGREES_TO_RADIANS = Math.PI / 180
const RADIANS_TO_DEGREES = 180 / Math.PI

/** atan(sinh(π)): the square web-mercator frame edge. */
export const MERCATOR_NORTH_LATITUDE =
  Math.atan(Math.sinh(Math.PI)) * RADIANS_TO_DEGREES
export const MERCATOR_SOUTH_LATITUDE = -60

const mercatorY = (latitudeDeg: number): number =>
  Math.log(Math.tan(Math.PI / 4 + (latitudeDeg * DEGREES_TO_RADIANS) / 2))

const RAW_Y_TOP = mercatorY(MERCATOR_NORTH_LATITUDE)
const RAW_Y_BOTTOM = mercatorY(MERCATOR_SOUTH_LATITUDE)
const RAW_HEIGHT = RAW_Y_TOP - RAW_Y_BOTTOM

export const MERCATOR_ASPECT = (2 * Math.PI) / RAW_HEIGHT

export type NormalizedPoint = {
  /** 0 at 180°W, 1 at 180°E. */
  x: number
  /** 0 at the 85.051°N crop edge, 1 at the 60°S crop edge. */
  y: number
}

/**
 * Longitude is deliberately not clamped: antimeridian-wrapped inputs (for
 * example 190°) land beyond the frame edge, and the map connection line
 * relies on that.
 */
export const mercatorForward = (
  longitudeDeg: number,
  latitudeDeg: number,
): NormalizedPoint => {
  const latitude = clamp(
    latitudeDeg,
    MERCATOR_SOUTH_LATITUDE,
    MERCATOR_NORTH_LATITUDE,
  )
  return {
    x: (longitudeDeg * DEGREES_TO_RADIANS + Math.PI) / (2 * Math.PI),
    y: (RAW_Y_TOP - mercatorY(latitude)) / RAW_HEIGHT,
  }
}

export const mercatorInverse = (
  point: NormalizedPoint,
): { latitude: number; longitude: number } => {
  const rawY = clamp(RAW_Y_TOP - point.y * RAW_HEIGHT, RAW_Y_BOTTOM, RAW_Y_TOP)
  const longitude = (point.x * 2 * Math.PI - Math.PI) * RADIANS_TO_DEGREES
  return {
    latitude: Math.atan(Math.sinh(rawY)) * RADIANS_TO_DEGREES,
    longitude: clamp(longitude, -180, 180),
  }
}
