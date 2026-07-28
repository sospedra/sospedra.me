import type { GeoCoordinate } from './model'

export const EARTH_RADIUS_KM = 6371.0088

const degreesToRadians = (degrees: number) => (degrees * Math.PI) / 180

export const isGeoCoordinate = (value: unknown): value is GeoCoordinate => {
  if (!value || typeof value !== 'object') return false

  const coordinate = value as Partial<GeoCoordinate>
  return (
    typeof coordinate.latitude === 'number' &&
    Number.isFinite(coordinate.latitude) &&
    coordinate.latitude >= -90 &&
    coordinate.latitude <= 90 &&
    typeof coordinate.longitude === 'number' &&
    Number.isFinite(coordinate.longitude) &&
    coordinate.longitude >= -180 &&
    coordinate.longitude <= 180
  )
}

/**
 * Great-circle distance using the haversine formula.
 */
export const haversineDistanceKm = (from: GeoCoordinate, to: GeoCoordinate) => {
  if (!isGeoCoordinate(from) || !isGeoCoordinate(to)) {
    throw new RangeError('Coordinates must be within world bounds')
  }

  const fromLatitude = degreesToRadians(from.latitude)
  const toLatitude = degreesToRadians(to.latitude)
  const latitudeDelta = toLatitude - fromLatitude
  const longitudeDelta = degreesToRadians(to.longitude - from.longitude)

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2
  const normalizedHaversine = Math.min(1, Math.max(0, haversine))
  const centralAngle =
    2 *
    Math.atan2(
      Math.sqrt(normalizedHaversine),
      Math.sqrt(1 - normalizedHaversine),
    )

  return EARTH_RADIUS_KM * centralAngle
}
