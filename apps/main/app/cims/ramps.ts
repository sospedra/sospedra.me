import { clamp } from 'es-toolkit'
import {
  CONTOUR_HIGH_RGB,
  CONTOUR_LOW_RGB,
  ELEVATION_RAMP,
  type Rgb,
} from './palette.ts'

const LIGHT_LENGTH = Math.sqrt(0.55 * 0.55 + 0.6 * 0.6 + 0.35 * 0.35)
const LIGHT: readonly [number, number, number] = [
  -0.55 / LIGHT_LENGTH,
  0.6 / LIGHT_LENGTH,
  -0.35 / LIGHT_LENGTH,
]

export const hillshade = (nx: number, ny: number, nz: number): number =>
  clamp(0.5 + 0.5 * (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]), 0, 1)

export const rampT = (h: number, hmax: number): number =>
  clamp(h / hmax, 0, 1) ** 0.9

export const rampInto = (
  dst: Float32Array | number[],
  offset: number,
  h: number,
  hmax: number,
): void => {
  const t = rampT(h, hmax)
  for (let i = 1; i < ELEVATION_RAMP.length; i++) {
    const isLast = i === ELEVATION_RAMP.length - 1
    if (t > ELEVATION_RAMP[i][0] && !isLast) continue
    const [at, a] = ELEVATION_RAMP[i - 1]
    const [bt, b] = ELEVATION_RAMP[i]
    const f = clamp((t - at) / (bt - at), 0, 1)
    dst[offset] = a[0] + (b[0] - a[0]) * f
    dst[offset + 1] = a[1] + (b[1] - a[1]) * f
    dst[offset + 2] = a[2] + (b[2] - a[2]) * f
    return
  }
}

export const rampColor = (h: number, hmax: number): Rgb => {
  const out: [number, number, number] = [0, 0, 0]
  rampInto(out, 0, h, hmax)
  return out
}

// unclamped on purpose: the prototype lerps contour tint straight from lv/hmax
export const contourColor = (lv: number, hmax: number): Rgb => {
  const t = lv / hmax
  return [
    CONTOUR_LOW_RGB[0] + (CONTOUR_HIGH_RGB[0] - CONTOUR_LOW_RGB[0]) * t,
    CONTOUR_LOW_RGB[1] + (CONTOUR_HIGH_RGB[1] - CONTOUR_LOW_RGB[1]) * t,
    CONTOUR_LOW_RGB[2] + (CONTOUR_HIGH_RGB[2] - CONTOUR_LOW_RGB[2]) * t,
  ]
}

export const lineBrightness = (h: number, hs: number, hmax: number): number =>
  (0.16 + 0.55 * hs) * (0.45 + 0.55 * clamp(h / hmax, 0, 1) ** 0.8)

export const contourBrightness = (
  lv: number,
  mj: 0 | 1,
  hmax: number,
): number => {
  const t = lv / hmax
  return mj ? 0.72 + 0.28 * t : 0.34 + 0.3 * t
}
