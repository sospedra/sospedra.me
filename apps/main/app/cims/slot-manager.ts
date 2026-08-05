import {
  BufferAttribute,
  BufferGeometry,
  type Group,
  LineSegments,
  Mesh,
  Points,
  type ShaderMaterial,
  Vector3,
} from 'three'
import {
  decodeMasked,
  type GridSpec,
  gridX,
  gridZ,
  type MaskedGrid,
  sampleBounded,
  smoothGrid,
} from './decode.ts'
import { type HeightSampler, slotViewFor } from './flight.ts'
import {
  contourSegmentCapacity,
  fadePatchEdges,
  fillPatchContours,
  fillPatchLines,
  fillPatchMesh,
  fillPatchPoints,
  patchLineSegmentCount,
  patchVertexCount,
} from './patch-slots.ts'
import { rampInto } from './ramps.ts'
import {
  additiveLineMaterial,
  additivePointsMaterial,
  SOLID_LAYER,
  type SurfaceMode,
} from './scene.ts'
import { computeGridNormals } from './terrain-build.ts'
import type { TerrainData } from './terrain-schema.ts'

export type SlotPeak = { name: string; elev: number; pos: Vector3 }

export type PatchSlot = {
  solid: Mesh<BufferGeometry, ShaderMaterial>
  lines: LineSegments
  cont: LineSegments
  pts: Points
  active: boolean
  k: number
  grid: MaskedGrid | null
  spec: GridSpec
  center: Vector3
  approachRange: number
  altitudeOffset: number
  peaks: SlotPeak[]
}

export type SlotManager = ReturnType<typeof createSlotManager>

type SlotManagerOptions = {
  world: Group
  data: TerrainData
  heightAtBase: HeightSampler
  createTerrainMaterial: () => ShaderMaterial
}

