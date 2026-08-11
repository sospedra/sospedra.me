import type { StickerKind } from './sticker-art'

export type Landing = 'near' | 'far'

export type Spot = {
  kind: StickerKind
  x: number
  y: number
  r: number
  s: number
  fresh?: boolean
  landing?: Landing
}

export type Placement = { dx: number; dy: number; z: number }

export type DragState = {
  id: string
  startX: number
  startY: number
  baseX: number
  baseY: number
}

export const BOARD: Record<string, Spot> = {
  wordmark: { kind: 'wordmark', x: 50, y: 38, r: -4, s: 1 },
  stack: { kind: 'stack', x: 15, y: 22, r: -8, s: 1 },
  block: { kind: 'block', x: 84, y: 24, r: 6, s: 1 },
  cloud: { kind: 'cloud', x: 82, y: 66, r: -5, s: 1 },
  barcode: { kind: 'barcode', x: 20, y: 82, r: 3, s: 1 },
  smiley: { kind: 'smiley', x: 8, y: 55, r: 12, s: 1 },
  bolt: { kind: 'bolt', x: 68, y: 12, r: -14, s: 1 },
  flower: { kind: 'flower', x: 34, y: 12, r: 9, s: 0.9 },
  eye: { kind: 'eye', x: 62, y: 84, r: -7, s: 1 },
  cherry: { kind: 'cherry', x: 41, y: 78, r: -12, s: 1 },
  burst: { kind: 'burst', x: 92, y: 45, r: 10, s: 1 },
  ok: { kind: 'ok', x: 28, y: 60, r: 15, s: 0.85 },
}

export const SPAWN_CAP = 22

const rand = (min: number, max: number) => min + Math.random() * (max - min)

export const randomSpot = (kind: StickerKind, landing: Landing): Spot => ({
  kind,
  x: rand(16, 78),
  y: rand(14, 74),
  r: rand(-17, 17),
  s: rand(0.75, 1.15),
  fresh: true,
  landing,
})

export const trimOldest = (spawned: Record<string, Spot>) => {
  const entries = Object.entries(spawned)
  if (entries.length < SPAWN_CAP) return spawned
  return Object.fromEntries(entries.slice(entries.length - SPAWN_CAP + 1))
}
