import {
  DESTINATIONS,
  type Destination,
  flagPaletteOf,
  HOME,
  type Visitor,
} from './destinations'
import type { Vec3 } from './globe-projection'

export type TravelGlobeColorway = 'classic' | 'signalscope'
export type TravelGlobePalette = {
  base: Vec3
  glow: Vec3
  signal: Vec3
  visitor: Vec3
  visitorFallback: Vec3
}

export const GLOBE_PALETTES: Record<TravelGlobeColorway, TravelGlobePalette> = {
  classic: {
    base: [0.14, 0.34, 0.39],
    glow: [0.024, 0.1, 0.125],
    signal: [1, 0.3, 0.76],
    visitor: [1, 1, 1],
    visitorFallback: [0.43, 0.97, 0.92],
  },
  signalscope: {
    base: [0.1, 0.34, 0.31],
    glow: [0.018, 0.085, 0.12],
    signal: [0.32, 0.7, 0.86],
    visitor: [0.75, 0.98, 0.82],
    visitorFallback: [0.35, 0.88, 0.68],
  },
}

const hexToVec = (hex: string): Vec3 => {
  const value = Number.parseInt(hex.slice(1), 16)
  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ]
}

const visitorMarkers = (
  visitor: Visitor | null,
  palette: TravelGlobePalette,
  scale = 1,
) => {
  if (!visitor) return []
  const location = [visitor.lat, visitor.lon] as [number, number]
  const visitorColor = visitor.country
    ? hexToVec(flagPaletteOf(visitor.country)[0])
    : palette.visitorFallback
  return [
    { location, size: 0.055 * scale, color: palette.visitor },
    { location, size: 0.028 * scale, color: visitorColor },
  ]
}

export const buildMarkers = (
  tracked: Destination,
  visitor: Visitor | null,
  palette: TravelGlobePalette,
  visitorScale = 1,
) => [
  ...DESTINATIONS.flatMap((spot) => {
    const location = [spot.lat, spot.lon] as [number, number]
    const [primary, secondary] = flagPaletteOf(spot.country).map(hexToVec)
    const activeScale = spot.code === tracked.code ? 1.5 : 1
    return [
      {
        location,
        size: 0.023 * activeScale,
        color: secondary,
      },
      { location, size: 0.01 * activeScale, color: primary },
    ]
  }),
  ...visitorMarkers(visitor, palette, visitorScale),
]

export const buildArcs = (tracked: Destination, palette: TravelGlobePalette) =>
  tracked.home
    ? []
    : [
        {
          from: [HOME.lat, HOME.lon] as [number, number],
          to: [tracked.lat, tracked.lon] as [number, number],
          color: palette.signal,
        },
      ]
