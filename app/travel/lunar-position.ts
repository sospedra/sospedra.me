const MS_PER_DAY = 86_400_000
const JULIAN_UNIX_EPOCH = 2_440_587.5
const JULIAN_J2000 = 2_451_545
const TAU = Math.PI * 2
const ARCSECONDS_PER_RADIAN = 206_264.8062

// The sidereal month closes the orbit against the background stars.
const SIDEREAL_MONTH_MS = 27.321661 * MS_PER_DAY
const MEAN_LUNAR_DISTANCE_KM = 384_400

export type LunarGlobeVector = [x: number, y: number, z: number]

export type LunarOrbitPoint = {
  distanceRatio: number
  vector: LunarGlobeVector
}

export type LunarVisit = {
  current: LunarOrbitPoint
  distanceKm: number
  observedAt: string
  orbit: LunarOrbitPoint[]
  sublunarLatitude: number
  sublunarLongitude: number
}

type LunarCoordinates = {
  distanceKm: number
  latitude: number
  longitude: number
}

const radians = (degrees: number): number => (degrees * Math.PI) / 180
const degrees = (value: number): number => (value * 180) / Math.PI

const wrapDegrees = (value: number): number => ((value % 360) + 360) % 360

const wrapSignedDegrees = (value: number): number => ((value + 540) % 360) - 180

const fraction = (value: number): number => value - Math.floor(value)

const julianDate = (date: Date): number =>
  date.getTime() / MS_PER_DAY + JULIAN_UNIX_EPOCH

/*
 * Montenbruck–Pfleger "MiniMoon" series. It is deliberately smaller than a
 * telescope-grade JPL/SOFA implementation; across this display's 2026 window
 * its directional error stays below a pixel against JPL DE441.
 */
const lunarCoordinatesAt = (date: Date): LunarCoordinates => {
  const centuries = (julianDate(date) - JULIAN_J2000) / 36_525
  const meanLongitude = fraction(0.606433 + 1_336.855225 * centuries)
  const lunarAnomaly = TAU * fraction(0.374897 + 1_325.55241 * centuries)
  const solarAnomaly = TAU * fraction(0.993133 + 99.997361 * centuries)
  const elongation = TAU * fraction(0.827361 + 1_236.853086 * centuries)
  const latitudeArgument = TAU * fraction(0.259086 + 1_342.227825 * centuries)

  const longitudeCorrection =
    22_640 * Math.sin(lunarAnomaly) -
    4_586 * Math.sin(lunarAnomaly - 2 * elongation) +
    2_370 * Math.sin(2 * elongation) +
    769 * Math.sin(2 * lunarAnomaly) -
    668 * Math.sin(solarAnomaly) -
    412 * Math.sin(2 * latitudeArgument) -
    212 * Math.sin(2 * lunarAnomaly - 2 * elongation) -
    206 * Math.sin(lunarAnomaly + solarAnomaly - 2 * elongation) +
    192 * Math.sin(lunarAnomaly + 2 * elongation) -
    165 * Math.sin(solarAnomaly - 2 * elongation) -
    125 * Math.sin(elongation) -
    110 * Math.sin(lunarAnomaly + solarAnomaly) +
    148 * Math.sin(lunarAnomaly - solarAnomaly) -
    55 * Math.sin(2 * latitudeArgument - 2 * elongation)

  const correctedLatitudeArgument =
    latitudeArgument +
    (longitudeCorrection +
      412 * Math.sin(2 * latitudeArgument) +
      541 * Math.sin(solarAnomaly)) /
      ARCSECONDS_PER_RADIAN
  const latitudeAuxiliary = latitudeArgument - 2 * elongation
  const latitudeCorrection =
    -526 * Math.sin(latitudeAuxiliary) +
    44 * Math.sin(lunarAnomaly + latitudeAuxiliary) -
    31 * Math.sin(-lunarAnomaly + latitudeAuxiliary) -
    23 * Math.sin(solarAnomaly + latitudeAuxiliary) +
    11 * Math.sin(-solarAnomaly + latitudeAuxiliary) -
    25 * Math.sin(-2 * lunarAnomaly + latitudeArgument) +
    21 * Math.sin(-lunarAnomaly + latitudeArgument)

  const longitude =
    TAU * fraction(meanLongitude + longitudeCorrection / 1_296_000)
  const latitude =
    (18_520 * Math.sin(correctedLatitudeArgument) + latitudeCorrection) /
    ARCSECONDS_PER_RADIAN

  const distanceKm =
    385_000.56 -
    20_905.355 * Math.cos(lunarAnomaly) -
    3_699.111 * Math.cos(2 * elongation - lunarAnomaly) -
    2_955.968 * Math.cos(2 * elongation) -
    569.925 * Math.cos(2 * lunarAnomaly) +
    246.158 * Math.cos(2 * lunarAnomaly - 2 * elongation) -
    204.586 * Math.cos(solarAnomaly - 2 * elongation) -
    170.733 * Math.cos(lunarAnomaly + 2 * elongation) -
    152.138 * Math.cos(lunarAnomaly + solarAnomaly - 2 * elongation)

  return {
    longitude: degrees(longitude),
    latitude: degrees(latitude),
    distanceKm,
  }
}

