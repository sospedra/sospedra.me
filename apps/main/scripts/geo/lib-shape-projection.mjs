import {
  MERCATOR_ASPECT,
  mercatorForward,
} from '../../app/meridian/mercator.ts'
import { round } from './lib-asset-files.mjs'
import { boundsOf } from './lib-polygon-geometry.mjs'

export const SVG_WIDTH = 1000
export const SVG_HEIGHT = 700
export const SHAPE_PADDING = 42
const DEGREES_TO_RADIANS = Math.PI / 180

const centralMeridianOf = (polygons) => {
  const longitudes = polygons
    .flat(2)
    .map(([longitude]) => ((longitude % 360) + 360) % 360)
    .sort((left, right) => left - right)

  if (longitudes.length === 0) {
    throw new Error('Cannot project an empty country shape')
  }

  let largestGap = Number.NEGATIVE_INFINITY
  let intervalStart = longitudes[0]

  for (let index = 0; index < longitudes.length; index += 1) {
    const current = longitudes[index]
    const next =
      index === longitudes.length - 1
        ? longitudes[0] + 360
        : longitudes[index + 1]
    const gap = next - current
    if (gap > largestGap) {
      largestGap = gap
      intervalStart = next % 360
    }
  }

  const coveredLongitude = 360 - largestGap
  const midpoint = (intervalStart + coveredLongitude / 2) % 360
  return midpoint > 180 ? midpoint - 360 : midpoint
}

const longitudeOffsetFrom = (longitude, centralMeridian) => {
  let offset = longitude - centralMeridian
  while (offset < -180) offset += 360
  while (offset > 180) offset -= 360
  return offset
}

export const shapeProjector = (polygons) => {
  const centralMeridian = centralMeridianOf(polygons)
  const projectToSinusoidal = ([longitude, latitude]) => {
    const latitudeRadians = latitude * DEGREES_TO_RADIANS
    const longitudeRadians =
      longitudeOffsetFrom(longitude, centralMeridian) * DEGREES_TO_RADIANS

    return [longitudeRadians * Math.cos(latitudeRadians), -latitudeRadians]
  }
  const bounds = boundsOf(
    polygons.map((polygon) =>
      polygon.map((ring) => ring.map(projectToSinusoidal)),
    ),
  )
  // Guard division by zero only; Vatican City (~400m) is real geometry and
  // must not hit the floor or it renders tiny and off-centre.
  const sourceWidth = Math.max(1e-9, bounds.maxX - bounds.minX)
  const sourceHeight = Math.max(1e-9, bounds.maxY - bounds.minY)
  const scale = Math.min(
    (SVG_WIDTH - SHAPE_PADDING * 2) / sourceWidth,
    (SVG_HEIGHT - SHAPE_PADDING * 2) / sourceHeight,
  )
  const renderedWidth = sourceWidth * scale
  const renderedHeight = sourceHeight * scale
  const offsetX = (SVG_WIDTH - renderedWidth) / 2
  const offsetY = (SVG_HEIGHT - renderedHeight) / 2

  return (coordinate) => {
    const [x, y] = projectToSinusoidal(coordinate)
    return [
      round(offsetX + (x - bounds.minX) * scale),
      round(offsetY + (y - bounds.minY) * scale),
    ]
  }
}

export const WORLD_WIDTH = 1200
export const WORLD_HEIGHT = Number((WORLD_WIDTH / MERCATOR_ASPECT).toFixed(2))

export const worldProject = ([longitude, latitude]) => {
  const point = mercatorForward(longitude, latitude)
  return [round(point.x * WORLD_WIDTH), round(point.y * WORLD_HEIGHT)]
}
