/**
 * Local circumstances for the total solar eclipse of 12 August 2026.
 *
 * The data file holds geocentric ECEF positions of the moon and the sun,
 * sampled every 30 s from 16:30 to 21:00 UT, computed from the JPL DE421
 * ephemeris. Everything below is plane geometry on those two vectors, so any
 * point on Earth resolves without a network call.
 *
 * No lunar limb profile is applied. At the edge of the band the real duration
 * can differ by a few seconds.
 */

const SAMPLE_START_S = 16.5 * 3600
const SAMPLE_STEP_S = 30
const FLOATS_PER_SAMPLE = 6

const SUN_RADIUS_KM = 696_000
const MOON_RADIUS_KM = 1737.4
const EARTH_RADIUS_KM = 6378.137
const EARTH_ECCENTRICITY_SQUARED = 6.694_379_990_14e-3

const DEG = 180 / Math.PI

export type Site = {
  x: number
  y: number
  z: number
  up: readonly [number, number, number]
  east: readonly [number, number, number]
  north: readonly [number, number, number]
}

export type Instant = {
  /** Angular separation of the two disk centers, radians. */
  separation: number
  /** Apparent solar radius, radians. */
  sunRadius: number
  /** Apparent lunar radius, radians. */
  moonRadius: number
  /** Fraction of the solar disk area covered, 0 to 1. */
  obscuration: number
  sunAltitude: number
  sunAzimuth: number
  moonAltitude: number
  moonAzimuth: number
}

export type Circumstances = {
  site: Site
  latitude: number
  longitude: number
  maxObscuration: number
  /** Absent when the eclipse never touches this site. */
  timeline?: {
    firstContact: number
    maximum: number
    lastContact: number
    sunAltitude: number
    sunAzimuth: number
  }
  /** Present only inside the band. */
  totality?: {
    start: number
    end: number
    seconds: number
  }
}

const clamp = (value: number, low: number, high: number) =>
  Math.max(low, Math.min(high, value))

const decodeSamples = (base64: string): Float32Array => {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new Float32Array(bytes.buffer)
}

export type ShadowEngine = ReturnType<typeof createShadowEngine>

