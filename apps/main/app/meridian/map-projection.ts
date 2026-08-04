import { clamp } from 'es-toolkit'
import { map, pipe } from 'es-toolkit/fp'
import {
  EQUAL_EARTH_ASPECT,
  equalEarthForward,
  equalEarthInverse,
} from './equal-earth'
import type { RegionKey } from './map-labels'
import type { GeoCoordinate } from './model'

export const MAP_WIDTH = 1000
export const MAP_HEIGHT = MAP_WIDTH / EQUAL_EARTH_ASPECT

const GRATICULE_STEP_DEGREES = 5

export const PROJECTION_LATITUDE_LIMIT = 90

export const projectToMap = (longitude: number, latitude: number) => {
  const point = equalEarthForward(longitude, latitude)
  return { x: point.x * MAP_WIDTH, y: point.y * MAP_HEIGHT }
}

const graticulePath = (points: readonly GeoCoordinate[]): string =>
  points
    .map(({ longitude, latitude }, index) => {
      const point = projectToMap(longitude, latitude)
      return `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`
    })
    .join('')

const degreeRange = (from: number, to: number): number[] =>
  Array.from(
    { length: Math.floor((to - from) / GRATICULE_STEP_DEGREES) + 1 },
    (_, index) => from + index * GRATICULE_STEP_DEGREES,
  )

const meridianPath = (longitude: number): string =>
  pipe(
    degreeRange(-90, 90),
    map((latitude) => ({ latitude, longitude })),
    graticulePath,
  )

const parallelPath = (latitude: number): string =>
  pipe(
    degreeRange(-180, 180),
    map((longitude) => ({ latitude, longitude })),
    graticulePath,
  )

export const GRATICULE_MERIDIANS = [
  -150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150,
].map((longitude) => ({ id: longitude, d: meridianPath(longitude) }))
export const GRATICULE_PARALLELS = [-60, -30, 30, 60].map((latitude) => ({
  id: latitude,
  d: parallelPath(latitude),
}))
export const EQUATOR_PATH = parallelPath(0)
export const WORLD_OUTLINE_PATH = `${graticulePath([
  ...degreeRange(-90, 90).map((latitude) => ({ latitude, longitude: -180 })),
  ...degreeRange(-90, 90)
    .toReversed()
    .map((latitude) => ({ latitude, longitude: 180 })),
])}Z`

export type WorldPoint = {
  x: number
  y: number
}

export const coordinateToWorldPoint = ({
  latitude,
  longitude,
}: GeoCoordinate): WorldPoint =>
  projectToMap(
    clamp(longitude, -180, 180),
    clamp(latitude, -PROJECTION_LATITUDE_LIMIT, PROJECTION_LATITUDE_LIMIT),
  )

export const worldPointToCoordinate = ({ x, y }: WorldPoint): GeoCoordinate => {
  const coordinate = equalEarthInverse({
    x: clamp(x / MAP_WIDTH, 0, 1),
    y: clamp(y / MAP_HEIGHT, 0, 1),
  })
  return {
    latitude: clamp(
      coordinate.latitude,
      -PROJECTION_LATITUDE_LIMIT,
      PROJECTION_LATITUDE_LIMIT,
    ),
    longitude: clamp(coordinate.longitude, -180, 180),
  }
}

export const roundCoordinate = (coordinate: GeoCoordinate): GeoCoordinate => ({
  latitude: Math.round(coordinate.latitude * 100_000) / 100_000,
  longitude: Math.round(coordinate.longitude * 100_000) / 100_000,
})

const REGION_BOUNDS: {
  region: RegionKey
  contains: (latitude: number, longitude: number) => boolean
}[] = [
  { region: 'arctic', contains: (latitude) => latitude >= 66 },
  { region: 'antarctic', contains: (latitude) => latitude <= -60 },
  {
    region: 'northAmerica',
    contains: (latitude, longitude) =>
      latitude >= 7 && longitude >= -170 && longitude <= -50,
  },
  {
    region: 'southAmerica',
    contains: (latitude, longitude) =>
      latitude < 15 && latitude > -60 && longitude >= -90 && longitude <= -30,
  },
  {
    region: 'europe',
    contains: (latitude, longitude) =>
      latitude >= 34 && longitude >= -25 && longitude <= 55,
  },
  {
    region: 'africa',
    contains: (latitude, longitude) =>
      latitude > -40 && latitude < 38 && longitude >= -20 && longitude <= 55,
  },
  {
    region: 'asia',
    contains: (latitude, longitude) =>
      latitude >= 0 && longitude >= 25 && longitude <= 180,
  },
  {
    region: 'oceania',
    contains: (latitude, longitude) =>
      latitude < 0 && longitude >= 105 && longitude <= 180,
  },
]

export const broadRegion = ({
  latitude,
  longitude,
}: GeoCoordinate): RegionKey =>
  REGION_BOUNDS.find((bounds) => bounds.contains(latitude, longitude))
    ?.region ?? 'ocean'

const wrappedWorldPoint = (
  coordinate: GeoCoordinate,
  direction: 1 | -1,
): WorldPoint =>
  projectToMap(coordinate.longitude + 360 * direction, coordinate.latitude)

export const connectionSegments = (
  selected: GeoCoordinate,
  answer: GeoCoordinate,
) => {
  const from = coordinateToWorldPoint(selected)
  const to = coordinateToWorldPoint(answer)
  if (Math.abs(selected.longitude - answer.longitude) <= 180) {
    return [{ from, to }]
  }

  return selected.longitude < answer.longitude
    ? [
        { from, to: wrappedWorldPoint(answer, -1) },
        { from: wrappedWorldPoint(selected, 1), to },
      ]
    : [
        { from, to: wrappedWorldPoint(answer, 1) },
        { from: wrappedWorldPoint(selected, -1), to },
      ]
}
