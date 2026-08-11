import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  ColorManagement,
  type ColorRepresentation,
  Fog,
  Group,
  LinearSRGBColorSpace,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  ShaderMaterial,
  type Texture,
  WebGLRenderer,
} from 'three'
import {
  decodeMasked,
  type GridSpec,
  sampleClamped,
  smoothGrid,
} from './decode.ts'
import { FOG_COLOR } from './palette.ts'
import RIVER_FRAGMENT from './river.frag'
import RIVER_VERTEX from './river.vert'
import { riverUniforms, terrainUniforms } from './shaders.ts'
import TERRAIN_FRAGMENT from './terrain.frag'
import TERRAIN_VERTEX from './terrain.vert'
import {
  buildBaseField,
  buildBasePoints,
  buildBorderSegments,
  buildContourSegments,
  buildGridLineSegments,
  buildMaskedQuadIndex,
  buildRiverSegments,
} from './terrain-build.ts'
import type { TerrainData } from './terrain-schema.ts'

export type SurfaceMode = 'grid' | 'contour' | 'points'
export const SURFACE_MODES: readonly SurfaceMode[] = [
  'grid',
  'contour',
  'points',
]

export const SOLID_LAYER = 1

export const devicePixelRatioCap = (): number =>
  Math.min(window.devicePixelRatio, window.innerWidth < 700 ? 1.75 : 2)

const lineGeometry = (pos: Float32Array, col: Float32Array): BufferGeometry => {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(pos, 3))
  geometry.setAttribute('color', new BufferAttribute(col, 3))
  return geometry
}

export const additiveLineMaterial = (opacity: number): LineBasicMaterial =>
  new LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity,
    blending: AdditiveBlending,
    depthWrite: false,
  })

export const additivePointsMaterial = (size: number): PointsMaterial =>
  new PointsMaterial({
    vertexColors: true,
    size,
    sizeAttenuation: false,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })

export type CimsScene = ReturnType<typeof createCimsScene>

