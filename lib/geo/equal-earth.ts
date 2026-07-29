/**
 * Equal Earth projection (Šavrič, Patterson & Jenny, 2018), the polynomial
 * form used by d3-geo. Both the generated world-map SVG and the interactive
 * GeoMap must project through this module so clicks invert exactly onto the
 * drawn land.
 */

const A1 = 1.340264
const A2 = -0.081106
const A3 = 0.000893
const A4 = 0.003796
const M = Math.sqrt(3) / 2
const NEWTON_EPSILON = 1e-12
const NEWTON_ITERATIONS = 12

const DEGREES_TO_RADIANS = Math.PI / 180
const RADIANS_TO_DEGREES = 180 / Math.PI

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

const yPolynomial = (theta: number): number => {
  const theta2 = theta * theta
  const theta6 = theta2 * theta2 * theta2
  return theta * (A1 + A2 * theta2 + theta6 * (A3 + A4 * theta2))
}

const xDenominator = (theta: number): number => {
  const theta2 = theta * theta
  const theta6 = theta2 * theta2 * theta2
  return A1 + 3 * A2 * theta2 + theta6 * (7 * A3 + 9 * A4 * theta2)
}

const RAW_X_MAX = Math.PI / (M * xDenominator(0))
const RAW_Y_MAX = yPolynomial(Math.asin(M))

/** Width over height of the projected world. */
export const EQUAL_EARTH_ASPECT = (2 * RAW_X_MAX) / (2 * RAW_Y_MAX)

export interface NormalizedPoint {
  /** 0 at 180°W, 1 at 180°E. */
  x: number
  /** 0 at the north pole edge, 1 at the south pole edge. */
  y: number
}

/**
 * Projects a coordinate into the unit frame. Longitude is deliberately not
 * clamped: antimeridian-wrapped inputs (for example 190°) land beyond the
 * frame edge, which the map connection line relies on.
 */
export const equalEarthForward = (
  longitudeDeg: number,
  latitudeDeg: number,
): NormalizedPoint => {
  const longitude = longitudeDeg * DEGREES_TO_RADIANS
  const latitude = clamp(latitudeDeg, -90, 90) * DEGREES_TO_RADIANS
  const theta = Math.asin(M * Math.sin(latitude))
  const rawX = (longitude * Math.cos(theta)) / (M * xDenominator(theta))
  const rawY = yPolynomial(theta)
  return {
    x: (rawX + RAW_X_MAX) / (2 * RAW_X_MAX),
    y: (RAW_Y_MAX - rawY) / (2 * RAW_Y_MAX),
  }
}

/** Inverts a unit-frame point back to a coordinate, Newton on the y series. */
export const equalEarthInverse = (
  point: NormalizedPoint,
): { latitude: number; longitude: number } => {
  const rawX = point.x * 2 * RAW_X_MAX - RAW_X_MAX
  const rawY = RAW_Y_MAX - point.y * 2 * RAW_Y_MAX
  let theta = rawY
  for (let iteration = 0; iteration < NEWTON_ITERATIONS; iteration += 1) {
    const delta = (yPolynomial(theta) - rawY) / xDenominator(theta)
    theta -= delta
    if (Math.abs(delta) < NEWTON_EPSILON) break
  }
  theta = clamp(theta, -Math.asin(M), Math.asin(M))
  const latitude = Math.asin(clamp(Math.sin(theta) / M, -1, 1))
  const cosTheta = Math.cos(theta)
  const longitude =
    cosTheta < 1e-9 ? 0 : (rawX * M * xDenominator(theta)) / cosTheta
  return {
    latitude: latitude * RADIANS_TO_DEGREES,
    longitude: clamp(longitude * RADIANS_TO_DEGREES, -180, 180),
  }
}
