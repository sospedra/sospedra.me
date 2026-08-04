import { memoize } from 'es-toolkit'
import type { Point } from './geometry.ts'
import type { BrushShape } from './options.ts'

export type BrushTip = { shape: BrushShape; size: number }

type SlashShape = Extract<BrushShape, 'diagonal' | 'reverseDiagonal'>

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

const buildMask = (tip: BrushTip): readonly Point[] => {
  if (tip.shape === 'circle') return buildDisc(tip.size)
  if (tip.shape === 'square') return buildSquare(tip.size)
  return buildSlash(tip.shape, tip.size)
}

// pure derivation over a bounded domain: sizes stay single-digit
const maskFor = memoize(buildMask, {
  getCacheKey: (tip: BrushTip) => `${tip.shape}:${tip.size}`,
})

export const discMask = (size: number): readonly Point[] =>
  maskFor({ shape: 'circle', size })

export const squareMask = (size: number): readonly Point[] =>
  maskFor({ shape: 'square', size })

export const slashMask = (shape: SlashShape, size: number): readonly Point[] =>
  maskFor({ shape, size })

export const brushMask = (tip: BrushTip): readonly Point[] => maskFor(tip)
