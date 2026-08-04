import { clamp } from 'es-toolkit'
import { type Bounds, distance, type Point } from './geometry.ts'

export type Span = { y: number; x0: number; x1: number }

export type ShapeSpans = { fill: readonly Span[]; outline: readonly Span[] }

export type Plot = (x: number, y: number) => void

// bresenham: the error term reaches the endpoint in max(deltaX, -deltaY) steps
export const traceLine = (from: Point, to: Point, plot: Plot): void => {
  const deltaX = Math.abs(to.x - from.x)
  const deltaY = -Math.abs(to.y - from.y)
  const stepX = from.x < to.x ? 1 : -1
  const stepY = from.y < to.y ? 1 : -1
  let x = from.x
  let y = from.y
  let error = deltaX + deltaY
  while (true) {
    plot(x, y)
    if (x === to.x && y === to.y) return
    const doubledError = 2 * error
    if (doubledError >= deltaY) {
      error += deltaY
      x += stepX
    }
    if (doubledError <= deltaX) {
      error += deltaX
      y += stepY
    }
  }
}

export const linePoints = (from: Point, to: Point): Point[] => {
  const points: Point[] = []
  traceLine(from, to, (x, y) => points.push({ x, y }))
  return points
}

export const rectSpans = (bounds: Bounds): ShapeSpans => {
  const { x0, y0, x1, y1 } = bounds
  const fill: Span[] = []
  for (let y = y0; y <= y1; y++) fill.push({ y, x0, x1 })
  const outline: Span[] = [
    { y: y0, x0, x1 },
    { y: y1, x0, x1 },
  ]
  for (let y = y0; y <= y1; y++) {
    outline.push({ y, x0, x1: x0 }, { y, x0: x1, x1 })
  }
  return { fill, outline }
}

type InsideTest = (x: number, y: number) => boolean

// outline = per-row extremes united with per-column extremes: stays closed
const scanSpans = (bounds: Bounds, inside: InsideTest): ShapeSpans => {
  const columns = bounds.x1 - bounds.x0 + 1
  const columnFirst = new Int32Array(columns).fill(-1)
  const columnLast = new Int32Array(columns).fill(-1)
  const fill: Span[] = []
  const outline: Span[] = []
  for (let y = bounds.y0; y <= bounds.y1; y++) {
    let first = -1
    let last = -1
    for (let x = bounds.x0; x <= bounds.x1; x++) {
      if (!inside(x, y)) continue
      if (first < 0) first = x
      last = x
      const column = x - bounds.x0
      if (columnFirst[column] < 0) columnFirst[column] = y
      columnLast[column] = y
    }
    if (first < 0) continue
    fill.push({ y, x0: first, x1: last })
    outline.push({ y, x0: first, x1: first }, { y, x0: last, x1: last })
  }
  for (let column = 0; column < columns; column++) {
    if (columnFirst[column] < 0) continue
    const x = bounds.x0 + column
    outline.push(
      { y: columnFirst[column], x0: x, x1: x },
      { y: columnLast[column], x0: x, x1: x },
    )
  }
  return { fill, outline }
}

export const ellipseSpans = (bounds: Bounds): ShapeSpans => {
  const { x0, y0, x1, y1 } = bounds
  const centerX = (x0 + x1) / 2
  const centerY = (y0 + y1) / 2
  const radiusX = (x1 - x0) / 2
  const radiusY = (y1 - y0) / 2
  const inside: InsideTest = (x, y) => {
    const normalizedX = (x - centerX) / radiusX
    const normalizedY = (y - centerY) / radiusY
    return normalizedX * normalizedX + normalizedY * normalizedY <= 1
  }
  return scanSpans(bounds, inside)
}

const ROUND_RADIUS = 8

export const roundedRectSpans = (bounds: Bounds): ShapeSpans => {
  const { x0, y0, x1, y1 } = bounds
  // an integer radius keeps flat runs on every edge, so the outline closes
  const radius = Math.min(
    ROUND_RADIUS,
    Math.floor((x1 - x0) / 2),
    Math.floor((y1 - y0) / 2),
  )
  const inside: InsideTest = (x, y) => {
    const cornerGapX = Math.max(x0 + radius - x, x - (x1 - radius), 0)
    const cornerGapY = Math.max(y0 + radius - y, y - (y1 - radius), 0)
    return cornerGapX * cornerGapX + cornerGapY * cornerGapY <= radius * radius
  }
  return scanSpans(bounds, inside)
}

const crossingsAt = (points: readonly Point[], y: number): number[] => {
  const crossings: number[] = []
  for (let i = 0; i < points.length; i++) {
    const current = points[i]
    const next = points[(i + 1) % points.length]
    if (current.y === next.y) continue
    const [top, bottom] = current.y < next.y ? [current, next] : [next, current]
    if (y < top.y || y >= bottom.y) continue
    crossings.push(
      top.x + ((y - top.y) * (bottom.x - top.x)) / (bottom.y - top.y),
    )
  }
  return crossings.toSorted((left, right) => left - right)
}

export const polygonSpans = (points: readonly Point[]): Span[] => {
  const ys = points.map((point) => point.y)
  const y0 = Math.min(...ys)
  const y1 = Math.max(...ys)
  const spans: Span[] = []
  for (let y = y0; y <= y1; y++) {
    const crossings = crossingsAt(points, y)
    for (let i = 0; i + 1 < crossings.length; i += 2) {
      spans.push({
        y,
        x0: Math.ceil(crossings[i]),
        x1: Math.floor(crossings[i + 1]),
      })
    }
  }
  return spans
}

export type CurveSpec = { from: Point; to: Point; c1: Point; c2: Point }

const cubicAt = (spec: CurveSpec, t: number): Point => {
  const remaining = 1 - t
  const weight = (
    start: number,
    controlA: number,
    controlB: number,
    end: number,
  ) =>
    remaining * remaining * remaining * start +
    3 * remaining * remaining * t * controlA +
    3 * remaining * t * t * controlB +
    t * t * t * end
  return {
    x: Math.round(weight(spec.from.x, spec.c1.x, spec.c2.x, spec.to.x)),
    y: Math.round(weight(spec.from.y, spec.c1.y, spec.c2.y, spec.to.y)),
  }
}

export const curvePoints = (spec: CurveSpec): Point[] => {
  const arc =
    distance(spec.from, spec.c1) +
    distance(spec.c1, spec.c2) +
    distance(spec.c2, spec.to)
  const segments = clamp(Math.ceil(arc), 8, 512)
  const points: Point[] = [spec.from]
  for (let i = 1; i <= segments; i++) points.push(cubicAt(spec, i / segments))
  return points
}

export const sprayOffsets = (
  size: number,
  rng: () => number,
  dots?: number,
): Point[] => {
  const radius = size / 2
  const count = dots ?? Math.ceil((size * size) / 32)
  const offsets: Point[] = []
  for (let i = 0; i < count; i++) {
    const angle = rng() * 2 * Math.PI
    const dotRadius = radius * Math.sqrt(rng())
    offsets.push({
      x: Math.cos(angle) * dotRadius,
      y: Math.sin(angle) * dotRadius,
    })
  }
  return offsets
}
