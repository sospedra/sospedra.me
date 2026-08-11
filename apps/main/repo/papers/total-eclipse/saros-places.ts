import type { LonLat } from './saros-path.ts'

export type Place = {
  id: string
  name: string
  lon: number
  lat: number
}

// The countries the paper covers, plus the near neighbours that only get a
// partial. Coordinates are a representative inland point, not a centroid.
export const PLACES: readonly Place[] = [
  { id: 'es', name: 'Spain', lon: -3.7, lat: 40.4 },
  { id: 'pt', name: 'Portugal', lon: -8.2, lat: 39.5 },
  { id: 'is', name: 'Iceland', lon: -19.0, lat: 64.9 },
  { id: 'gl', name: 'Greenland', lon: -42.0, lat: 71.7 },
  { id: 'ru', name: 'Russia', lon: 90.0, lat: 62.0 },
  { id: 'fr', name: 'France', lon: 2.3, lat: 46.6 },
  { id: 'gb', name: 'United Kingdom', lon: -2.0, lat: 54.0 },
  { id: 'dk', name: 'Denmark', lon: 10.0, lat: 56.0 },
]

const RADIANS = Math.PI / 180
const EARTH_RADIUS_KM = 6371

export const angularDistance = (a: LonLat, b: LonLat) => {
  const lat1 = a[1] * RADIANS
  const lat2 = b[1] * RADIANS
  const dLat = lat2 - lat1
  const dLon = (b[0] - a[0]) * RADIANS
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * Math.asin(Math.min(1, Math.sqrt(h)))
}

export const distanceKm = (a: LonLat, b: LonLat) =>
  angularDistance(a, b) * EARTH_RADIUS_KM

/** Great-circle distance from a point to the closest point of a central line. */
export const nearestApproachKm = (
  line: readonly LonLat[],
  at: LonLat,
): number | null => {
  if (line.length === 0) return null
  let closest = Number.POSITIVE_INFINITY
  for (const point of line) {
    const km = distanceKm(point, at)
    if (km < closest) closest = km
  }
  return closest
}

export const formatApproach = (km: number | null) => {
  if (km === null) return 'no central line'
  if (km < 150) return 'crosses here'
  return `${Math.round(km / 10) * 10} km away`
}

/** A tap near a known country adopts its name, anywhere else stays raw. */
export const nearestPlace = (point: LonLat, withinKm = 650): Place | null => {
  const ranked = PLACES.map((place) => ({
    place,
    km: distanceKm(point, [place.lon, place.lat]),
  })).sort((left, right) => left.km - right.km)
  const closest = ranked[0]
  return closest.km <= withinKm ? closest.place : null
}

export const formatPoint = ([lon, lat]: LonLat) => {
  const ns = lat < 0 ? 'S' : 'N'
  const ew = lon < 0 ? 'W' : 'E'
  return `${Math.abs(lat).toFixed(0)}°${ns} ${Math.abs(lon).toFixed(0)}°${ew}`
}
