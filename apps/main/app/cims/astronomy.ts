const RAD = Math.PI / 180

export const OBSERVER_LAT = 41.96
export const OBSERVER_LON = 0.33

export type SkyPosition = { azN: number; elev: number; dec: number }
export type SkyVector = readonly [number, number, number]

const daysSinceJ2000 = (date: Date): number =>
  date.getTime() / 86400000 - 10957.5

/*
 * Low-precision Astronomical Almanac series, ported verbatim from the
 * prototype. Golden vectors pin the outputs.
 */
const horizonAt = (dec: number, H: number): SkyPosition => {
  const lat = OBSERVER_LAT * RAD
  const elev = Math.asin(
    Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H),
  )
  const az = Math.atan2(
    Math.sin(H),
    Math.cos(H) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat),
  )
  return { azN: az + Math.PI, elev, dec }
}

const equatorialToHorizon = (
  RA: number,
  dec: number,
  d: number,
): SkyPosition => {
  const GMST = (280.46061837 + 360.98564736629 * d) * RAD
  const H = GMST + OBSERVER_LON * RAD - RA
  return horizonAt(dec, H)
}

export const sunPosition = (date: Date): SkyPosition => {
  const d = daysSinceJ2000(date)
  const g = (357.529 + 0.98560028 * d) * RAD
  const q = (280.459 + 0.98564736 * d) * RAD
  const L = q + (1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD
  const e = (23.439 - 0.00000036 * d) * RAD
  const RA = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L))
  const dec = Math.asin(Math.sin(e) * Math.sin(L))
  return equatorialToHorizon(RA, dec, d)
}

export const moonPosition = (date: Date): SkyPosition => {
  const d = daysSinceJ2000(date)
  const L = (218.316 + 13.176396 * d) * RAD
  const M = (134.963 + 13.064993 * d) * RAD
  const F = (93.272 + 13.22935 * d) * RAD
  const lon = L + 6.289 * RAD * Math.sin(M)
  const lat = 5.128 * RAD * Math.sin(F)
  const e = 23.439 * RAD
  const RA = Math.atan2(
    Math.sin(lon) * Math.cos(e) - Math.tan(lat) * Math.sin(e),
    Math.cos(lon),
  )
  const dec = Math.asin(
    Math.sin(lat) * Math.cos(e) + Math.cos(lat) * Math.sin(e) * Math.sin(lon),
  )
  return equatorialToHorizon(RA, dec, d)
}

export const skyDirection = (azN: number, elev: number): SkyVector => {
  const c = Math.cos(elev)
  return [Math.sin(azN) * c, Math.sin(elev), -Math.cos(azN) * c]
}

export const orbitPoint = (dec: number, H: number): SkyVector => {
  const point = horizonAt(dec, H)
  return skyDirection(point.azN, point.elev)
}
