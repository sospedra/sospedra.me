import { type GridSpec, gridX, gridZ, type MaskedGrid } from './decode.ts'
import type { HeightSampler } from './flight.ts'
import {
  BORDER_GREEN,
  CYAN,
  contourBrightness,
  contourColor,
  hillshade,
  lineBrightness,
  rampInto,
} from './ramps.ts'
import type { ContourLevel } from './terrain-schema.ts'

export type VertexField = {
  pos: Float32Array
  col: Float32Array
  nrm: Float32Array
}
export type LineArrays = { pos: Float32Array; col: Float32Array }
export type RiverArrays = { pos: Float32Array; dist: Float32Array }

export const GRID_LINE_STRIDE = 5
const SEGMENT_ENDS = [0, 2] as const

/*
 * Builders port the prototype geometry fills verbatim. They are measured hot
 * paths over the 2600x1690 base grid, so loops mutate freshly created arrays.
 */
export const computeGridNormals = (
  h: Float32Array,
  spec: GridSpec,
  out: Float32Array,
): void => {
  const { nx, nz, cellX, cellZ } = spec
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const q = j * nx + i
      const iw = i > 0 ? i - 1 : i
      const ie = i < nx - 1 ? i + 1 : i
      const jn = j > 0 ? j - 1 : j
      const js = j < nz - 1 ? j + 1 : j
      const gx = -(h[j * nx + ie] - h[j * nx + iw]) / ((ie - iw) * cellX)
      const gz = -(h[js * nx + i] - h[jn * nx + i]) / ((js - jn) * cellZ)
      const inv = 1 / Math.sqrt(gx * gx + 1 + gz * gz)
      out[q * 3] = gx * inv
      out[q * 3 + 1] = inv
      out[q * 3 + 2] = gz * inv
    }
  }
}

export const buildBaseField = (
  spec: GridSpec,
  grid: MaskedGrid,
  hmax: number,
): VertexField => {
  const count = spec.nx * spec.nz
  const pos = new Float32Array(count * 3)
  const col = new Float32Array(count * 3)
  const nrm = new Float32Array(count * 3)
  computeGridNormals(grid.h, spec, nrm)
  for (let j = 0; j < spec.nz; j++) {
    for (let i = 0; i < spec.nx; i++) {
      const q = j * spec.nx + i
      const p = q * 3
      pos[p] = gridX(spec, i)
      pos[p + 1] = grid.h[q] - 6
      pos[p + 2] = gridZ(spec, j)
      rampInto(col, p, grid.h[q], hmax)
    }
  }
  return { pos, col, nrm }
}

export const buildMaskedQuadIndex = (
  mask: Uint8Array,
  nx: number,
  nz: number,
): Uint32Array => {
  const idx = new Uint32Array((nx - 1) * (nz - 1) * 6)
  let q = 0
  for (let j = 0; j < nz - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i
      if (!(mask[a] && mask[a + 1] && mask[a + nx] && mask[a + nx + 1])) {
        continue
      }
      idx[q++] = a
      idx[q++] = a + nx
      idx[q++] = a + 1
      idx[q++] = a + 1
      idx[q++] = a + nx
      idx[q++] = a + nx + 1
    }
  }
  return idx.slice(0, q)
}

export const buildGridLineSegments = (
  spec: GridSpec,
  grid: MaskedGrid,
  nrm: Float32Array,
  hmax: number,
): LineArrays => {
  const posArr: number[] = []
  const colArr: number[] = []
  const pushVertex = (q: number) => {
    const i = q % spec.nx
    const j = (q - i) / spec.nx
    const h = grid.h[q]
    posArr.push(gridX(spec, i), h - 10, gridZ(spec, j))
    const hs = hillshade(nrm[q * 3], nrm[q * 3 + 1], nrm[q * 3 + 2])
    const b = lineBrightness(h, hs, hmax)
    colArr.push(CYAN[0] * b, CYAN[1] * b, CYAN[2] * b)
  }
  const seg = (i0: number, j0: number, i1: number, j1: number) => {
    const a = j0 * spec.nx + i0
    const b = j1 * spec.nx + i1
    if (!(grid.mask[a] && grid.mask[b])) return
    pushVertex(a)
    pushVertex(b)
  }
  const s = GRID_LINE_STRIDE
  const mx = Math.floor((spec.nx - 1) / s) + 1
  const mz = Math.floor((spec.nz - 1) / s) + 1
  for (let jj = 0; jj < mz; jj++) {
    for (let ii = 0; ii < mx - 1; ii++)
      seg(ii * s, jj * s, (ii + 1) * s, jj * s)
  }
  for (let ii = 0; ii < mx; ii++) {
    for (let jj = 0; jj < mz - 1; jj++)
      seg(ii * s, jj * s, ii * s, (jj + 1) * s)
  }
  return { pos: new Float32Array(posArr), col: new Float32Array(colArr) }
}

