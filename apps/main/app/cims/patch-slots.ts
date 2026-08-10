import { type GridSpec, gridX, gridZ, type MaskedGrid } from './decode.ts'
import { sstep } from './easing.ts'
import type { HeightSampler } from './flight.ts'
import { GRID_CYAN_RGB } from './palette.ts'
import {
  contourBrightness,
  contourColor,
  hillshade,
  lineBrightness,
} from './ramps.ts'
import type { ContourLevel, Mountain } from './terrain-schema.ts'

/* Per-vertex patch fills, measured hot paths like terrain-build; the cursor
   loops stay imperative and over the complexity budget on purpose. */

export const FADE_CELLS = 22
export const PATCH_LINE_STRIDE = 3
const SEGMENT_ENDS = [0, 2] as const

export const patchVertexCount = (n: number): number => (n - 1) * (n - 1) * 6

export const patchLineSegmentCount = (n: number): number => {
  const lm = Math.floor((n - 1) / PATCH_LINE_STRIDE) + 1
  return 2 * lm * (lm - 1)
}

export const contourSegmentCapacity = (
  mountains: readonly Mountain[],
): number => {
  const perMountain = mountains.map((mountain) =>
    mountain.contours
      .filter((level) => level.lv % 200 !== 0)
      .flatMap((level) => level.p)
      .reduce((sum, line) => sum + line.length / 2 - 1, 0),
  )
  return Math.ceil(Math.max(...perMountain, 0))
}

// blends patch borders into the base grid so the seam disappears
export const fadePatchEdges = (
  grid: MaskedGrid,
  spec: GridSpec,
  baseHeightAt: HeightSampler,
): void => {
  const n = spec.nx
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const q = j * n + i
      if (!grid.mask[q]) continue
      const edge = Math.min(i, j, n - 1 - i, n - 1 - j)
      if (edge >= FADE_CELLS) continue
      const w = sstep(edge / FADE_CELLS)
      const hb = baseHeightAt(gridX(spec, i), gridZ(spec, j))
      grid.h[q] = hb + (grid.h[q] - hb) * w
    }
  }
}

export type PatchMeshArrays = {
  pos: Float32Array
  col: Float32Array
  nrm: Float32Array
}

export const fillPatchMesh = (
  out: PatchMeshArrays,
  grid: MaskedGrid,
  spec: GridSpec,
  vN: Float32Array,
  vC: Float32Array,
): void => {
  const n = spec.nx
  let p = 0
  const corner = (q: number) => {
    const i = q % n
    const j = (q - i) / n
    out.pos[p] = gridX(spec, i)
    out.pos[p + 1] = grid.h[q]
    out.pos[p + 2] = gridZ(spec, j)
    out.nrm[p] = vN[q * 3]
    out.nrm[p + 1] = vN[q * 3 + 1]
    out.nrm[p + 2] = vN[q * 3 + 2]
    out.col[p] = vC[q * 3]
    out.col[p + 1] = vC[q * 3 + 1]
    out.col[p + 2] = vC[q * 3 + 2]
    p += 3
  }
  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const q = j * n + i
      const covered =
        grid.mask[q] &&
        grid.mask[q + 1] &&
        grid.mask[q + n] &&
        grid.mask[q + n + 1]
      if (covered) {
        corner(q)
        corner(q + n)
        corner(q + 1)
        corner(q + 1)
        corner(q + n)
        corner(q + n + 1)
        continue
      }
      for (let z = 0; z < 18; z++) {
        out.pos[p + z] = 0
        out.col[p + z] = 0
      }
      for (let v = 0; v < 6; v++) {
        out.nrm[p + v * 3] = 0
        out.nrm[p + v * 3 + 1] = 1
        out.nrm[p + v * 3 + 2] = 0
      }
      p += 18
    }
  }
}

export type LineFillArrays = { pos: Float32Array; col: Float32Array }

