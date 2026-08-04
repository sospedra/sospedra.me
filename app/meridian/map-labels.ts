import type { GeoCoordinate } from './model'

export type RegionKey =
  | 'africa'
  | 'antarctic'
  | 'arctic'
  | 'asia'
  | 'europe'
  | 'northAmerica'
  | 'oceania'
  | 'ocean'
  | 'southAmerica'

export type GeoMapLabels = {
  map: string
  instructions: string
  zoomIn: string
  zoomOut: string
  recenter: string
  submit: string
  latitude: string
  longitude: string
  position: string
  projection: string
  zoom: string
  selectedPoint: string
  correctPoint: string
  distance: string
  kilometres: string
  regions: Record<RegionKey, string>
}

export type GeoMapFeedback = {
  answerCoordinate: GeoCoordinate
  distanceKm: number
}
