import type { BrushShape } from './options.ts'
import type { Rgba } from './palette.ts'

// Pure rasterizers over a plain byte buffer. No canvas, no antialiasing.

export type Bitmap = {
  data: Uint8ClampedArray<ArrayBuffer>
  w: number
  h: number
}

export type Pt = { x: number; y: number }

export type Rect = { x: number; y: number; w: number; h: number }

export type ShapeStyle = { stroke?: Rgba; fill?: Rgba }

export const createBitmap = (w: number, h: number): Bitmap => {
  const data = new Uint8ClampedArray(w * h * 4)
  data.fill(255)
  return { data, w, h }
}

export const setPx = (bmp: Bitmap, x: number, y: number, color: Rgba): void => {
  if (x < 0 || y < 0 || x >= bmp.w || y >= bmp.h) return
  const i = (y * bmp.w + x) * 4
  bmp.data[i] = color[0]
  bmp.data[i + 1] = color[1]
  bmp.data[i + 2] = color[2]
  bmp.data[i + 3] = color[3]
}

export const getPx = (bmp: Bitmap, x: number, y: number): Rgba | null => {
  if (x < 0 || y < 0 || x >= bmp.w || y >= bmp.h) return null
  const i = (y * bmp.w + x) * 4
  return [bmp.data[i], bmp.data[i + 1], bmp.data[i + 2], bmp.data[i + 3]]
}

const hspan = (
  bmp: Bitmap,
  x0: number,
  x1: number,
  y: number,
  color: Rgba,
): void => {
  for (let x = x0; x <= x1; x++) setPx(bmp, x, y, color)
}

export type Plot = (x: number, y: number) => void

// bresenham: the error term reaches the endpoint in max(dx, dy) steps
export const traceLine = (from: Pt, to: Pt, plot: Plot): void => {
  const dx = Math.abs(to.x - from.x)
  const dy = -Math.abs(to.y - from.y)
  const sx = from.x < to.x ? 1 : -1
  const sy = from.y < to.y ? 1 : -1
  let x = from.x
  let y = from.y
  let err = dx + dy
  while (true) {
    plot(x, y)
    if (x === to.x && y === to.y) return
    const doubled = 2 * err
    if (doubled >= dy) {
      err += dy
      x += sx
    }
    if (doubled <= dx) {
      err += dx
      y += sy
    }
  }
}

// integer disc: keep pixels whose center sits inside the stamp circle
export const stampDisc = (
  bmp: Bitmap,
  at: Pt,
  size: number,
  color: Rgba,
): void => {
  if (size <= 1) {
    setPx(bmp, at.x, at.y, color)
    return
  }
  const r = size / 2
  const anchor = size >> 1
  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) {
      const px = dx + 0.5 - r
      const py = dy + 0.5 - r
      if (px * px + py * py > r * r) continue
      setPx(bmp, at.x + dx - anchor, at.y + dy - anchor, color)
    }
  }
}

export type BrushTip = { shape: BrushShape; size: number; color: Rgba }

const stampSquare = (bmp: Bitmap, at: Pt, size: number, color: Rgba): void => {
  const anchor = size >> 1
  for (let dy = 0; dy < size; dy++) {
    hspan(
      bmp,
      at.x - anchor,
      at.x - anchor + size - 1,
      at.y - anchor + dy,
      color,
    )
  }
}

export const stampBrush = (bmp: Bitmap, at: Pt, tip: BrushTip): void => {
  const anchor = tip.size >> 1
  if (tip.shape === 'circle') {
    stampDisc(bmp, at, tip.size, tip.color)
    return
  }
  if (tip.shape === 'square') {
    stampSquare(bmp, at, tip.size, tip.color)
    return
  }
  for (let i = 0; i < tip.size; i++) {
    const rise = tip.shape === 'diagonal' ? anchor - i : i - anchor
    setPx(bmp, at.x - anchor + i, at.y + rise, tip.color)
  }
}

export const drawLine = (
  bmp: Bitmap,
  from: Pt,
  to: Pt,
  opts: { color: Rgba; size: number },
): void => {
  traceLine(from, to, (x, y) => stampDisc(bmp, { x, y }, opts.size, opts.color))
}

export const brushStroke = (
  bmp: Bitmap,
  from: Pt,
  to: Pt,
  tip: BrushTip,
): void => {
  traceLine(from, to, (x, y) => stampBrush(bmp, { x, y }, tip))
}

const ordered = (a: number, b: number): [number, number] =>
  a <= b ? [a, b] : [b, a]

export const drawRect = (
  bmp: Bitmap,
  a: Pt,
  b: Pt,
  style: ShapeStyle,
): void => {
  const [x0, x1] = ordered(a.x, b.x)
  const [y0, y1] = ordered(a.y, b.y)
  if (style.fill) {
    for (let y = y0; y <= y1; y++) hspan(bmp, x0, x1, y, style.fill)
  }
  if (!style.stroke) return
  hspan(bmp, x0, x1, y0, style.stroke)
  hspan(bmp, x0, x1, y1, style.stroke)
  for (let y = y0; y <= y1; y++) {
    setPx(bmp, x0, y, style.stroke)
    setPx(bmp, x1, y, style.stroke)
  }
}

type InsideTest = (x: number, y: number) => boolean

