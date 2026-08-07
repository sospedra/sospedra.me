export type Rgb = readonly [number, number, number]

const channel = (hex: number, shift: number): number =>
  ((hex >> shift) & 255) / 255

export const rgbOf = (hex: number): Rgb => [
  channel(hex, 16),
  channel(hex, 8),
  channel(hex, 0),
]

export const FOG_COLOR = 0x0a120c
export const GRID_CYAN = 0xc4ecc9
export const TOUR_AMBER = 0xff9a3c
export const BORDER_GREEN = 0x6f9a76
export const CITY_GREEN = 0xa8e8b0
export const TRAIL_HEAD = 0xffd9a8
export const EDGE_GLOW = 0xeef7ee
export const SUN_CORE = 0xfff3da
export const SUN_HALO = 0xffd9a0
export const SUN_RING = 0xffc98a
export const MOON_CORE = 0xe8f2ea
export const MOON_HALO = 0xc7dccd
export const MOON_RING = 0xa9c9b4

export const GRID_CYAN_RGB = rgbOf(GRID_CYAN)
export const TOUR_AMBER_RGB = rgbOf(TOUR_AMBER)
export const BORDER_GREEN_RGB = rgbOf(BORDER_GREEN)
export const CONTOUR_LOW_RGB = rgbOf(0x7fd0a0)
export const CONTOUR_HIGH_RGB = rgbOf(0xffe9b8)

export const ELEVATION_RAMP: readonly (readonly [number, Rgb])[] = [
  [0, rgbOf(0x061018)],
  [0.25, rgbOf(0x0a2a24)],
  [0.5, rgbOf(0x14361c)],
  [0.72, rgbOf(0x3d4420)],
  [0.88, rgbOf(0x6b5a2c)],
  [1, rgbOf(0x8a7d6a)],
]

export type GlowStops = readonly (readonly [number, string])[]

export const MARKER_GLOW: GlowStops = [
  [0, 'rgba(255,255,255,1)'],
  [0.25, 'rgba(255,190,110,0.9)'],
  [0.6, 'rgba(255,154,60,0.35)'],
  [1, 'rgba(255,154,60,0)'],
]

export const SUN_GLOW: GlowStops = [
  [0, 'rgba(255,250,238,1)'],
  [0.35, 'rgba(255,232,188,0.8)'],
  [1, 'rgba(255,210,140,0)'],
]

export const MOON_GLOW: GlowStops = [
  [0, 'rgba(235,244,238,1)'],
  [0.35, 'rgba(205,222,212,0.7)'],
  [1, 'rgba(180,205,192,0)'],
]
