import type { Rgba } from './palette.ts'
import type { Bitmap, Point, Rect } from './raster.ts'
import type { Handle } from './state.ts'

export const clipRect = (
  rect: Rect,
  width: number,
  height: number,
): Rect | null => {
  const x0 = Math.max(rect.x, 0)
  const y0 = Math.max(rect.y, 0)
  const x1 = Math.min(rect.x + rect.width, width)
  const y1 = Math.min(rect.y + rect.height, height)
  if (x1 <= x0 || y1 <= y0) return null
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }
}

export const insideRect = (rect: Rect, at: Point): boolean =>
  at.x >= rect.x &&
  at.x < rect.x + rect.width &&
  at.y >= rect.y &&
  at.y < rect.y + rect.height

export const handlePoints = (rect: Rect): readonly [Handle, Point][] => {
  const x1 = rect.x + rect.width - 1
  const y1 = rect.y + rect.height - 1
  const midX = rect.x + (rect.width >> 1)
  const midY = rect.y + (rect.height >> 1)
  return [
    ['nw', { x: rect.x, y: rect.y }],
    ['ne', { x: x1, y: rect.y }],
    ['sw', { x: rect.x, y: y1 }],
    ['se', { x: x1, y: y1 }],
    ['n', { x: midX, y: rect.y }],
    ['s', { x: midX, y: y1 }],
    ['w', { x: rect.x, y: midY }],
    ['e', { x: x1, y: midY }],
  ]
}

export const handleTolerance = (zoom: number): number =>
  Math.max(2, Math.ceil(3 / zoom))

export const handleAt = (
  rect: Rect,
  at: Point,
  tolerance: number,
): Handle | null => {
  const hit = handlePoints(rect).find(
    ([, point]) =>
      Math.abs(at.x - point.x) <= tolerance &&
      Math.abs(at.y - point.y) <= tolerance,
  )
  return hit ? hit[0] : null
}

export const lift = (bitmap: Bitmap, rect: Rect): Bitmap => {
  const data = new Uint8ClampedArray(rect.width * rect.height * 4)
  for (let row = 0; row < rect.height; row++) {
    const sourceOffset = ((rect.y + row) * bitmap.width + rect.x) * 4
    data.set(
      bitmap.data.subarray(sourceOffset, sourceOffset + rect.width * 4),
      row * rect.width * 4,
    )
  }
  return { data, width: rect.width, height: rect.height }
}

export const fillRect = (bitmap: Bitmap, rect: Rect, color: Rgba): void => {
  const clipped = clipRect(rect, bitmap.width, bitmap.height)
  if (!clipped) return
  for (let row = 0; row < clipped.height; row++) {
    for (let col = 0; col < clipped.width; col++) {
      const i = ((clipped.y + row) * bitmap.width + clipped.x + col) * 4
      bitmap.data[i] = color[0]
      bitmap.data[i + 1] = color[1]
      bitmap.data[i + 2] = color[2]
      bitmap.data[i + 3] = color[3]
    }
  }
}

export type StampOptions = { skip?: Rgba }

export const stamp = (
  destination: Bitmap,
  source: Bitmap,
  at: Point,
  options: StampOptions = {},
): void => {
  for (let sourceY = 0; sourceY < source.height; sourceY++) {
    const destinationY = at.y + sourceY
    if (destinationY < 0 || destinationY >= destination.height) continue
    for (let sourceX = 0; sourceX < source.width; sourceX++) {
      const destinationX = at.x + sourceX
      if (destinationX < 0 || destinationX >= destination.width) continue
      const sourceIndex = (sourceY * source.width + sourceX) * 4
      const skip =
        options.skip &&
        source.data[sourceIndex] === options.skip[0] &&
        source.data[sourceIndex + 1] === options.skip[1] &&
        source.data[sourceIndex + 2] === options.skip[2] &&
        source.data[sourceIndex + 3] === options.skip[3]
      if (skip) continue
      const destinationIndex =
        (destinationY * destination.width + destinationX) * 4
      destination.data[destinationIndex] = source.data[sourceIndex]
      destination.data[destinationIndex + 1] = source.data[sourceIndex + 1]
      destination.data[destinationIndex + 2] = source.data[sourceIndex + 2]
      destination.data[destinationIndex + 3] = source.data[sourceIndex + 3]
    }
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