export const createShadowEngine = (base64: string) => {
  const samples = decodeSamples(base64)
  const count = samples.length / FLOATS_PER_SAMPLE
  const endSeconds = SAMPLE_START_S + (count - 1) * SAMPLE_STEP_S

  const siteAt = (latitude: number, longitude: number): Site => {
    const lat = latitude / DEG
    const lon = longitude / DEG
    const sinLat = Math.sin(lat)
    const cosLat = Math.cos(lat)
    const curvature =
      EARTH_RADIUS_KM /
      Math.sqrt(1 - EARTH_ECCENTRICITY_SQUARED * sinLat * sinLat)
    return {
      x: curvature * cosLat * Math.cos(lon),
      y: curvature * cosLat * Math.sin(lon),
      z: curvature * (1 - EARTH_ECCENTRICITY_SQUARED) * sinLat,
      up: [cosLat * Math.cos(lon), cosLat * Math.sin(lon), sinLat],
      east: [-Math.sin(lon), Math.cos(lon), 0],
      north: [-sinLat * Math.cos(lon), -sinLat * Math.sin(lon), cosLat],
    }
  }

  const topocentric = (
    vx: number,
    vy: number,
    vz: number,
    distance: number,
    site: Site,
  ) => {
    const ux = vx / distance
    const uy = vy / distance
    const uz = vz / distance
    const altitude = Math.asin(
      ux * site.up[0] + uy * site.up[1] + uz * site.up[2],
    )
    const azimuth = Math.atan2(
      ux * site.east[0] + uy * site.east[1] + uz * site.east[2],
      ux * site.north[0] + uy * site.north[1] + uz * site.north[2],
    )
    return { altitude: altitude * DEG, azimuth: (azimuth * DEG + 360) % 360 }
  }

  /** Circle-circle intersection area over the solar disk area. */
  const overlapFraction = (
    separation: number,
    sunRadius: number,
    moonRadius: number,
  ) => {
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
    return (
      (sunRadius * sunRadius * Math.acos(clamp(x / sunRadius, -1, 1)) +
        moonRadius *
          moonRadius *
          Math.acos(clamp((separation - x) / moonRadius, -1, 1)) -
        separation * y) /
      (Math.PI * sunRadius * sunRadius)
    )
  }

  const instantAt = (site: Site, seconds: number): Instant => {
    const frame = clamp(
      (seconds - SAMPLE_START_S) / SAMPLE_STEP_S,
      0,
      count - 1.001,
    )
    const index = Math.floor(frame)
    const blend = frame - index
    const o = index * FLOATS_PER_SAMPLE
    const lerp = (offset: number) =>
      samples[o + offset] * (1 - blend) +
      samples[o + offset + FLOATS_PER_SAMPLE] * blend

    const mx = lerp(0) - site.x
    const my = lerp(1) - site.y
    const mz = lerp(2) - site.z
    const sx = lerp(3) - site.x
    const sy = lerp(4) - site.y
    const sz = lerp(5) - site.z

    const moonDistance = Math.hypot(mx, my, mz)
    const sunDistance = Math.hypot(sx, sy, sz)
    const separation = Math.acos(
      clamp(
        (mx * sx + my * sy + mz * sz) / (moonDistance * sunDistance),
        -1,
        1,
      ),
    )
    const sunRadius = Math.asin(SUN_RADIUS_KM / sunDistance)
    const moonRadius = Math.asin(MOON_RADIUS_KM / moonDistance)
    const sun = topocentric(sx, sy, sz, sunDistance, site)
    const moon = topocentric(mx, my, mz, moonDistance, site)

    return {
      separation,
      sunRadius,
      moonRadius,
      obscuration: overlapFraction(separation, sunRadius, moonRadius),
      sunAltitude: sun.altitude,
      sunAzimuth: sun.azimuth,
      moonAltitude: moon.altitude,
      moonAzimuth: moon.azimuth,
    }
  }

  /** Golden-free ternary search on separation, which is unimodal here. */
  const refineMinimum = (site: Site, low: number, high: number) => {
    let a = low
    let b = high
    for (let step = 0; step < 40; step += 1) {
      const m1 = a + (b - a) / 3
      const m2 = b - (b - a) / 3
      if (instantAt(site, m1).separation > instantAt(site, m2).separation)
        a = m1
      else b = m2
    }
    return (a + b) / 2
  }

  const HINT_WINDOW_S = 420
  const HINT_EDGE_S = 45
  const COARSE_STEP_S = 180

  /**
   * A neighbouring cell's maximum brackets this one, unless the refined answer
   * lands on the bracket edge. Then the hint was wrong and the full scan runs.
   */
  const maximumNearHint = (site: Site, hint: number) => {
    const low = Math.max(SAMPLE_START_S, hint - HINT_WINDOW_S)
    const high = Math.min(endSeconds, hint + HINT_WINDOW_S)
    const found = refineMinimum(site, low, high)
    const atEdge = found - low < HINT_EDGE_S || high - found < HINT_EDGE_S
    return atEdge ? null : found
  }

  const coarsestSeparation = (site: Site) => {
    let bestTime = SAMPLE_START_S
    let best = Number.POSITIVE_INFINITY
    for (let t = SAMPLE_START_S; t <= endSeconds; t += COARSE_STEP_S) {
      const separation = instantAt(site, t).separation
      if (separation < best) {
        best = separation
        bestTime = t
      }
    }
    return bestTime
  }

  const maximumTime = (site: Site, hint?: number) => {
    const near = hint === undefined ? null : maximumNearHint(site, hint)
    if (near !== null) return near
    const coarse = coarsestSeparation(site)
    return refineMinimum(
      site,
      Math.max(SAMPLE_START_S, coarse - 240),
      Math.min(endSeconds, coarse + 240),
    )
  }

  /** Bisect the partial edge between a covered instant and a clear one. */
  const contactTime = (site: Site, clear: number, covered: number) => {
    let low = clear
    let high = covered
    for (let step = 0; step < 42; step += 1) {
      const mid = (low + high) / 2
      if (instantAt(site, mid).obscuration > 0) high = mid
      else low = mid
    }
    return (low + high) / 2
  }

  const isTotal = (moment: Instant) =>
    moment.moonRadius - moment.sunRadius - moment.separation > 0

  const totalityEdge = (
    site: Site,
    outside: number,
    inside: number,
  ): number => {
    let low = outside
    let high = inside
    for (let step = 0; step < 42; step += 1) {
      const mid = (low + high) / 2
      if (isTotal(instantAt(site, mid))) high = mid
      else low = mid
    }
    return (low + high) / 2
  }

  /**
   * `hint` warm-starts the search from a neighbouring site, which is what makes
   * a full obscuration grid affordable on the main thread.
   */
  const circumstances = (
    latitude: number,
    longitude: number,
    hint?: number,
  ): Circumstances => {
    const site = siteAt(latitude, longitude)
    const maximum = maximumTime(site, hint)
    const peak = instantAt(site, maximum)
    const base = { site, latitude, longitude, maxObscuration: peak.obscuration }
    if (peak.obscuration <= 0) return base

    const timeline = {
      firstContact: contactTime(site, SAMPLE_START_S, maximum),
      maximum,
      lastContact: contactTime(site, endSeconds, maximum),
      sunAltitude: peak.sunAltitude,
      sunAzimuth: peak.sunAzimuth,
    }
    if (!isTotal(peak)) return { ...base, timeline }

    const start = totalityEdge(site, maximum - 300, maximum)
    const end = totalityEdge(site, maximum + 300, maximum)
    return {
      ...base,
      timeline,
      totality: { start, end, seconds: end - start },
    }
  }

  /** Signed margin against the umbra edge: positive inside the band. */
  const bandMargin = (moment: Instant) =>
    (moment.moonRadius - moment.sunRadius - moment.separation) /
    moment.sunRadius

  const FLATTENING = EARTH_RADIUS_KM / 6356.752_314_245

  /**
   * Where the moon-sun axis meets the ground, which is the center of the umbra.
   * Returns null while the axis misses Earth entirely. Solving on a sphere with
   * z pre-stretched by a/b keeps the WGS84 ellipsoid without an iteration.
   */
  const axisGroundPoint = (seconds: number) => {
    const frame = clamp(
      (seconds - SAMPLE_START_S) / SAMPLE_STEP_S,
      0,
      count - 1.001,
    )
    const index = Math.floor(frame)
    const blend = frame - index
    const o = index * FLOATS_PER_SAMPLE
    const lerp = (offset: number) =>
      samples[o + offset] * (1 - blend) +
      samples[o + offset + FLOATS_PER_SAMPLE] * blend

    const mx = lerp(0)
    const my = lerp(1)
    const mz = lerp(2) * FLATTENING
    const dx = mx - lerp(3)
    const dy = my - lerp(4)
    const dz = mz - lerp(5) * FLATTENING
    const length = Math.hypot(dx, dy, dz)
    const ux = dx / length
    const uy = dy / length
    const uz = dz / length

    const b = 2 * (mx * ux + my * uy + mz * uz)
    const c = mx * mx + my * my + mz * mz - EARTH_RADIUS_KM ** 2
    const discriminant = b * b - 4 * c
    if (discriminant < 0) return null

    const s = (-b - Math.sqrt(discriminant)) / 2
    const px = mx + s * ux
    const py = my + s * uy
    const pz = (mz + s * uz) / FLATTENING
    return {
      longitude: (Math.atan2(py, px) * 180) / Math.PI,
      latitude:
        (Math.atan2(pz * FLATTENING * FLATTENING, Math.hypot(px, py)) * 180) /
        Math.PI,
    }
  }

  return {
    siteAt,
    instantAt,
    maximumTime,
    circumstances,
    bandMargin,
    axisGroundPoint,
    startSeconds: SAMPLE_START_S,
    endSeconds,
    stepSeconds: SAMPLE_STEP_S,
  }
}
