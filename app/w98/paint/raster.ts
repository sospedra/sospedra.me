import type { BrushShape } from './options.ts'
import type { Rgba } from './palette.ts'

export type Bitmap = {
  data: Uint8ClampedArray<ArrayBuffer>
  width: number
  height: number
}

export type Point = { x: number; y: number }

export type Rect = { x: number; y: number; width: number; height: number }

export type ShapeStyle = { stroke?: Rgba; fill?: Rgba }

export const createBitmap = (width: number, height: number): Bitmap => {
  const data = new Uint8ClampedArray(width * height * 4)
  data.fill(255)
  return { data, width, height }
}

export const setPixel = (
  bitmap: Bitmap,
  x: number,
  y: number,
  color: Rgba,
): void => {
  if (x < 0 || y < 0 || x >= bitmap.width || y >= bitmap.height) return
  const i = (y * bitmap.width + x) * 4
  bitmap.data[i] = color[0]
  bitmap.data[i + 1] = color[1]
  bitmap.data[i + 2] = color[2]
  bitmap.data[i + 3] = color[3]
}

export const getPixel = (bitmap: Bitmap, x: number, y: number): Rgba | null => {
  if (x < 0 || y < 0 || x >= bitmap.width || y >= bitmap.height) return null
  const i = (y * bitmap.width + x) * 4
  return [
    bitmap.data[i],
    bitmap.data[i + 1],
    bitmap.data[i + 2],
    bitmap.data[i + 3],
  ]
}

const fillRow = (
  bitmap: Bitmap,
  x0: number,
  x1: number,
  y: number,
  color: Rgba,
): void => {
  for (let x = x0; x <= x1; x++) setPixel(bitmap, x, y, color)
}

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

export const stampDisc = (
  bitmap: Bitmap,
  at: Point,
  size: number,
  color: Rgba,
): void => {
  if (size <= 1) {
    setPixel(bitmap, at.x, at.y, color)
    return
  }
  const radius = size / 2
  const anchor = size >> 1
  for (let offsetY = 0; offsetY < size; offsetY++) {
    for (let offsetX = 0; offsetX < size; offsetX++) {
      const distanceX = offsetX + 0.5 - radius
      const distanceY = offsetY + 0.5 - radius
      if (distanceX * distanceX + distanceY * distanceY > radius * radius) {
        continue
      }
      setPixel(bitmap, at.x + offsetX - anchor, at.y + offsetY - anchor, color)
    }
  }
}

export type BrushTip = { shape: BrushShape; size: number; color: Rgba }

const stampSquare = (
  bitmap: Bitmap,
  at: Point,
  size: number,
  color: Rgba,
): void => {
  const anchor = size >> 1
  for (let offsetY = 0; offsetY < size; offsetY++) {
    fillRow(
      bitmap,
      at.x - anchor,
      at.x - anchor + size - 1,
      at.y - anchor + offsetY,
      color,
    )
  }
}

export const stampBrush = (bitmap: Bitmap, at: Point, tip: BrushTip): void => {
  const anchor = tip.size >> 1
  if (tip.shape === 'circle') {
    stampDisc(bitmap, at, tip.size, tip.color)
    return
  }
  if (tip.shape === 'square') {
    stampSquare(bitmap, at, tip.size, tip.color)
    return
  }
  for (let i = 0; i < tip.size; i++) {
    const rise = tip.shape === 'diagonal' ? anchor - i : i - anchor
    setPixel(bitmap, at.x - anchor + i, at.y + rise, tip.color)
  }
}

export const drawLine = (
  bitmap: Bitmap,
  from: Point,
  to: Point,
  options: { color: Rgba; size: number },
): void => {
  traceLine(from, to, (x, y) =>
    stampDisc(bitmap, { x, y }, options.size, options.color),
  )
}

export const brushStroke = (
  bitmap: Bitmap,
  from: Point,
  to: Point,
  tip: BrushTip,
): void => {
  traceLine(from, to, (x, y) => stampBrush(bitmap, { x, y }, tip))
}

const ordered = (a: number, b: number): [number, number] =>
  a <= b ? [a, b] : [b, a]

export const drawRect = (
  bitmap: Bitmap,
  a: Point,
  b: Point,
  style: ShapeStyle,
): void => {
  const [x0, x1] = ordered(a.x, b.x)
  const [y0, y1] = ordered(a.y, b.y)
  if (style.fill) {
    for (let y = y0; y <= y1; y++) fillRow(bitmap, x0, x1, y, style.fill)
  }
  if (!style.stroke) return
  fillRow(bitmap, x0, x1, y0, style.stroke)
  fillRow(bitmap, x0, x1, y1, style.stroke)
  for (let y = y0; y <= y1; y++) {
    setPixel(bitmap, x0, y, style.stroke)
    setPixel(bitmap, x1, y, style.stroke)
  }
}

type InsideTest = (x: number, y: number) => boolean