export const fillPatchLines = (
  out: LineFillArrays,
  grid: MaskedGrid,
  spec: GridSpec,
  vN: Float32Array,
  hmax: number,
): void => {
  const n = spec.nx
  let lp = 0
  const putVertex = (i: number, j: number, visible: boolean) => {
    const q = j * n + i
    const hh = grid.h[q]
    out.pos[lp] = gridX(spec, i)
    out.pos[lp + 1] = hh + 3
    out.pos[lp + 2] = gridZ(spec, j)
    const edge = Math.min(i, j, n - 1 - i, n - 1 - j)
    const shade = hillshade(vN[q * 3], vN[q * 3 + 1], vN[q * 3 + 2])
    const b = visible
      ? lineBrightness(hh, shade, hmax) * sstep(edge / FADE_CELLS)
      : 0
    out.col[lp] = GRID_CYAN_RGB[0] * b
    out.col[lp + 1] = GRID_CYAN_RGB[1] * b
    out.col[lp + 2] = GRID_CYAN_RGB[2] * b
    lp += 3
  }
  const seg = (i0: number, j0: number, i1: number, j1: number) => {
    const visible = Boolean(grid.mask[j0 * n + i0] && grid.mask[j1 * n + i1])
    putVertex(i0, j0, visible)
    putVertex(i1, j1, visible)
  }
  const s = PATCH_LINE_STRIDE
  const lm = Math.floor((n - 1) / s) + 1
  for (let jj = 0; jj < lm; jj++) {
    for (let ii = 0; ii < lm - 1; ii++)
      seg(ii * s, jj * s, (ii + 1) * s, jj * s)
  }
  for (let ii = 0; ii < lm; ii++) {
    for (let jj = 0; jj < lm - 1; jj++)
      seg(ii * s, jj * s, ii * s, (jj + 1) * s)
  }
}

export const fillPatchContours = (
  out: LineFillArrays,
  contours: readonly ContourLevel[],
  spec: GridSpec,
  hmax: number,
): void => {
  const half = ((spec.nx - 1) / 2) * spec.cellX
  const halfZ = ((spec.nz - 1) / 2) * spec.cellZ
  let cp = 0
  for (const level of contours) {
    if (level.lv % 200 === 0) continue
    const b0 = contourBrightness(level.lv, 0, hmax)
    const [r, g, b] = contourColor(level.lv, hmax)
    for (const line of level.p) {
      for (let s = 0; s + 3 < line.length; s += 2) {
        for (const o of SEGMENT_ENDS) {
          if (cp + 3 > out.pos.length) break
          const x = line[s + o]
          const z = line[s + o + 1]
          const di = (half - Math.abs(x - spec.ox)) / spec.cellX
          const dj = (halfZ - Math.abs(z - spec.oz)) / spec.cellZ
          const fade = b0 * sstep(Math.min(di, dj) / FADE_CELLS)
          out.pos[cp] = x
          out.pos[cp + 1] = level.lv + 6
          out.pos[cp + 2] = z
          out.col[cp] = r * fade
          out.col[cp + 1] = g * fade
          out.col[cp + 2] = b * fade
          cp += 3
        }
      }
    }
  }
  for (; cp < out.pos.length; cp++) {
    out.pos[cp] = 0
    out.col[cp] = 0
  }
}

export const fillPatchPoints = (
  out: LineFillArrays,
  grid: MaskedGrid,
  spec: GridSpec,
  vN: Float32Array,
  hmax: number,
): void => {
  const n = spec.nx
  let pp = 0
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const q = j * n + i
      const visible = Boolean(grid.mask[q])
      const hh = grid.h[q]
      out.pos[pp] = visible ? gridX(spec, i) : 0
      out.pos[pp + 1] = visible ? hh + 2.5 : 0
      out.pos[pp + 2] = visible ? gridZ(spec, j) : 0
      const shade = hillshade(vN[q * 3], vN[q * 3 + 1], vN[q * 3 + 2])
      const b = visible ? lineBrightness(hh, shade, hmax) * 1.1 : 0
      out.col[pp] = GRID_CYAN_RGB[0] * b
      out.col[pp + 1] = GRID_CYAN_RGB[1] * b
      out.col[pp + 2] = GRID_CYAN_RGB[2] * b
      pp += 3
    }
  }
}
