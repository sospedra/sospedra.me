import type { Rgba } from './palette.ts'
import type { Bitmap, Pt, Rect } from './raster.ts'
import type { Handle } from './state.ts'

export const clipRect = (rect: Rect, w: number, h: number): Rect | null => {
  const x0 = Math.max(rect.x, 0)
  const y0 = Math.max(rect.y, 0)
  const x1 = Math.min(rect.x + rect.w, w)
  const y1 = Math.min(rect.y + rect.h, h)
  if (x1 <= x0 || y1 <= y0) return null
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

export const insideRect = (rect: Rect, at: Pt): boolean =>
  at.x >= rect.x &&
  at.x < rect.x + rect.w &&
  at.y >= rect.y &&
  at.y < rect.y + rect.h

export const handlePoints = (rect: Rect): readonly [Handle, Pt][] => {
  const x1 = rect.x + rect.w - 1
  const y1 = rect.y + rect.h - 1
  const mx = rect.x + (rect.w >> 1)
  const my = rect.y + (rect.h >> 1)
  return [
    ['nw', { x: rect.x, y: rect.y }],
    ['ne', { x: x1, y: rect.y }],
    ['sw', { x: rect.x, y: y1 }],
    ['se', { x: x1, y: y1 }],
    ['n', { x: mx, y: rect.y }],
    ['s', { x: mx, y: y1 }],
    ['w', { x: rect.x, y: my }],
    ['e', { x: x1, y: my }],
  ]
}

export const handleTolerance = (zoom: number): number =>
  Math.max(2, Math.ceil(3 / zoom))

export const handleAt = (
  rect: Rect,
  at: Pt,
  tolerance: number,
): Handle | null => {
  const hit = handlePoints(rect).find(
    ([, point]) =>
      Math.abs(at.x - point.x) <= tolerance &&
      Math.abs(at.y - point.y) <= tolerance,
  )
  return hit ? hit[0] : null
}

export const lift = (bmp: Bitmap, rect: Rect): Bitmap => {
  const data = new Uint8ClampedArray(rect.w * rect.h * 4)
  for (let row = 0; row < rect.h; row++) {
    const from = ((rect.y + row) * bmp.w + rect.x) * 4
    data.set(bmp.data.subarray(from, from + rect.w * 4), row * rect.w * 4)
  }
  return { data, w: rect.w, h: rect.h }
}

export const fillRect = (bmp: Bitmap, rect: Rect, color: Rgba): void => {
  const clipped = clipRect(rect, bmp.w, bmp.h)
  if (!clipped) return
  for (let row = 0; row < clipped.h; row++) {
    for (let col = 0; col < clipped.w; col++) {
      const i = ((clipped.y + row) * bmp.w + clipped.x + col) * 4
      bmp.data[i] = color[0]
      bmp.data[i + 1] = color[1]
      bmp.data[i + 2] = color[2]
      bmp.data[i + 3] = color[3]
    }
  }
}

export type StampOpts = { skip?: Rgba }

export const stamp = (
  dst: Bitmap,
  src: Bitmap,
  at: Pt,
  opts: StampOpts = {},
): void => {
  for (let sy = 0; sy < src.h; sy++) {
    const dy = at.y + sy
    if (dy < 0 || dy >= dst.h) continue
    for (let sx = 0; sx < src.w; sx++) {
      const dx = at.x + sx
      if (dx < 0 || dx >= dst.w) continue
      const si = (sy * src.w + sx) * 4
      const skip =
        opts.skip &&
        src.data[si] === opts.skip[0] &&
        src.data[si + 1] === opts.skip[1] &&
        src.data[si + 2] === opts.skip[2] &&
        src.data[si + 3] === opts.skip[3]
      if (skip) continue
      const di = (dy * dst.w + dx) * 4
      dst.data[di] = src.data[si]
      dst.data[di + 1] = src.data[si + 1]
      dst.data[di + 2] = src.data[si + 2]
      dst.data[di + 3] = src.data[si + 3]
    }
  }
}

export const scaleNearest = (src: Bitmap, w: number, h: number): Bitmap => {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    const sy = Math.floor((y * src.h) / h)
    for (let x = 0; x < w; x++) {
      const sx = Math.floor((x * src.w) / w)
      const si = (sy * src.w + sx) * 4
      const di = (y * w + x) * 4
      data[di] = src.data[si]
      data[di + 1] = src.data[si + 1]
      data[di + 2] = src.data[si + 2]
      data[di + 3] = src.data[si + 3]
    }
  }
  return { data, w, h }
}
