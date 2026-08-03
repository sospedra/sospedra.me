export type Point = { x: number; y: number }

export type Rect = { x: number; y: number; width: number; height: number }

export type Bounds = { x0: number; y0: number; x1: number; y1: number }

export type Handle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

export const orderedBounds = (a: Point, b: Point): Bounds => ({
  x0: Math.min(a.x, b.x),
  y0: Math.min(a.y, b.y),
  x1: Math.max(a.x, b.x),
  y1: Math.max(a.y, b.y),
})

export const rectFromPoints = (a: Point, b: Point): Rect => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  width: Math.abs(b.x - a.x) + 1,
  height: Math.abs(b.y - a.y) + 1,
})

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

export const distance = (a: Point, b: Point): number =>
  Math.hypot(b.x - a.x, b.y - a.y)

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
