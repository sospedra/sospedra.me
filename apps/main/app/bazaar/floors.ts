import type { BazaarStallId } from './stalls-manifest'

export type DesktopFloor = { stalls: BazaarStallId[]; stairsRight: boolean }
export type MobileFloor = {
  stalls: [BazaarStallId] | [BazaarStallId, BazaarStallId]
  smRight: boolean
}

/* S sides: R, L, R (spec rule 5) */
export const DESKTOP_FLOORS: DesktopFloor[] = [
  { stalls: ['uses', 'papers', 'map'], stairsRight: true },
  { stalls: ['manual', 'console', 'talks'], stairsRight: false },
  { stalls: ['w98', 'games', 'travel'], stairsRight: true },
]

/* SM sides: L, R, L, R, L (spec rule 5); solo map floor sits at the entrance */
export const MOBILE_FLOORS: MobileFloor[] = [
  { stalls: ['map'], smRight: false },
  { stalls: ['uses', 'papers'], smRight: true },
  { stalls: ['manual', 'talks'], smRight: false },
  { stalls: ['console', 'w98'], smRight: true },
  { stalls: ['games', 'travel'], smRight: false },
]
