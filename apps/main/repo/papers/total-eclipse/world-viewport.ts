/**
 * Viewport math for the draggable eclipse map, after app/meridian's
 * map-viewport: one fixed mercator world space in pixels, pan and zoom as
 * viewBox windowing over it. The window is the region the shadow visits;
 * scripts/papers/build-eclipse-world.mjs clips its land to the same box.
 */

import { geoMercator } from 'd3-geo'
import { clamp } from 'es-toolkit'

export const WORLD_WINDOW = {
  west: -150,
  east: 165,
  south: 0,
  north: 89.5,
}

export const WORLD_WIDTH = 2000

/* All four corners: geoPath.bounds degenerates on a two-point MultiPoint.
   Re-anchored after the fit so the north edge sits at y = 0. */
const fitted = geoMercator().fitWidth(WORLD_WIDTH, {
  type: 'MultiPoint',
  coordinates: [
    [WORLD_WINDOW.west, WORLD_WINDOW.south],
    [WORLD_WINDOW.east, WORLD_WINDOW.south],
    [WORLD_WINDOW.east, WORLD_WINDOW.north],
    [WORLD_WINDOW.west, WORLD_WINDOW.north],
  ],
})
const [fittedX, fittedY] = fitted.translate()
const northY = fitted([WORLD_WINDOW.west, WORLD_WINDOW.north])?.[1] ?? 0

export const WORLD_PROJECTION = fitted.translate([fittedX, fittedY - northY])

export const WORLD_HEIGHT =
  WORLD_PROJECTION([WORLD_WINDOW.west, WORLD_WINDOW.south])?.[1] ?? WORLD_WIDTH

export const VIEW_WIDTH = 660
export const VIEW_HEIGHT = 560

export const MIN_ZOOM = 1
export const MAX_ZOOM = 14
export const ZOOM_STEP = 1.6

export type WorldPoint = { x: number; y: number }

export type Viewport = {
  centerX: number
  centerY: number
  zoom: number
}

export type PointerPoint = { clientX: number; clientY: number }

export type PinchSession = {
  distance: number
  viewport: Viewport
  worldPoint: WorldPoint
}

export const toWorldPoint = (
  longitude: number,
  latitude: number,
): WorldPoint => {
  const projected = WORLD_PROJECTION([
    longitude,
    clamp(latitude, -85, WORLD_WINDOW.north),
  ])
  return { x: projected?.[0] ?? 0, y: projected?.[1] ?? 0 }
}

export const toCoordinate = (
  point: WorldPoint,
): { latitude: number; longitude: number } => {
  const inverted = WORLD_PROJECTION.invert?.([point.x, point.y])
  return { longitude: inverted?.[0] ?? 0, latitude: inverted?.[1] ?? 0 }
}

export const clampZoom = (zoom: number) => clamp(zoom, MIN_ZOOM, MAX_ZOOM)

export const viewBoxFor = ({ centerX, centerY, zoom }: Viewport) => {
  const width = WORLD_WIDTH / zoom
  const height = (width * VIEW_HEIGHT) / VIEW_WIDTH
  const x = clamp(centerX - width / 2, 0, Math.max(0, WORLD_WIDTH - width))
  const y = clamp(centerY - height / 2, 0, Math.max(0, WORLD_HEIGHT - height))
  return { x, y, width, height }
}

export const normalizeViewport = (viewport: Viewport): Viewport => {
  const zoom = clampZoom(viewport.zoom)
  const width = WORLD_WIDTH / zoom
  const height = (width * VIEW_HEIGHT) / VIEW_WIDTH
  return {
    zoom,
    centerX: clamp(
      viewport.centerX,
      width / 2,
      Math.max(width / 2, WORLD_WIDTH - width / 2),
    ),
    centerY: clamp(
      viewport.centerY,
      height / 2,
      Math.max(height / 2, WORLD_HEIGHT - height / 2),
    ),
  }
}

/** The opening view: the band from Iberia over Iceland, sites readable. */
export const initialViewport = (): Viewport => {
  const anchor = toWorldPoint(-8, 56)
  return normalizeViewport({ centerX: anchor.x, centerY: anchor.y, zoom: 3.4 })
}

export const pointerDistance = (points: Map<number, PointerPoint>) => {
  const [first, second] = [...points.values()]
  if (!first || !second) return 0
  return Math.hypot(
    second.clientX - first.clientX,
    second.clientY - first.clientY,
  )
}

export const pointerMidpoint = (
  points: Map<number, PointerPoint>,
): PointerPoint | null => {
  const [first, second] = [...points.values()]
  if (!first || !second) return null
  return {
    clientX: (first.clientX + second.clientX) / 2,
    clientY: (first.clientY + second.clientY) / 2,
  }
}

export const clientPointToWorldPoint = (
  rect: DOMRect,
  point: PointerPoint,
  viewport: Viewport,
): WorldPoint => {
  const viewBox = viewBoxFor(viewport)
  const xRatio = rect.width > 0 ? (point.clientX - rect.left) / rect.width : 0.5
  const yRatio =
    rect.height > 0 ? (point.clientY - rect.top) / rect.height : 0.5
  return {
    x: viewBox.x + xRatio * viewBox.width,
    y: viewBox.y + yRatio * viewBox.height,
  }
}

/** Keeps the focal point under the cursor while the zoom changes. */
export const zoomedViewport = (
  zoom: number,
  focal: { ratioX: number; ratioY: number; world: WorldPoint },
): Viewport => {
  const nextZoom = clampZoom(zoom)
  const width = WORLD_WIDTH / nextZoom
  const height = (width * VIEW_HEIGHT) / VIEW_WIDTH
  return normalizeViewport({
    zoom: nextZoom,
    centerX: focal.world.x - focal.ratioX * width + width / 2,
    centerY: focal.world.y - focal.ratioY * height + height / 2,
  })
}
