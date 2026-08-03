import type { Rgba } from './palette.ts'
import type { Bitmap, Pt } from './raster.ts'

// Scanline flood fill on exact RGBA match. Each pixel paints once, so the
// stack drains in O(w * h).
export const floodFill = (bmp: Bitmap, at: Pt, color: Rgba): boolean => {
  if (at.x < 0 || at.y < 0 || at.x >= bmp.w || at.y >= bmp.h) return false
  const { data, w } = bmp
  const start = (at.y * w + at.x) * 4
  const target = data.slice(start, start + 4)
  const same =
    target[0] === color[0] &&
    target[1] === color[1] &&
    target[2] === color[2] &&
    target[3] === color[3]
  if (same) return false

  const matches = (x: number, y: number): boolean => {
    const i = (y * w + x) * 4
    return (
      data[i] === target[0] &&
      data[i + 1] === target[1] &&
      data[i + 2] === target[2] &&
      data[i + 3] === target[3]
    )
  }
  const paint = (x: number, y: number): void => {
    const i = (y * w + x) * 4
    data[i] = color[0]
    data[i + 1] = color[1]
    data[i + 2] = color[2]
    data[i + 3] = color[3]
  }
  const seedRow = (xl: number, xr: number, y: number, stack: Pt[]): void => {
    if (y < 0 || y >= bmp.h) return
    for (let x = xl; x <= xr; x++) {
      if (!matches(x, y)) continue
      if (x === xl || !matches(x - 1, y)) stack.push({ x, y })
    }
  }

  const stack: Pt[] = [at]
  while (stack.length > 0) {
    const seed = stack.pop() as Pt
    if (!matches(seed.x, seed.y)) continue
    let xl = seed.x
    while (xl > 0 && matches(xl - 1, seed.y)) xl--
    let xr = seed.x
    while (xr < w - 1 && matches(xr + 1, seed.y)) xr++
    for (let x = xl; x <= xr; x++) paint(x, seed.y)
    seedRow(xl, xr, seed.y - 1, stack)
    seedRow(xl, xr, seed.y + 1, stack)
  }
  return true
}
