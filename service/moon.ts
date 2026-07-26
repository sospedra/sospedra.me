// Mean-cycle approximation anchored to the new moon of 2000-01-06 18:14 UTC.
// True phases drift up to ±0.6 days from the mean; fine for a sky sprite.
export const SYNODIC_MONTH_MS = 29.53058867 * 86_400_000
const NEW_MOON_EPOCH_MS = Date.UTC(2000, 0, 6, 18, 14)

const PHASE_NAMES = [
  'New moon',
  'Waxing crescent',
  'First quarter',
  'Waxing gibbous',
  'Full moon',
  'Waning gibbous',
  'Last quarter',
  'Waning crescent',
] as const

export type MoonPhase = {
  illumination: number
  name: (typeof PHASE_NAMES)[number]
  waxing: boolean
}

export const moonPhase = (date: Date): MoonPhase => {
  const elapsed = date.getTime() - NEW_MOON_EPOCH_MS
  const age =
    ((elapsed % SYNODIC_MONTH_MS) + SYNODIC_MONTH_MS) % SYNODIC_MONTH_MS
  const fraction = age / SYNODIC_MONTH_MS

  return {
    illumination: (1 - Math.cos(2 * Math.PI * fraction)) / 2,
    name: PHASE_NAMES[Math.round(fraction * 8) % 8],
    waxing: fraction < 0.5,
  }
}

// Latitude leans the lit limb over. No hour term: it spun 10.5°/hour and
// flipped the shadow side past ±90°, reading as a wrong phase.
export const moonTilt = (lat: number): number => lat * 1.5
