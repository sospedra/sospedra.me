import { clipRect, type Point, type Rect } from './geometry.ts'
import type { Rgba } from './palette.ts'
import { type Bitmap, type BlitOptions, blit, writeSpans } from './raster.ts'
import { rectSpans } from './spans.ts'

export const lift = (bitmap: Bitmap, rect: Rect): Bitmap => {
  const float: Bitmap = {
    data: new Uint8ClampedArray(rect.width * rect.height * 4),
    width: rect.width,
    height: rect.height,
  }
  blit(float, bitmap, { x: -rect.x, y: -rect.y })
  return float
}

export const fillRect = (bitmap: Bitmap, rect: Rect, color: Rgba): void => {
  const clipped = clipRect(rect, bitmap.width, bitmap.height)
  if (!clipped) return
  const rows = rectSpans({
    x0: clipped.x,
    y0: clipped.y,
    x1: clipped.x + clipped.width - 1,
    y1: clipped.y + clipped.height - 1,
  })
  writeSpans(bitmap, rows.fill, color)
}

export const stamp = (
  destination: Bitmap,
  source: Bitmap,
  at: Point,
  options: BlitOptions = {},
): void => {
  blit(destination, source, at, options)
}
