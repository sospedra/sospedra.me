import { clamp } from 'es-toolkit'

export type MaskedGrid = { h: Float32Array; mask: Uint8Array }

export type GridSpec = {
  nx: number
  nz: number
  ox: number
  oz: number
  cellX: number
  cellZ: number
}

/*
 * Ports of the prototype heightmap codec. Zero means "no data", any other
 * quantized value maps linearly onto [hmin, hmax]. The imperative loops are
 * measured hot paths over multi-megapixel grids.
 */
export const decodeMasked = (
  b64: string,
  hmin: number,
  hmax: number,
): MaskedGrid => {
  const raw = atob(b64)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  const q = new Uint16Array(bytes.buffer)
  const h = new Float32Array(q.length)
  const mask = new Uint8Array(q.length)
  const s = (hmax - hmin) / 65534
  for (let i = 0; i < q.length; i++) {
    if (q[i]) {
      h[i] = hmin + (q[i] - 1) * s
      mask[i] = 1
    }
  }
  return { h, mask }
}

export const smoothGrid = (
  h: Float32Array,
  mask: Uint8Array,
  nx: number,
  nz: number,
  passes: number,
): void => {
  const tmp = new Float32Array(h.length)
  for (let pass = 0; pass < passes; pass++) {
    for (let j = 0; j < nz; j++) {
      for (let i = 0; i < nx; i++) {
        const q = j * nx + i
        if (!mask[q]) {
          tmp[q] = h[q]
          continue
        }
        let sum = h[q] * 2
        let w = 2
        if (i > 0 && mask[q - 1]) {
          sum += h[q - 1]
          w++
        }
        if (i < nx - 1 && mask[q + 1]) {
          sum += h[q + 1]
          w++
        }
        tmp[q] = sum / w
      }
    }
    for (let j = 0; j < nz; j++) {
      for (let i = 0; i < nx; i++) {
        const q = j * nx + i
        if (!mask[q]) {
          h[q] = tmp[q]
          continue
        }
        let sum = tmp[q] * 2
        let w = 2
        if (j > 0 && mask[q - nx]) {
          sum += tmp[q - nx]
          w++
        }
        if (j < nz - 1 && mask[q + nx]) {
          sum += tmp[q + nx]
          w++
        }
        h[q] = sum / w
      }
    }
  }
}

export const gridX = (spec: GridSpec, i: number): number =>
  spec.ox + (i - (spec.nx - 1) / 2) * spec.cellX

export const gridZ = (spec: GridSpec, j: number): number =>
  spec.oz + (j - (spec.nz - 1) / 2) * spec.cellZ

const bilinear = (
  h: Float32Array,
  nx: number,
  i: number,
  j: number,
): number => {
  const i0 = Math.floor(i)
  const j0 = Math.floor(j)
  const fi = i - i0
  const fj = j - j0
  const a = h[j0 * nx + i0]
  const b = h[j0 * nx + i0 + 1]
  const c = h[(j0 + 1) * nx + i0]
  const d = h[(j0 + 1) * nx + i0 + 1]
  return a + (b - a) * fi + (c - a) * fj + (a - b - c + d) * fi * fj
}

export const sampleClamped = (
  spec: GridSpec,
  h: Float32Array,
  x: number,
  z: number,
): number => {
  const i = clamp(
    (x - spec.ox) / spec.cellX + (spec.nx - 1) / 2,
    0,
    spec.nx - 1.001,
  )
  const j = clamp(
    (z - spec.oz) / spec.cellZ + (spec.nz - 1) / 2,
    0,
    spec.nz - 1.001,
  )
  return bilinear(h, spec.nx, i, j)
}

export const sampleBounded = (
  spec: GridSpec,
  h: Float32Array,
  x: number,
  z: number,
): number => {
  const i = (x - spec.ox) / spec.cellX + (spec.nx - 1) / 2
  const j = (z - spec.oz) / spec.cellZ + (spec.nz - 1) / 2
  if (i < 0 || j < 0 || i > spec.nx - 1.001 || j > spec.nz - 1.001) {
    return Number.NEGATIVE_INFINITY
  }
  return bilinear(h, spec.nx, i, j)
}
