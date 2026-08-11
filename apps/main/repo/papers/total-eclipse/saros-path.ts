// Besselian element reduction, Explanatory Supplement to the Astronomical
// Almanac ch. 8. Elements are NASA GSFC five-millennium canon values.

export type Element = {
  t0: number
  x: number[]
  y: number[]
  d: number[]
  l1: number[]
  l2: number[]
  mu: number[]
  tanf1: number
  tanf2: number
}

export type Member = {
  n: number
  ord: number
  date: string
  key: string
  type: string
  gamma: number
  mag: number
  lat: number
  lon: number
  width: number | null
  dur: string | null
  dT: number
  tdt: string
}

export type LonLat = [number, number]

export type CentralPoint = {
  lon: number
  lat: number
  halfWidthKm: number
}

export type Track = {
  line: LonLat[]
  band: LonLat[]
}

const FLATTENING = 0.00669438
const EARTH_RADIUS_KM = 6378.137
const DEGREES_PER_DELTA_T_SECOND = 0.00417807
const SWEEP_HOURS = 3
const SWEEP_STEPS = 240

const toRadians = (degrees: number) => (degrees * Math.PI) / 180
const toDegrees = (radians: number) => (radians * 180) / Math.PI

export const wrapLongitude = (degrees: number) => ((degrees + 540) % 360) - 180

const poly = (coefficients: number[], t: number) => {
  let total = 0
  for (let i = coefficients.length - 1; i >= 0; i--) {
    total = total * t + coefficients[i]
  }
  return total
}

export const centralPoint = (
  element: Element,
  deltaT: number,
  t: number,
): CentralPoint | null => {
  const x = poly(element.x, t)
  const y = poly(element.y, t)
  const declination = toRadians(poly(element.d, t))
  const hourAngle = poly(element.mu, t)

  const cosD = Math.cos(declination)
  const sinD = Math.sin(declination)
  const rho = Math.sqrt(1 - FLATTENING * cosD * cosD)
  const eta = y / rho
  const zSquared = 1 - x * x - eta * eta
  if (zSquared <= 0) return null

  const z = Math.sqrt(zSquared)
  const sinD1 = sinD / rho
  const cosD1 = (Math.sqrt(1 - FLATTENING) * cosD) / rho
  const theta = toDegrees(Math.atan2(x, z * cosD1 - eta * sinD1))
  const geocentric = Math.asin(eta * cosD1 + z * sinD1)
  const lat = toDegrees(
    Math.atan(Math.tan(geocentric) / Math.sqrt(1 - FLATTENING)),
  )
  const umbra = Math.abs(poly(element.l2, t) - z * element.tanf2)

  return {
    lon: wrapLongitude(theta - hourAngle + DEGREES_PER_DELTA_T_SECOND * deltaT),
    lat,
    halfWidthKm: (umbra * EARTH_RADIUS_KM) / Math.max(z, 0.05),
  }
}

export const destination = (
  point: LonLat,
  bearing: number,
  km: number,
): LonLat => {
  const angular = km / 6371
  const lat = toRadians(point[1])
  const lon = toRadians(point[0])
  const sinLat = Math.sin(lat) * Math.cos(angular)
  const cosLat = Math.cos(lat) * Math.sin(angular) * Math.cos(bearing)
  const nextLat = Math.asin(sinLat + cosLat)
  const nextLon =
    lon +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(lat),
      Math.cos(angular) - Math.sin(lat) * Math.sin(nextLat),
    )
  return [wrapLongitude(toDegrees(nextLon)), toDegrees(nextLat)]
}

const bearingAt = (line: LonLat[], index: number) => {
  const before = line[Math.max(0, index - 1)]
  const after = line[Math.min(line.length - 1, index + 1)]
  const lon1 = toRadians(before[0])
  const lat1 = toRadians(before[1])
  const lon2 = toRadians(after[0])
  const lat2 = toRadians(after[1])
  const dLon = lon2 - lon1
  return Math.atan2(
    Math.sin(dLon) * Math.cos(lat2),
    Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon),
  )
}

const buildBand = (line: LonLat[], halfWidths: number[]): LonLat[] => {
  if (line.length < 3) return []
  const north: LonLat[] = []
  const south: LonLat[] = []
  for (let i = 0; i < line.length; i++) {
    const bearing = bearingAt(line, i)
    north.push(destination(line[i], bearing - Math.PI / 2, halfWidths[i]))
    south.push(destination(line[i], bearing + Math.PI / 2, halfWidths[i]))
  }
  return north.concat(south.reverse())
}

export const computeTrack = (element: Element, deltaT: number): Track => {
  const line: LonLat[] = []
  const halfWidths: number[] = []
  const step = (SWEEP_HOURS * 2) / SWEEP_STEPS
  for (let i = 0; i <= SWEEP_STEPS; i++) {
    const point = centralPoint(element, deltaT, -SWEEP_HOURS + i * step)
    if (!point) continue
    line.push([point.lon, point.lat])
    halfWidths.push(point.halfWidthKm)
  }
  return { line, band: buildBand(line, halfWidths) }
}

// t0 sits on the nearest whole hour, so an eclipse either side of midnight
// lands a day away from its own epoch. Fold it back into the sweep window.
export const hoursFromEpoch = (member: Member, element: Element) => {
  const [h, m, s] = member.tdt.split(':').map(Number)
  const raw = h + m / 60 + s / 3600 - element.t0
  if (raw > 12) return raw - 24
  if (raw < -12) return raw + 24
  return raw
}
