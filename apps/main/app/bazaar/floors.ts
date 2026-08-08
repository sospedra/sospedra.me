import type { BazaarStallId } from './stalls-manifest'

export type DesktopFloor = { stalls: BazaarStallId[]; stairsRight: boolean }
export type MobileFloor = {
  stalls: [BazaarStallId] | [BazaarStallId, BazaarStallId]
  smRight: boolean
}

export type FloorsConfig = { desktop: DesktopFloor[]; mobile: MobileFloor[] }

/* defaults; a saved decor.json floors block overrides them.
   S sides: R, L, R, L (spec rule 5) */
export const DESKTOP_FLOORS: DesktopFloor[] = [
  { stalls: ['uses', 'map'], stairsRight: true },
  { stalls: ['manual', 'console', 'games'], stairsRight: false },
  { stalls: ['scavenger', 'talks'], stairsRight: true },
  { stalls: ['w98', 'papers', 'travel'], stairsRight: false },
]

/* SM sides: L, R, L, R, L (spec rule 5); stalls listed top story first */
export const MOBILE_FLOORS: MobileFloor[] = [
  { stalls: ['map', 'uses'], smRight: false },
  { stalls: ['console', 'manual'], smRight: true },
  { stalls: ['games', 'scavenger'], smRight: false },
  { stalls: ['talks', 'w98'], smRight: true },
  { stalls: ['papers', 'travel'], smRight: false },
]