export const createSlotManager = (options: SlotManagerOptions) => {
  const { world, data } = options
  const n = data.grid
  const hmax = data.base.hmax
  const vertexFloats = patchVertexCount(n) * 3
  const lineFloats = patchLineSegmentCount(n) * 2 * 3
  const contourFloats = contourSegmentCapacity(data.mountains) * 2 * 3
  const normalScratch = new Float32Array(n * n * 3)
  const colorScratch = new Float32Array(n * n * 3)
  const heightCache = new Map<number, MaskedGrid>()
  const geometries: BufferGeometry[] = []
  const lineMaterials = [additiveLineMaterial(0.9), additivePointsMaterial(2.4)]

  const attributePair = (floats: number): BufferGeometry => {
    const geometry = new BufferGeometry()
    geometry.setAttribute(
      'position',
      new BufferAttribute(new Float32Array(floats), 3),
    )
    geometry.setAttribute(
      'color',
      new BufferAttribute(new Float32Array(floats), 3),
    )
    geometries.push(geometry)
    return geometry
  }

  const makeSlot = (): PatchSlot => {
    const meshGeometry = attributePair(vertexFloats)
    meshGeometry.setAttribute(
      'normal',
      new BufferAttribute(new Float32Array(vertexFloats), 3),
    )
    const solid = new Mesh(meshGeometry, options.createTerrainMaterial())
    solid.frustumCulled = false
    solid.visible = false
    solid.layers.enable(SOLID_LAYER)
    const lines = new LineSegments(attributePair(lineFloats), lineMaterials[0])
    const cont = new LineSegments(
      attributePair(contourFloats),
      lineMaterials[0],
    )
    const pts = new Points(attributePair(n * n * 3), lineMaterials[1])
    for (const part of [lines, cont, pts]) {
      part.frustumCulled = false
      part.visible = false
    }
    world.add(solid, lines, cont, pts)
    return {
      solid,
      lines,
      cont,
      pts,
      active: false,
      k: -1,
      grid: null,
      spec: { nx: n, nz: n, ox: 0, oz: 0, cellX: 1, cellZ: 1 },
      center: new Vector3(),
      approachRange: 2600,
      altitudeOffset: 330,
      peaks: [],
    }
  }

  const slots: [PatchSlot, PatchSlot] = [makeSlot(), makeSlot()]

  const heightsOf = (k: number): MaskedGrid => {
    const cached = heightCache.get(k)
    if (cached) return cached
    const mountain = data.mountains[k]
    const grid = decodeMasked(mountain.b64, mountain.hmin, mountain.hmax)
    smoothGrid(grid.h, grid.mask, n, n, 2)
    const spec: GridSpec = {
      nx: n,
      nz: n,
      ox: mountain.ox,
      oz: mountain.oz,
      cellX: mountain.cellX,
      cellZ: mountain.cellZ,
    }
    fadePatchEdges(grid, spec, options.heightAtBase)
    heightCache.set(k, grid)
    return grid
  }

  const markUpdated = (geometry: BufferGeometry, names: string[]) => {
    for (const name of names) {
      geometry.attributes[name].needsUpdate = true
    }
  }

  const applyVisibility = (slot: PatchSlot, mode: SurfaceMode) => {
    slot.solid.visible = slot.active
    slot.lines.visible = slot.active && mode === 'grid'
    slot.cont.visible = slot.active && mode === 'contour'
    slot.pts.visible = slot.active && mode === 'points'
  }

  const buildSlot = (slot: PatchSlot, k: number, mode: SurfaceMode) => {
    const mountain = data.mountains[k]
    const grid = heightsOf(k)
    slot.k = k
    slot.grid = grid
    slot.active = true
    slot.spec = {
      nx: n,
      nz: n,
      ox: mountain.ox,
      oz: mountain.oz,
      cellX: mountain.cellX,
      cellZ: mountain.cellZ,
    }
    computeGridNormals(grid.h, slot.spec, normalScratch)
    for (let q = 0; q < n * n; q++) {
      rampInto(colorScratch, q * 3, grid.h[q], hmax)
    }
    const meshArrays = {
      pos: slot.solid.geometry.attributes.position.array as Float32Array,
      col: slot.solid.geometry.attributes.color.array as Float32Array,
      nrm: slot.solid.geometry.attributes.normal.array as Float32Array,
    }
    fillPatchMesh(meshArrays, grid, slot.spec, normalScratch, colorScratch)
    markUpdated(slot.solid.geometry, ['position', 'color', 'normal'])
    const lineArrays = {
      pos: slot.lines.geometry.attributes.position.array as Float32Array,
      col: slot.lines.geometry.attributes.color.array as Float32Array,
    }
    fillPatchLines(lineArrays, grid, slot.spec, normalScratch, hmax)
    markUpdated(slot.lines.geometry, ['position', 'color'])
    const contourArrays = {
      pos: slot.cont.geometry.attributes.position.array as Float32Array,
      col: slot.cont.geometry.attributes.color.array as Float32Array,
    }
    fillPatchContours(contourArrays, mountain.contours, slot.spec, hmax)
    markUpdated(slot.cont.geometry, ['position', 'color'])
    const pointArrays = {
      pos: slot.pts.geometry.attributes.position.array as Float32Array,
      col: slot.pts.geometry.attributes.color.array as Float32Array,
    }
    fillPatchPoints(pointArrays, grid, slot.spec, normalScratch, hmax)
    markUpdated(slot.pts.geometry, ['position', 'color'])

    slot.peaks = mountain.peaks.map((peak) => ({
      name: peak.name,
      elev: peak.elev,
      pos: new Vector3(
        gridX(slot.spec, peak.i),
        grid.h[peak.j * n + peak.i],
        gridZ(slot.spec, peak.j),
      ),
    }))
    slot.center.copy(slot.peaks[0].pos)
    const view = slotViewFor(mountain.hmax - mountain.hmin)
    slot.approachRange = view.approachRange
    slot.altitudeOffset = view.altitudeOffset
    slot.solid.material.uniforms.uPkStart.value = mountain.hmax - view.peakSpan
    slot.solid.material.uniforms.uPkSpan.value = view.peakSpan
    applyVisibility(slot, mode)
  }

  const sampleActive = (x: number, z: number): number => {
    let h = Number.NEGATIVE_INFINITY
    for (const slot of slots) {
      if (!slot.active || !slot.grid) continue
      h = Math.max(h, sampleBounded(slot.spec, slot.grid.h, x, z))
    }
    return h
  }

  const dispose = () => {
    for (const slot of slots) {
      world.remove(slot.solid, slot.lines, slot.cont, slot.pts)
    }
    for (const geometry of geometries) geometry.dispose()
    for (const material of lineMaterials) material.dispose()
  }

  return { slots, buildSlot, applyVisibility, sampleActive, dispose }
}