// outline = per-row extremes united with per-column extremes: stays closed
const scanShape = (
  bmp: Bitmap,
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
    if (style.fill) hspan(bmp, first, last, y, style.fill)
    if (style.stroke) {
      setPx(bmp, first, y, style.stroke)
      setPx(bmp, last, y, style.stroke)
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
    setPx(bmp, x, first, style.stroke)
    setPx(bmp, x, last, style.stroke)
  }
}

export const drawEllipse = (
  bmp: Bitmap,
  a: Pt,
  b: Pt,
  style: ShapeStyle,
): void => {
  const [x0, x1] = ordered(a.x, b.x)
  const [y0, y1] = ordered(a.y, b.y)
  if (x0 === x1 || y0 === y1) {
    drawLine(
      bmp,
      { x: x0, y: y0 },
      { x: x1, y: y1 },
      {
        color: style.stroke ?? style.fill ?? [0, 0, 0, 255],
        size: 1,
      },
    )
    return
  }
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const rx = (x1 - x0) / 2
  const ry = (y1 - y0) / 2
  const inside: InsideTest = (x, y) => {
    const nx = (x - cx) / rx
    const ny = (y - cy) / ry
    return nx * nx + ny * ny <= 1
  }
  scanShape(bmp, { x0, y0, x1, y1 }, inside, style)
}

const ROUND_RADIUS = 8

export const drawRoundedRect = (
  bmp: Bitmap,
  a: Pt,
  b: Pt,
  style: ShapeStyle,
): void => {
  const [x0, x1] = ordered(a.x, b.x)
  const [y0, y1] = ordered(a.y, b.y)
  // an integer radius keeps flat runs on every edge, so the outline closes
  const r = Math.min(
    ROUND_RADIUS,
    Math.floor((x1 - x0) / 2),
    Math.floor((y1 - y0) / 2),
  )
  const inside: InsideTest = (x, y) => {
    const qx = Math.max(x0 + r - x, x - (x1 - r), 0)
    const qy = Math.max(y0 + r - y, y - (y1 - r), 0)
    return qx * qx + qy * qy <= r * r
  }
  scanShape(bmp, { x0, y0, x1, y1 }, inside, style)
}

const crossingsAt = (points: readonly Pt[], y: number): number[] => {
  const xs: number[] = []
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const q = points[(i + 1) % points.length]
    if (p.y === q.y) continue
    const [top, bottom] = p.y < q.y ? [p, q] : [q, p]
    if (y < top.y || y >= bottom.y) continue
    xs.push(top.x + ((y - top.y) * (bottom.x - top.x)) / (bottom.y - top.y))
  }
  return xs.toSorted((m, n) => m - n)
}

export const drawPolygon = (
  bmp: Bitmap,
  points: readonly Pt[],
  style: ShapeStyle,
): void => {
  if (points.length < 2) return
  if (style.fill) {
    const ys = points.map((p) => p.y)
    const y0 = Math.min(...ys)
    const y1 = Math.max(...ys)
    for (let y = y0; y <= y1; y++) {
      const xs = crossingsAt(points, y)
      for (let i = 0; i + 1 < xs.length; i += 2) {
        hspan(bmp, Math.ceil(xs[i]), Math.floor(xs[i + 1]), y, style.fill)
      }
    }
  }
  if (!style.stroke) return
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length]
    drawLine(bmp, points[i], next, { color: style.stroke, size: 1 })
  }
}

export type CurveSpec = {
  from: Pt
  to: Pt
  c1: Pt
  c2: Pt
  color: Rgba
  size: number
}

const cubicAt = (spec: CurveSpec, t: number): Pt => {
  const rest = 1 - t
  const weight = (p0: number, p1: number, p2: number, p3: number) =>
    rest * rest * rest * p0 +
    3 * rest * rest * t * p1 +
    3 * rest * t * t * p2 +
    t * t * t * p3
  return {
    x: Math.round(weight(spec.from.x, spec.c1.x, spec.c2.x, spec.to.x)),
    y: Math.round(weight(spec.from.y, spec.c1.y, spec.c2.y, spec.to.y)),
  }
}

const dist = (a: Pt, b: Pt): number => Math.hypot(b.x - a.x, b.y - a.y)

export const drawCurve = (bmp: Bitmap, spec: CurveSpec): void => {
  const arc =
    dist(spec.from, spec.c1) + dist(spec.c1, spec.c2) + dist(spec.c2, spec.to)
  const segments = Math.min(512, Math.max(8, Math.ceil(arc)))
  let prev = spec.from
  for (let i = 1; i <= segments; i++) {
    const next = cubicAt(spec, i / segments)
    drawLine(bmp, prev, next, { color: spec.color, size: spec.size })
    prev = next
  }
}

export type SprayOpts = {
  size: number
  color: Rgba
  rng: () => number
  dots?: number
}

export const spray = (bmp: Bitmap, at: Pt, opts: SprayOpts): void => {
  const r = opts.size / 2
  const dots = opts.dots ?? Math.ceil((opts.size * opts.size) / 32)
  for (let i = 0; i < dots; i++) {
    const angle = opts.rng() * 2 * Math.PI
    const radius = r * Math.sqrt(opts.rng())
    setPx(
      bmp,
      Math.round(at.x + Math.cos(angle) * radius),
      Math.round(at.y + Math.sin(angle) * radius),
      opts.color,
    )
  }
}
