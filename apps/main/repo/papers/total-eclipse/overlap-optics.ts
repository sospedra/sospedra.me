/**
 * The geometry and photometry behind the overlap lab: two discs, one light
 * meter. Lengths are in solar radii, so the sun is always radius 1.
 */

export type EclipseKind3 = 'total' | 'annular' | 'partial'

export type DiscConfig = {
  /** Apparent lunar radius over the solar one. */
  moonRadius: number
  /** Closest approach of the two centers, in solar radii. */
  minSeparation: number
}

/**
 * Total and annular differ only in the ratio: 1.045 is the 12 Aug 2026 fit,
 * 0.955 the 26 Jan 2028 annular. Partial keeps the total moon but misses.
 */
export const DISC_CONFIGS: Record<EclipseKind3, DiscConfig> = {
  total: { moonRadius: 1.045, minSeparation: 0 },
  annular: { moonRadius: 0.955, minSeparation: 0 },
  partial: { moonRadius: 1.045, minSeparation: 0.82 },
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

/** Circle-circle overlap over the solar disc area. */
export const overlapFraction = (
  separation: number,
  sunRadius: number,
  moonRadius: number,
): number => {
  if (separation <= Math.abs(moonRadius - sunRadius)) {
    return Math.min(1, (moonRadius / sunRadius) ** 2)
  }
  if (separation >= sunRadius + moonRadius) return 0
  const x =
    (separation * separation +
      sunRadius * sunRadius -
      moonRadius * moonRadius) /
    (2 * separation)
  const y = Math.sqrt(Math.max(sunRadius * sunRadius - x * x, 0))
  const clampCos = (value: number) => Math.max(-1, Math.min(1, value))
  return (
    (sunRadius * sunRadius * Math.acos(clampCos(x / sunRadius)) +
      moonRadius *
        moonRadius *
        Math.acos(clampCos((separation - x) / moonRadius)) -
      separation * y) /
    (Math.PI * sunRadius * sunRadius)
  )
}

export type OverlapMoment = {
  moonX: number
  moonY: number
  moonRadius: number
  separation: number
  obscuration: number
  totality: boolean
  ringOfFire: boolean
  diamondRing: boolean
}

const TRACK_HALF_SPAN = 1.25
export const TOTAL_THRESHOLD = 0.9996

/** One straight pass of the moon across the sun, `t` from -1 to 1. */
export const momentAt = (kind: EclipseKind3, t: number): OverlapMoment => {
  const config = DISC_CONFIGS[kind]
  const moonX = t * (1 + config.moonRadius) * TRACK_HALF_SPAN
  const moonY = config.minSeparation
  const separation = Math.hypot(moonX, moonY)
  const obscuration = overlapFraction(separation, 1, config.moonRadius)
  const totality = kind === 'total' && separation <= config.moonRadius - 1
  return {
    moonX,
    moonY,
    moonRadius: config.moonRadius,
    separation,
    obscuration,
    totality,
    ringOfFire: kind === 'annular' && separation <= 1 - config.moonRadius,
    diamondRing: kind === 'total' && !totality && obscuration > 0.992,
  }
}

/**
 * The paper's ladder: clear noon 100,000 lux, one percent of photosphere is
 * still 1,000 lux, and totality falls to the corona at full-moon level.
 */
export const NOON_LUX = 100_000
export const CORONA_LUX = 0.25

export const luxAt = (moment: OverlapMoment): number => {
  const photosphere = NOON_LUX * (1 - moment.obscuration)
  if (moment.totality) return CORONA_LUX
  return Math.max(photosphere, CORONA_LUX)
}

const LUX_FLOOR_LOG = Math.log10(CORONA_LUX)
const LUX_SPAN_LOG = Math.log10(NOON_LUX) - LUX_FLOOR_LOG

/** Position of a lux value on the log gauge, 0 at corona, 1 at noon. */
export const luxGaugePosition = (lux: number): number =>
  clamp01(
    (Math.log10(Math.max(lux, CORONA_LUX)) - LUX_FLOOR_LOG) / LUX_SPAN_LOG,
  )

/**
 * Rod vision takes over as the light dies: 0 above 1,000 lux where cones own
 * the scene, 1 below 1 lux where only rods see. Red collapses first.
 */
export const purkinjeBlend = (lux: number): number =>
  clamp01((3 - Math.log10(Math.max(lux, 0.01))) / 3)

/** How dark the scene paints, on the same log scale the eye ignores. */
export const sceneDarkness = (lux: number): number => 1 - luxGaugePosition(lux)

export const formatLux = (lux: number): string => {
  if (lux >= 10_000) return `${Math.round(lux / 1000)}k lux`
  if (lux >= 1000) return `${(lux / 1000).toFixed(1)}k lux`
  if (lux >= 10) return `${Math.round(lux)} lux`
  return `${lux.toFixed(2)} lux`
}

type Verdict = { when: (moment: OverlapMoment) => boolean; text: string }

const VERDICTS: Verdict[] = [
  {
    when: (moment) => moment.totality,
    text: 'Totality. Glasses off: the corona is moonlight, and moonlight is safe.',
  },
  {
    when: (moment) => moment.ringOfFire,
    text: 'The ring of fire. Still thousands of lux, so the glasses never come off.',
  },
  {
    when: (moment) => moment.diamondRing,
    text: 'The diamond ring. The last bead of photosphere outshines the whole corona.',
  },
  {
    when: (moment) => moment.obscuration > 0.99,
    text: 'The last percent. The sliver still owns the sky, and now it goes fast.',
  },
  {
    when: (moment) => moment.obscuration > 0.9,
    text: 'Shadows sharpen and the light turns metallic. Red is starting to lose.',
  },
  {
    when: (moment) => moment.obscuration > 0.5,
    text: 'Half the sun is gone and the day barely dims. Your pupils are cheating.',
  },
  {
    when: (moment) => moment.obscuration > 0.02,
    text: 'A bite leaves the cookie. Without glasses nobody would notice.',
  },
]

export const verdictAt = (moment: OverlapMoment): string =>
  VERDICTS.find((verdict) => verdict.when(moment))?.text ??
  'Two disks, half a degree each, closing in.'