export const createCimsScene = (
  canvas: HTMLCanvasElement,
  data: TerrainData,
  initialEx: number,
) => {
  ColorManagement.enabled = false
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.outputColorSpace = LinearSRGBColorSpace
  renderer.setPixelRatio(devicePixelRatioCap())
  renderer.setSize(window.innerWidth, window.innerHeight)

  const scene = new Scene()
  const fog = new Fog(FOG_COLOR, 3000, 12000)
  scene.fog = fog
  const world = new Group()
  world.scale.y = initialEx
  scene.add(world)

  const camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    2,
    1500000,
  )
  camera.rotation.order = 'YXZ'
  camera.layers.enableAll()

  const terrainMaterials: ShaderMaterial[] = []
  const createTerrainMaterial = (): ShaderMaterial => {
    const material = new ShaderMaterial({
      uniforms: terrainUniforms(initialEx),
      vertexShader: TERRAIN_VERTEX,
      fragmentShader: TERRAIN_FRAGMENT,
      vertexColors: true,
      fog: true,
      polygonOffset: true,
      polygonOffsetFactor: 2,
      polygonOffsetUnits: 2,
    })
    terrainMaterials.push(material)
    return material
  }

  const hmax = data.base.hmax
  const baseSpec: GridSpec = {
    nx: data.base.nx,
    nz: data.base.nz,
    ox: data.base.ox,
    oz: data.base.oz,
    cellX: data.base.cellX,
    cellZ: data.base.cellZ,
  }
  const baseGrid = decodeMasked(data.base.q, data.base.hmin, data.base.hmax)
  smoothGrid(baseGrid.h, baseGrid.mask, baseSpec.nx, baseSpec.nz, 1)
  const heightAtBase = (x: number, z: number): number =>
    sampleClamped(baseSpec, baseGrid.h, x, z)

  const geometries: BufferGeometry[] = []
  const materials: (LineBasicMaterial | PointsMaterial | ShaderMaterial)[] = []

  const field = buildBaseField(baseSpec, baseGrid, hmax)
  const baseGeometry = new BufferGeometry()
  baseGeometry.setAttribute('position', new BufferAttribute(field.pos, 3))
  baseGeometry.setAttribute('color', new BufferAttribute(field.col, 3))
  baseGeometry.setAttribute('normal', new BufferAttribute(field.nrm, 3))
  baseGeometry.setIndex(
    new BufferAttribute(
      buildMaskedQuadIndex(baseGrid.mask, baseSpec.nx, baseSpec.nz),
      1,
    ),
  )
  geometries.push(baseGeometry)
  const baseMesh = new Mesh(baseGeometry, createTerrainMaterial())
  baseMesh.frustumCulled = false
  baseMesh.layers.enable(SOLID_LAYER)
  world.add(baseMesh)

  const gridSegments = buildGridLineSegments(
    baseSpec,
    baseGrid,
    field.nrm,
    hmax,
  )
  const gridLines = new LineSegments(
    lineGeometry(gridSegments.pos, gridSegments.col),
    additiveLineMaterial(0.85),
  )
  const contourSegments = buildContourSegments(data.contours, hmax)
  const baseContours = new LineSegments(
    lineGeometry(contourSegments.pos, contourSegments.col),
    additiveLineMaterial(0.9),
  )
  const borderSegments = buildBorderSegments(data.borders, heightAtBase)
  const borders = new LineSegments(
    lineGeometry(borderSegments.pos, borderSegments.col),
    additiveLineMaterial(0.6),
  )
  const riverMaterial = new ShaderMaterial({
    uniforms: riverUniforms(),
    vertexShader: RIVER_VERTEX,
    fragmentShader: RIVER_FRAGMENT,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    fog: true,
  })
  const riverSegments = buildRiverSegments(data.rivers, heightAtBase)
  const riverGeometry = new BufferGeometry()
  riverGeometry.setAttribute(
    'position',
    new BufferAttribute(riverSegments.pos, 3),
  )
  riverGeometry.setAttribute(
    'aDist',
    new BufferAttribute(riverSegments.dist, 1),
  )
  const rivers = new LineSegments(riverGeometry, riverMaterial)
  geometries.push(riverGeometry)
  materials.push(riverMaterial)

  for (const layer of [gridLines, baseContours, borders, rivers]) {
    layer.frustumCulled = false
    world.add(layer)
  }
  for (const layer of [gridLines, baseContours, borders]) {
    geometries.push(layer.geometry)
    materials.push(layer.material)
  }

  let basePoints: Points | null = null
  const ensureBasePoints = (): Points => {
    if (basePoints) return basePoints
    const pointField = buildBasePoints(baseSpec, baseGrid, field.nrm, hmax)
    const geometry = lineGeometry(pointField.pos, pointField.col)
    const material = additivePointsMaterial(2.2)
    basePoints = new Points(geometry, material)
    basePoints.frustumCulled = false
    world.add(basePoints)
    geometries.push(geometry)
    materials.push(material)
    return basePoints
  }

  const showSurface = (mode: SurfaceMode) => {
    gridLines.visible = mode === 'grid'
    baseContours.visible = mode === 'contour'
    if (mode === 'points') ensureBasePoints()
    if (basePoints) basePoints.visible = mode === 'points'
  }
  showSurface('contour')

  const addMarkerPoints = (
    positions: readonly { x: number; h: number; z: number }[],
    texture: Texture,
    color: ColorRepresentation,
    size: number,
    lift: number,
  ) => {
    const arr = new Float32Array(positions.length * 3)
    positions.forEach((p, i) => {
      arr[i * 3] = p.x
      arr[i * 3 + 1] = p.h + lift
      arr[i * 3 + 2] = p.z
    })
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(arr, 3))
    const material = new PointsMaterial({
      map: texture,
      color,
      size,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    const points = new Points(geometry, material)
    points.frustumCulled = false
    world.add(points)
    geometries.push(geometry)
    materials.push(material)
  }

  const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setPixelRatio(devicePixelRatioCap())
    renderer.setSize(window.innerWidth, window.innerHeight)
  }

  const dispose = () => {
    for (const geometry of geometries) geometry.dispose()
    for (const material of [...materials, ...terrainMaterials]) {
      material.dispose()
    }
    renderer.dispose()
    renderer.forceContextLoss()
  }

  return {
    renderer,
    scene,
    camera,
    world,
    fog,
    fogColor: new Color(FOG_COLOR),
    terrainMaterials,
    createTerrainMaterial,
    riverMaterial,
    baseSpec,
    baseGrid,
    heightAtBase,
    showSurface,
    addMarkerPoints,
    resize,
    dispose,
  }
}
