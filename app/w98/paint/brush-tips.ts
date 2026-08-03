import type { Point } from './geometry.ts'
import type { BrushShape } from './options.ts'

export type BrushTip = { shape: BrushShape; size: number }

type SlashShape = Extract<BrushShape, 'diagonal' | 'reverseDiagonal'>

// pure derivation over a bounded domain: sizes stay single-digit
const masks = new Map<string, readonly Point[]>()

const memoized = (
  key: string,
  build: () => readonly Point[],
): readonly Point[] => {
  const cached = masks.get(key)
  if (cached) return cached
  const mask = build()
  masks.set(key, mask)
  return mask
}

const buildDisc = (size: number): readonly Point[] => {
  if (size <= 1) return [{ x: 0, y: 0 }]
  const radius = size / 2
  const anchor = size >> 1
  const points: Point[] = []
  for (let offsetY = 0; offsetY < size; offsetY++) {
    for (let offsetX = 0; offsetX < size; offsetX++) {
      const distanceX = offsetX + 0.5 - radius
      const distanceY = offsetY + 0.5 - radius
      if (distanceX * distanceX + distanceY * distanceY > radius * radius) {
        continue
      }
      points.push({ x: offsetX - anchor, y: offsetY - anchor })
    }
  }
  return points
}

const buildSquare = (size: number): readonly Point[] => {
  const anchor = size >> 1
  const points: Point[] = []
  for (let offsetY = 0; offsetY < size; offsetY++) {
    for (let offsetX = 0; offsetX < size; offsetX++) {
      points.push({ x: offsetX - anchor, y: offsetY - anchor })
    }
  }
  return points
}

const buildSlash = (shape: SlashShape, size: number): readonly Point[] => {
  const anchor = size >> 1
  const points: Point[] = []
  for (let i = 0; i < size; i++) {
    const rise = shape === 'diagonal' ? anchor - i : i - anchor
    points.push({ x: i - anchor, y: rise })
  }
  return points
}

export const discMask = (size: number): readonly Point[] =>
  memoized(`circle:${size}`, () => buildDisc(size))

export const squareMask = (size: number): readonly Point[] =>
  memoized(`square:${size}`, () => buildSquare(size))

export const slashMask = (shape: SlashShape, size: number): readonly Point[] =>
  memoized(`${shape}:${size}`, () => buildSlash(shape, size))

export const brushMask = (tip: BrushTip): readonly Point[] => {
  if (tip.shape === 'circle') return discMask(tip.size)
  if (tip.shape === 'square') return squareMask(tip.size)
  return slashMask(tip.shape, tip.size)
}
