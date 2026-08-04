import { clamp } from 'es-toolkit'
import { MAP_HEIGHT, MAP_WIDTH, type WorldPoint } from './map-projection'

export const MIN_ZOOM = 1
export const MAX_ZOOM = 4
export const ZOOM_STEP = 1.25

export type Viewport = {
  centerX: number
  centerY: number
  zoom: number
}

export type PointerPoint = {
  clientX: number
  clientY: number
}

export type PinchSession = {
  distance: number
  viewport: Viewport
  worldPoint: WorldPoint
}

export const INITIAL_VIEWPORT: Viewport = {
  centerX: MAP_WIDTH / 2,
  centerY: MAP_HEIGHT / 2,
  zoom: 1,
}

export const clampZoom = (zoom: number) => clamp(zoom, MIN_ZOOM, MAX_ZOOM)

export const viewBoxFor = ({ centerX, centerY, zoom }: Viewport) => {
  const width = MAP_WIDTH / zoom
  const height = MAP_HEIGHT / zoom
  const x = clamp(centerX - width / 2, 0, MAP_WIDTH - width)
  const y = clamp(centerY - height / 2, 0, MAP_HEIGHT - height)

  return { height, width, x, y }
}

export const normalizeViewport = (viewport: Viewport): Viewport => {
  const zoom = clampZoom(viewport.zoom)
  const width = MAP_WIDTH / zoom
  const height = MAP_HEIGHT / zoom

  return {
    zoom,
    centerX: clamp(viewport.centerX, width / 2, MAP_WIDTH - width / 2),
    centerY: clamp(viewport.centerY, height / 2, MAP_HEIGHT - height / 2),
  }
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
    x: clamp(viewBox.x + xRatio * viewBox.width, 0, MAP_WIDTH),
    y: clamp(viewBox.y + yRatio * viewBox.height, 0, MAP_HEIGHT),
  }
}
