import type { Point } from './geometry.ts'
import type { Rgba } from './palette.ts'
import type { Bitmap } from './raster.ts'

// Scanline flood fill on exact RGBA match. Each pixel paints once, so the
// stack drains in O(width * height).
export const floodFill = (bitmap: Bitmap, at: Point, color: Rgba): boolean => {
  if (at.x < 0 || at.y < 0 || at.x >= bitmap.width || at.y >= bitmap.height) {
    return false
  }
  const { data, width } = bitmap
  const start = (at.y * width + at.x) * 4
  const target = data.slice(start, start + 4)
  const same =
    target[0] === color[0] &&
    target[1] === color[1] &&
    target[2] === color[2] &&
    target[3] === color[3]
  if (same) return false

  const matches = (x: number, y: number): boolean => {
    const i = (y * width + x) * 4
    return (
      data[i] === target[0] &&
      data[i + 1] === target[1] &&
      data[i + 2] === target[2] &&
      data[i + 3] === target[3]
    )
  }
  const paint = (x: number, y: number): void => {
    const i = (y * width + x) * 4
    data[i] = color[0]
    data[i + 1] = color[1]
    data[i + 2] = color[2]
    data[i + 3] = color[3]
  }
  const seedRow = (
    left: number,
    right: number,
    y: number,
    stack: Point[],
  ): void => {
    if (y < 0 || y >= bitmap.height) return
    for (let x = left; x <= right; x++) {
      if (!matches(x, y)) continue
      if (x === left || !matches(x - 1, y)) stack.push({ x, y })
    }
  }

  const stack: Point[] = [at]
  while (stack.length > 0) {
    const seed = stack.pop() as Point
    if (!matches(seed.x, seed.y)) continue
    let left = seed.x
    while (left > 0 && matches(left - 1, seed.y)) left--
    let right = seed.x
    while (right < width - 1 && matches(right + 1, seed.y)) right++
    for (let x = left; x <= right; x++) paint(x, seed.y)
    seedRow(left, right, seed.y - 1, stack)
    seedRow(left, right, seed.y + 1, stack)
  }
  return true
}
