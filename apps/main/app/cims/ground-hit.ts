import type { HeightSampler, Vec3 } from './flight.ts'

export type GroundPoint = { x: number; z: number }

const MARCH_START = 40
const MARCH_LIMIT = 600000
const MARCH_STEPS = 400
const REFINE_STEPS = 10

const below = (
  origin: Vec3,
  dir: Vec3,
  t: number,
  heightAtEx: HeightSampler,
): boolean =>
  origin.y + dir.y * t <= heightAtEx(origin.x + dir.x * t, origin.z + dir.z * t)

export const marchGround = (
  origin: Vec3,
  dir: Vec3,
  heightAtEx: HeightSampler,
): GroundPoint | null => {
  let t = MARCH_START
  let hit = -1
  let step = 0
  for (let i = 0; i < MARCH_STEPS && t < MARCH_LIMIT; i++) {
    step = MARCH_START + t * 0.02
    if (below(origin, dir, t, heightAtEx)) {
      hit = t
      break
    }
    t += step
  }
  if (hit < 0) return null
  let lo = Math.max(MARCH_START, hit - step)
  let hi = hit
  for (let i = 0; i < REFINE_STEPS; i++) {
    const mid = (lo + hi) / 2
    if (below(origin, dir, mid, heightAtEx)) hi = mid
    else lo = mid
  }
  const mid = (lo + hi) / 2
  return { x: origin.x + dir.x * mid, z: origin.z + dir.z * mid }
}