// outline = per-row extremes united with per-column extremes: stays closed
const scanShape = (
  bitmap: Bitmap,
  bounds: { x0: number; y0: number; x1: number; y1: number },
  inside: InsideTest,
  style: ShapeStyle,
): void => {
  const { x0, y0, x1, y1 } = bounds
  for (let y = y0; y <= y1; y++) {
    let first = -1
    let last = -1
    for (let x = x0; x <= x1; x++) {
      if (!inside(x, y)) continue
      if (first < 0) first = x
      last = x
    }
    if (first < 0) continue
    if (style.fill) fillRow(bitmap, first, last, y, style.fill)
    if (style.stroke) {
      setPixel(bitmap, first, y, style.stroke)
      setPixel(bitmap, last, y, style.stroke)
    }
  }
  if (!style.stroke) return
  for (let x = x0; x <= x1; x++) {
    let first = -1
    let last = -1
    for (let y = y0; y <= y1; y++) {
      if (!inside(x, y)) continue
      if (first < 0) first = y
      last = y
    }
    if (first < 0) continue
    setPixel(bitmap, x, first, style.stroke)
    setPixel(bitmap, x, last, style.stroke)
  }
}

export const drawEllipse = (
  bitmap: Bitmap,
  a: Point,
  b: Point,
  style: ShapeStyle,
): void => {
  const [x0, x1] = ordered(a.x, b.x)
  const [y0, y1] = ordered(a.y, b.y)
  if (x0 === x1 || y0 === y1) {
    drawLine(
      bitmap,
      { x: x0, y: y0 },
      { x: x1, y: y1 },
      {
        color: style.stroke ?? style.fill ?? [0, 0, 0, 255],
        size: 1,
      },
    )
    return
  }
  const centerX = (x0 + x1) / 2
  const centerY = (y0 + y1) / 2
  const radiusX = (x1 - x0) / 2
  const radiusY = (y1 - y0) / 2
  const inside: InsideTest = (x, y) => {
    const normalizedX = (x - centerX) / radiusX
    const normalizedY = (y - centerY) / radiusY
    return normalizedX * normalizedX + normalizedY * normalizedY <= 1
  }
  scanShape(bitmap, { x0, y0, x1, y1 }, inside, style)
}

const ROUND_RADIUS = 8

export const drawRoundedRect = (
  bitmap: Bitmap,
  a: Point,
  b: Point,
  style: ShapeStyle,
): void => {
  const [x0, x1] = ordered(a.x, b.x)
  const [y0, y1] = ordered(a.y, b.y)
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
  scanShape(bitmap, { x0, y0, x1, y1 }, inside, style)
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

export const drawPolygon = (
  bitmap: Bitmap,
  points: readonly Point[],
  style: ShapeStyle,
): void => {
  if (points.length < 2) return
  if (style.fill) {
    const ys = points.map((point) => point.y)
    const y0 = Math.min(...ys)
    const y1 = Math.max(...ys)
    for (let y = y0; y <= y1; y++) {
      const crossings = crossingsAt(points, y)
      for (let i = 0; i + 1 < crossings.length; i += 2) {
        fillRow(
          bitmap,
          Math.ceil(crossings[i]),
          Math.floor(crossings[i + 1]),
          y,
          style.fill,
        )
      }
    }
  }
  if (!style.stroke) return
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length]
    drawLine(bitmap, points[i], next, { color: style.stroke, size: 1 })
  }
}

export type CurveSpec = {
  from: Point
  to: Point
  c1: Point
  c2: Point
  color: Rgba
  size: number
}

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

const distance = (a: Point, b: Point): number =>
  Math.hypot(b.x - a.x, b.y - a.y)

export const drawCurve = (bitmap: Bitmap, spec: CurveSpec): void => {
  const arc =
    distance(spec.from, spec.c1) +
    distance(spec.c1, spec.c2) +
    distance(spec.c2, spec.to)
  const segments = Math.min(512, Math.max(8, Math.ceil(arc)))
  let previous = spec.from
  for (let i = 1; i <= segments; i++) {
    const next = cubicAt(spec, i / segments)
    drawLine(bitmap, previous, next, { color: spec.color, size: spec.size })
    previous = next
  }
}

export type SprayOptions = {
  size: number
  color: Rgba
  rng: () => number
  dots?: number
}

export const spray = (
  bitmap: Bitmap,
  at: Point,
  options: SprayOptions,
): void => {
  const radius = options.size / 2
  const dots = options.dots ?? Math.ceil((options.size * options.size) / 32)
  for (let i = 0; i < dots; i++) {
    const angle = options.rng() * 2 * Math.PI
    const dotRadius = radius * Math.sqrt(options.rng())
    setPixel(
      bitmap,
      Math.round(at.x + Math.cos(angle) * dotRadius),
      Math.round(at.y + Math.sin(angle) * dotRadius),
      options.color,
    )
  }
}
