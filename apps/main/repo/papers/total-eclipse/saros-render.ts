import type { LonLat } from './saros-path.ts'

export type View = {
  centerLon: number
  centerLat: number
  radius: number
  cx: number
  cy: number
}

export type Projected = {
  x: number
  y: number
  front: boolean
}

const RADIANS = Math.PI / 180

export const project = (lon: number, lat: number, view: View): Projected => {
  const phi = lat * RADIANS
  const dLon = (lon - view.centerLon) * RADIANS
  const phi0 = view.centerLat * RADIANS
  const cosPhi = Math.cos(phi)
  const sinPhi = Math.sin(phi)
  const cosDelta = Math.cos(dLon)
  const cosC = Math.sin(phi0) * sinPhi + Math.cos(phi0) * cosPhi * cosDelta
  return {
    x: view.cx + view.radius * cosPhi * Math.sin(dLon),
    y:
      view.cy -
      view.radius *
        (Math.cos(phi0) * sinPhi - Math.sin(phi0) * cosPhi * cosDelta),
    front: cosC >= 0,
  }
}

// Points behind the limb are dropped, so a run breaks into visible segments
// instead of drawing a chord across the globe.
const traceRuns = (
  ctx: CanvasRenderingContext2D,
  points: readonly LonLat[],
  view: View,
) => {
  let drawing = false
  for (const [lon, lat] of points) {
    const at = project(lon, lat, view)
    if (!at.front) {
      drawing = false
      continue
    }
    if (drawing) ctx.lineTo(at.x, at.y)
    else ctx.moveTo(at.x, at.y)
    drawing = true
  }
}

export const strokePoints = (
  ctx: CanvasRenderingContext2D,
  points: readonly LonLat[],
  view: View,
) => {
  ctx.beginPath()
  traceRuns(ctx, points, view)
  ctx.stroke()
}

export const fillPoints = (
  ctx: CanvasRenderingContext2D,
  points: readonly LonLat[],
  view: View,
) => {
  ctx.beginPath()
  traceRuns(ctx, points, view)
  ctx.closePath()
  ctx.fill()
}

export const buildGraticule = (): LonLat[][] => {
  const lines: LonLat[][] = []
  for (let lon = -180; lon < 180; lon += 30) {
    const meridian: LonLat[] = []
    for (let lat = -80; lat <= 80; lat += 4) meridian.push([lon, lat])
    lines.push(meridian)
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const parallel: LonLat[] = []
    for (let lon = -180; lon <= 180; lon += 4) parallel.push([lon, lat])
    lines.push(parallel)
  }
  return lines
}

export const drawSphere = (
  ctx: CanvasRenderingContext2D,
  view: View,
  colors: { face: string; limb: string },
) => {
  ctx.beginPath()
  ctx.arc(view.cx, view.cy, view.radius, 0, Math.PI * 2)
  ctx.fillStyle = colors.face
  ctx.fill()
  ctx.lineWidth = 1
  ctx.strokeStyle = colors.limb
  ctx.stroke()
}

export const drawGraticule = (
  ctx: CanvasRenderingContext2D,
  lines: LonLat[][],
  view: View,
  color: string,
) => {
  ctx.lineWidth = 0.6
  ctx.strokeStyle = color
  for (const line of lines) strokePoints(ctx, line, view)
}

export const drawLand = (
  ctx: CanvasRenderingContext2D,
  rings: readonly LonLat[][],
  view: View,
  color: string,
) => {
  ctx.lineWidth = 0.9
  ctx.strokeStyle = color
  for (const ring of rings) strokePoints(ctx, ring, view)
}

export const drawMarker = (
  ctx: CanvasRenderingContext2D,
  point: LonLat,
  view: View,
  color: string,
  radius: number,
) => {
  const at = project(point[0], point[1], view)
  if (!at.front) return
  ctx.beginPath()
  ctx.arc(at.x, at.y, radius, 0, Math.PI * 2)
  ctx.fillStyle = '#0e141b'
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = color
  ctx.stroke()
}

/** Inverse orthographic: canvas point to lon/lat, null off the sphere. */
export const unproject = (x: number, y: number, view: View): LonLat | null => {
  const dx = (x - view.cx) / view.radius
  const dy = (view.cy - y) / view.radius
  const rhoSquared = dx * dx + dy * dy
  if (rhoSquared > 1) return null
  const cosC = Math.sqrt(1 - rhoSquared)
  const phi0 = view.centerLat * RADIANS
  const sinPhi0 = Math.sin(phi0)
  const cosPhi0 = Math.cos(phi0)
  const lat = Math.asin(cosC * sinPhi0 + dy * cosPhi0)
  const lon =
    view.centerLon * RADIANS + Math.atan2(dx, cosC * cosPhi0 - dy * sinPhi0)
  return [((lon / RADIANS + 540) % 360) - 180, lat / RADIANS]
}

export const drawPlace = (
  ctx: CanvasRenderingContext2D,
  point: LonLat,
  view: View,
  color: string,
) => {
  const at = project(point[0], point[1], view)
  if (!at.front) return
  ctx.lineWidth = 1.2
  ctx.strokeStyle = color
  ctx.beginPath()
  ctx.arc(at.x, at.y, 7, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(at.x - 12, at.y)
  ctx.lineTo(at.x - 9, at.y)
  ctx.moveTo(at.x + 9, at.y)
  ctx.lineTo(at.x + 12, at.y)
  ctx.moveTo(at.x, at.y - 12)
  ctx.lineTo(at.x, at.y - 9)
  ctx.moveTo(at.x, at.y + 9)
  ctx.lineTo(at.x, at.y + 12)
  ctx.stroke()
}

export const sliceLine = (line: readonly LonLat[], fraction: number) => {
  const count = Math.max(2, Math.round(line.length * fraction))
  return line.slice(0, count)
}
