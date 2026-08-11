/**
 * Readout formatting for the local-circumstances figure. Times arrive as
 * seconds of UT on 12 August 2026 and leave as wall clock in the country's own
 * zone, because the reader stands in one country, not in UTC.
 */

export const ECLIPSE_DAY_UTC = Date.UTC(2026, 7, 12)
const ECLIPSE_DAY = 12

const dateAt = (seconds: number) => new Date(ECLIPSE_DAY_UTC + seconds * 1000)

const clockFormatters = new Map<string, Intl.DateTimeFormat>()

const clockFormatter = (zone: string): Intl.DateTimeFormat => {
  const cached = clockFormatters.get(zone)
  if (cached) return cached
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  clockFormatters.set(zone, formatter)
  return formatter
}

const partsOf = (seconds: number, zone: string) => {
  const parts = clockFormatter(zone).formatToParts(dateAt(seconds))
  const find = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return {
    day: Number(find('day')),
    hour: find('hour'),
    minute: find('minute'),
    second: find('second'),
  }
}

/** Russia's maximum falls after local midnight, so the day rides along. */
export const formatClock = (seconds: number, zone: string): string => {
  const { day, hour, minute, second } = partsOf(seconds, zone)
  const clock = `${hour}:${minute}:${second}`
  return day === ECLIPSE_DAY ? clock : `${clock} (13th)`
}

export const formatClockMinutes = (seconds: number, zone: string): string => {
  const { day, hour, minute } = partsOf(seconds, zone)
  const clock = `${hour}:${minute}`
  return day === ECLIPSE_DAY ? clock : `${clock} (13th)`
}

export const zoneAbbreviation = (zone: string): string =>
  new Intl.DateTimeFormat('en-GB', { timeZone: zone, timeZoneName: 'short' })
    .formatToParts(dateAt(0))
    .find((part) => part.type === 'timeZoneName')?.value ?? 'UTC'

export const formatDuration = (seconds: number): string => {
  const whole = Math.round(seconds)
  const minutes = Math.floor(whole / 60)
  const rest = whole % 60
  if (minutes === 0) return `${rest} s`
  return `${minutes} m ${String(rest).padStart(2, '0')} s`
}

const COMPASS = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSW',
  'SW',
  'WSW',
  'W',
  'WNW',
  'NW',
  'NNW',
]

export const compassPoint = (azimuth: number): string =>
  COMPASS[Math.round((((azimuth % 360) + 360) % 360) / 22.5) % 16]

/**
 * Two decimals above 99 percent: the paper's whole argument lives in the gap
 * between 99.2 and 100, and one decimal hides it.
 */
export const formatObscuration = (fraction: number): string => {
  const percent = fraction * 100
  if (percent >= 99.95) return '100%'
  if (percent >= 99) return `${percent.toFixed(2)}%`
  return `${percent.toFixed(1)}%`
}

export const formatCoordinates = (
  latitude: number,
  longitude: number,
): string =>
  `${Math.abs(latitude).toFixed(3)}°${latitude >= 0 ? 'N' : 'S'} · ${Math.abs(
    longitude,
  ).toFixed(3)}°${longitude >= 0 ? 'E' : 'W'}`

export const formatAltitude = (degrees: number): string =>
  `${degrees.toFixed(1)}°`

/**
 * The obstruction rule from the paper: a 10 m building 200 m away eats 3
 * degrees of sky, so a low sun needs a clear horizon or a hill.
 */
export const horizonAdvice = (altitude: number): string => {
  if (altitude < 0) return 'The sun is below the horizon here. Nothing to see.'
  if (altitude < 3) {
    return 'Under 3 degrees. A single building 200 m away blocks the whole show. Find a shoreline or a ridge.'
  }
  if (altitude < 8) {
    return 'Low sun. Audit the west-northwest horizon before you commit to a spot.'
  }
  if (altitude < 15)
    return 'Enough altitude to clear rooftops. Still check trees.'
  return 'The sun rides well clear of the horizon. Cloud is the only enemy.'
}

export const KILOMETRES_PER_DEGREE = 111.194927

export const greatCircleKm = (
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
): number => {
  const rad = Math.PI / 180
  const dLat = (toLat - fromLat) * rad
  const dLon = (toLon - fromLon) * rad
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(fromLat * rad) * Math.cos(toLat * rad) * Math.sin(dLon / 2) ** 2
  return 6371.0088 * 2 * Math.asin(Math.min(1, Math.sqrt(a)))
}

export const bearingFrom = (
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
): number => {
  const rad = Math.PI / 180
  const y = Math.sin((toLon - fromLon) * rad) * Math.cos(toLat * rad)
  const x =
    Math.cos(fromLat * rad) * Math.sin(toLat * rad) -
    Math.sin(fromLat * rad) *
      Math.cos(toLat * rad) *
      Math.cos((toLon - fromLon) * rad)
  return (Math.atan2(y, x) / rad + 360) % 360
}