export const buildBasePoints = (
  spec: GridSpec,
  grid: MaskedGrid,
  nrm: Float32Array,
  hmax: number,
): LineArrays => {
  const posArr: number[] = []
  const colArr: number[] = []
  for (let j = 0; j < spec.nz; j += 2) {
    for (let i = 0; i < spec.nx; i += 2) {
      const q = j * spec.nx + i
      if (!grid.mask[q]) continue
      const h = grid.h[q]
      posArr.push(gridX(spec, i), h + 2, gridZ(spec, j))
      const hs = hillshade(nrm[q * 3], nrm[q * 3 + 1], nrm[q * 3 + 2])
      const b = lineBrightness(h, hs, hmax) * 1.15
      colArr.push(CYAN[0] * b, CYAN[1] * b, CYAN[2] * b)
    }
  }
  return { pos: new Float32Array(posArr), col: new Float32Array(colArr) }
}

export const buildContourSegments = (
  levels: readonly ContourLevel[],
  hmax: number,
): LineArrays => {
  const posArr: number[] = []
  const colArr: number[] = []
  for (const level of levels) {
    const b = contourBrightness(level.lv, level.mj, hmax)
    const [r, g, bl] = contourColor(level.lv, hmax)
    for (const line of level.p) {
      for (let s = 0; s + 3 < line.length; s += 2) {
        for (const o of SEGMENT_ENDS) {
          posArr.push(line[s + o], level.lv + 8, line[s + o + 1])
          colArr.push(r * b, g * b, bl * b)
        }
      }
    }
  }
  return { pos: new Float32Array(posArr), col: new Float32Array(colArr) }
}

type BorderRing = { id: string; rings: number[][] }

export const buildBorderSegments = (
  borders: readonly BorderRing[],
  heightAt: HeightSampler,
): LineArrays => {
  const posArr: number[] = []
  const colArr: number[] = []
  for (const border of borders) {
    for (const ring of border.rings) {
      for (let s = 0; s + 3 < ring.length; s += 2) {
        for (const o of SEGMENT_ENDS) {
          const x = ring[s + o]
          const z = ring[s + o + 1]
          posArr.push(x, heightAt(x, z) + 14, z)
          colArr.push(BORDER_GREEN[0], BORDER_GREEN[1], BORDER_GREEN[2])
        }
      }
    }
  }
  return { pos: new Float32Array(posArr), col: new Float32Array(colArr) }
}

type River = { id: string; p: number[] }

export const buildRiverSegments = (
  rivers: readonly River[],
  heightAt: HeightSampler,
): RiverArrays => {
  const posArr: number[] = []
  const distArr: number[] = []
  for (const river of rivers) {
    let d = 0
    let px = 0
    let pz = 0
    for (let s = 0; s + 1 < river.p.length; s += 2) {
      const x = river.p[s]
      const z = river.p[s + 1]
      if (s > 0) {
        const dd = Math.hypot(x - px, z - pz)
        posArr.push(px, heightAt(px, pz) + 12, pz, x, heightAt(x, z) + 12, z)
        distArr.push(d, d + dd)
        d += dd
      }
      px = x
      pz = z
    }
  }
  return { pos: new Float32Array(posArr), dist: new Float32Array(distArr) }
}
