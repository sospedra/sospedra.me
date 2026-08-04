import { haversineDistanceKm } from 'services/distance'
import { type Destination, HOME } from './destinations'

const toRadians = (value: number): number => (value * Math.PI) / 180

export const formatCoords = (spot: { lat: number; lon: number }): string => {
  const lat = `${Math.abs(spot.lat).toFixed(2)}°${spot.lat >= 0 ? 'N' : 'S'}`
  const lon = `${Math.abs(spot.lon).toFixed(2)}°${spot.lon >= 0 ? 'E' : 'W'}`
  return `${lat} ${lon}`
}

const distanceFormatter = new Intl.NumberFormat('en', {
  maximumFractionDigits: 0,
})
const countryFormatter = new Intl.DisplayNames(['en'], { type: 'region' })

const distanceFromHome = (spot: Destination): number =>
  Math.round(
    haversineDistanceKm(
      { latitude: HOME.lat, longitude: HOME.lon },
      { latitude: spot.lat, longitude: spot.lon },
    ),
  )

export const formatRange = (spot: Destination): string =>
  spot.home
    ? 'Home · right here'
    : `${distanceFormatter.format(distanceFromHome(spot))} km`

export const formatCountry = (country: string): string =>
  countryFormatter.of(country) ?? country

const bearingFromHome = (spot: Destination): number => {
  if (spot.home) return 0
  const homeLat = toRadians(HOME.lat)
  const spotLat = toRadians(spot.lat)
  const lonDelta = toRadians(spot.lon - HOME.lon)
  const y = Math.sin(lonDelta) * Math.cos(spotLat)
  const x =
    Math.cos(homeLat) * Math.sin(spotLat) -
    Math.sin(homeLat) * Math.cos(spotLat) * Math.cos(lonDelta)
  return Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360)
}

export const formatBearing = (spot: Destination): string =>
  `${String(bearingFromHome(spot)).padStart(3, '0')}°T`

export const formatViewHeading = (longitude: number): string => {
  const normalized = ((Math.round(longitude) % 360) + 360) % 360
  return `${String(normalized).padStart(3, '0')}°`
}

export const formatViewLatitude = (latitude: number): string => {
  const rounded = Math.round(latitude)
  return `${rounded >= 0 ? '+' : '−'}${String(Math.abs(rounded)).padStart(2, '0')}°`
}

export const formatPitchAria = (latitude: number): string => {
  const rounded = Math.round(latitude)
  if (rounded === 0) return '0 degrees, equator'
  return `${Math.abs(rounded)} degrees ${rounded > 0 ? 'north' : 'south'}`
}

export const normalizeHeading = (heading: number): number =>
  ((heading % 360) + 360) % 360