const meanObliquity = (date: Date): number => {
  const centuries = (julianDate(date) - JULIAN_J2000) / 36_525
  const t2 = centuries * centuries
  const t3 = t2 * centuries
  return radians(
    23.439291111 -
      0.013004167 * centuries -
      0.000000164 * t2 +
      0.000000504 * t3,
  )
}

const equatorialVectorAt = (
  date: Date,
): { distanceKm: number; vector: LunarGlobeVector } => {
  const lunar = lunarCoordinatesAt(date)
  const longitude = radians(lunar.longitude)
  const latitude = radians(lunar.latitude)
  const obliquity = meanObliquity(date)
  const cosLatitude = Math.cos(latitude)
  const eclipticX = cosLatitude * Math.cos(longitude)
  const eclipticY = cosLatitude * Math.sin(longitude)
  const eclipticZ = Math.sin(latitude)

  return {
    distanceKm: lunar.distanceKm,
    vector: [
      eclipticX,
      eclipticY * Math.cos(obliquity) - eclipticZ * Math.sin(obliquity),
      eclipticY * Math.sin(obliquity) + eclipticZ * Math.cos(obliquity),
    ],
  }
}

// Greenwich mean sidereal time, equinox of date.
const greenwichSiderealDegrees = (date: Date): number => {
  const days = julianDate(date) - JULIAN_J2000
  const centuries = days / 36_525
  return wrapDegrees(
    280.46061837 +
      360.98564736629 * days +
      0.000387933 * centuries * centuries -
      (centuries * centuries * centuries) / 38_710_000,
  )
}

/*
 * Equatorial inertial -> Earth-fixed -> Cobe axes.
 * Standard ECEF is [x, y, z]; Cobe uses [x, z, -y].
 */
const toGlobeVector = (
  vector: LunarGlobeVector,
  siderealAngle: number,
): LunarGlobeVector => {
  const cosAngle = Math.cos(siderealAngle)
  const sinAngle = Math.sin(siderealAngle)
  const earthX = cosAngle * vector[0] + sinAngle * vector[1]
  const earthY = -sinAngle * vector[0] + cosAngle * vector[1]
  return [earthX, vector[2], -earthY]
}

const orbitPointAt = (
  date: Date,
  visitSiderealAngle: number,
): LunarOrbitPoint => {
  const equatorial = equatorialVectorAt(date)
  return {
    distanceRatio: equatorial.distanceKm / MEAN_LUNAR_DISTANCE_KM,
    vector: toGlobeVector(equatorial.vector, visitSiderealAngle),
  }
}

export const lunarOrbitAtVisit = (
  observedAt: Date,
  sampleCount = 96,
): LunarVisit => {
  const siderealAngle = radians(greenwichSiderealDegrees(observedAt))
  const equatorial = equatorialVectorAt(observedAt)
  const rightAscension = wrapDegrees(
    degrees(Math.atan2(equatorial.vector[1], equatorial.vector[0])),
  )
  const declination = degrees(
    Math.asin(Math.max(-1, Math.min(1, equatorial.vector[2]))),
  )
  const current = orbitPointAt(observedAt, siderealAngle)
  const orbit = Array.from({ length: sampleCount }, (_, index) => {
    const offset = (index / sampleCount) * SIDEREAL_MONTH_MS
    return orbitPointAt(new Date(observedAt.getTime() + offset), siderealAngle)
  })

  // The perturbed real orbit is not perfectly closed; the scope ring is.
  orbit.push(current)

  return {
    current,
    distanceKm: equatorial.distanceKm,
    observedAt: observedAt.toISOString(),
    orbit,
    sublunarLatitude: declination,
    sublunarLongitude: wrapSignedDegrees(
      rightAscension - greenwichSiderealDegrees(observedAt),
    ),
  }
}
