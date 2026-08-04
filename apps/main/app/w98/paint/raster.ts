import { type BrushTip, brushMask, discMask } from './brush-tips.ts'
import { orderedBounds, type Point } from './geometry.ts'
import type { Rgba } from './palette.ts'
import {
  type CurveSpec,
  curvePoints,
  ellipseSpans,
  linePoints,
  polygonSpans,
  rectSpans,
  roundedRectSpans,
  type ShapeSpans,
  type Span,
  sprayOffsets,
} from './spans.ts'

export type Bitmap = {
  data: Uint8ClampedArray<ArrayBuffer>
  width: number
  height: number
}

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

export const writeSpan = (bitmap: Bitmap, span: Span, color: Rgba): void => {
  if (span.y < 0 || span.y >= bitmap.height) return
  const start = Math.max(span.x0, 0)
  const end = Math.min(span.x1, bitmap.width - 1)
  let i = (span.y * bitmap.width + start) * 4
  for (let x = start; x <= end; x++) {
    bitmap.data[i] = color[0]
    bitmap.data[i + 1] = color[1]
    bitmap.data[i + 2] = color[2]
    bitmap.data[i + 3] = color[3]
    i += 4
  }
}

export const writeSpans = (
  bitmap: Bitmap,
  spans: readonly Span[],
  color: Rgba,
): void => {
  for (const span of spans) writeSpan(bitmap, span, color)
}

export const writeMask = (
  bitmap: Bitmap,
  at: Point,
  mask: readonly Point[],
  color: Rgba,
): void => {
  for (const offset of mask) {
    setPixel(bitmap, at.x + offset.x, at.y + offset.y, color)
  }
}

export type BlitOptions = { skip?: Rgba }

const copyRow = (
  destination: Bitmap,
  source: Bitmap,
  sourceOffset: number,
  destinationOffset: number,
  pixels: number,
  skip: Rgba | undefined,
): void => {
  if (!skip) {
    destination.data.set(
      source.data.subarray(sourceOffset, sourceOffset + pixels * 4),
      destinationOffset,
    )
    return
  }
  for (let pixel = 0; pixel < pixels; pixel++) {
    const from = sourceOffset + pixel * 4
    const masked =
      source.data[from] === skip[0] &&
      source.data[from + 1] === skip[1] &&
      source.data[from + 2] === skip[2] &&
      source.data[from + 3] === skip[3]
    if (masked) continue
    destination.data.set(
      source.data.subarray(from, from + 4),
      destinationOffset + pixel * 4,
    )
  }
}

export const blit = (
  destination: Bitmap,
  source: Bitmap,
  at: Point,
  options: BlitOptions = {},
): void => {
  const x0 = Math.max(at.x, 0)
  const y0 = Math.max(at.y, 0)
  const x1 = Math.min(at.x + source.width, destination.width)
  const y1 = Math.min(at.y + source.height, destination.height)
  if (x1 <= x0 || y1 <= y0) return
  for (let y = y0; y < y1; y++) {
    copyRow(
      destination,
      source,
      ((y - at.y) * source.width + (x0 - at.x)) * 4,
      (y * destination.width + x0) * 4,
      x1 - x0,
      options.skip,
    )
  }
}

export const scaleNearest = (
  source: Bitmap,
  width: number,
  height: number,
): Bitmap => {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    const sourceY = Math.floor((y * source.height) / height)
    for (let x = 0; x < width; x++) {
      const sourceX = Math.floor((x * source.width) / width)
      const sourceIndex = (sourceY * source.width + sourceX) * 4
      const destinationIndex = (y * width + x) * 4
      data[destinationIndex] = source.data[sourceIndex]
      data[destinationIndex + 1] = source.data[sourceIndex + 1]
      data[destinationIndex + 2] = source.data[sourceIndex + 2]
      data[destinationIndex + 3] = source.data[sourceIndex + 3]
    }
  }
  return { data, width, height }
}

type InkedTip = BrushTip & { color: Rgba }

export const stampDisc = (
  bitmap: Bitmap,
  at: Point,
  size: number,
  color: Rgba,
): void => {
  writeMask(bitmap, at, discMask(size), color)
}

export const stampBrush = (bitmap: Bitmap, at: Point, tip: InkedTip): void => {
  writeMask(bitmap, at, brushMask(tip), tip.color)
}

export const drawLine = (
  bitmap: Bitmap,
  from: Point,
  to: Point,
  options: { color: Rgba; size: number },
): void => {
  const mask = discMask(options.size)
  for (const point of linePoints(from, to)) {
    writeMask(bitmap, point, mask, options.color)
  }
}

export const brushStroke = (
  bitmap: Bitmap,
  from: Point,
  to: Point,
  tip: InkedTip,
): void => {
  const mask = brushMask(tip)
  for (const point of linePoints(from, to)) {
    writeMask(bitmap, point, mask, tip.color)
  }
}

const writeShape = (
  bitmap: Bitmap,
  shape: ShapeSpans,
  style: ShapeStyle,
): void => {
  if (style.fill) writeSpans(bitmap, shape.fill, style.fill)
  if (style.stroke) writeSpans(bitmap, shape.outline, style.stroke)
}

export const drawRect = (
  bitmap: Bitmap,
  a: Point,
  b: Point,
  style: ShapeStyle,
): void => {
  writeShape(bitmap, rectSpans(orderedBounds(a, b)), style)
}

export const drawEllipse = (
  bitmap: Bitmap,
  a: Point,
  b: Point,
  style: ShapeStyle,
): void => {
  const bounds = orderedBounds(a, b)
  if (bounds.x0 === bounds.x1 || bounds.y0 === bounds.y1) {
    drawLine(
      bitmap,
      { x: bounds.x0, y: bounds.y0 },
      { x: bounds.x1, y: bounds.y1 },
      { color: style.stroke ?? style.fill ?? [0, 0, 0, 255], size: 1 },
    )
    return
  }
  writeShape(bitmap, ellipseSpans(bounds), style)
}

export const drawRoundedRect = (
  bitmap: Bitmap,
  a: Point,
  b: Point,
  style: ShapeStyle,
): void => {
  writeShape(bitmap, roundedRectSpans(orderedBounds(a, b)), style)
}

export const drawPolygon = (
  bitmap: Bitmap,
  points: readonly Point[],
  style: ShapeStyle,
): void => {
  if (points.length < 2) return
  if (style.fill) writeSpans(bitmap, polygonSpans(points), style.fill)
  if (!style.stroke) return
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length]
    drawLine(bitmap, points[i], next, { color: style.stroke, size: 1 })
  }
}

export const drawCurve = (
  bitmap: Bitmap,
  spec: CurveSpec & { color: Rgba; size: number },
): void => {
  const points = curvePoints(spec)
  for (let i = 1; i < points.length; i++) {
    drawLine(bitmap, points[i - 1], points[i], {
      color: spec.color,
      size: spec.size,
    })
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
  for (const offset of sprayOffsets(options.size, options.rng, options.dots)) {
    setPixel(
      bitmap,
      Math.round(at.x + offset.x),
      Math.round(at.y + offset.y),
      options.color,
    )
  }
}
