import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  type ColorRepresentation,
  LineBasicMaterial,
  LineLoop,
  Points,
  PointsMaterial,
  type Scene,
  type Texture,
  Vector3,
} from 'three'
import {
  moonPosition,
  orbitPoint,
  type SkyPosition,
  skyDirection,
  sunPosition,
} from './astronomy.ts'
import { sstep } from './easing.ts'
import { radialGlowTexture } from './glow-texture.ts'

export const SKY_ORBIT_RADIUS = 320000
const DEG = 180 / Math.PI

export type SkySnapshot = {
  sunDir: Vector3
  sunIntensity: number
  sunWarmth: number
  sunWorld: Vector3
  moonWorld: Vector3
}

type BodyPair = {
  positions: Float32Array
  geometry: BufferGeometry
  core: Points<BufferGeometry, PointsMaterial>
  halo: Points<BufferGeometry, PointsMaterial>
}

type BodySpec = {
  texture: Texture
  coreColor: ColorRepresentation
  coreSize: number
  haloColor: ColorRepresentation
  haloSize: number
  haloOpacity: number
}

const bodyPair = (scene: Scene, spec: BodySpec): BodyPair => {
  const positions = new Float32Array(3)
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  const core = new Points(
    geometry,
    new PointsMaterial({
      map: spec.texture,
      color: spec.coreColor,
      size: spec.coreSize,
      sizeAttenuation: false,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      fog: false,
    }),
  )
  const halo = new Points(
    geometry,
    new PointsMaterial({
      map: spec.texture,
      color: spec.haloColor,
      size: spec.haloSize,
      sizeAttenuation: false,
      transparent: true,
      opacity: spec.haloOpacity,
      depthWrite: false,
      blending: AdditiveBlending,
      fog: false,
    }),
  )
  core.renderOrder = 8
  halo.renderOrder = 8
  core.frustumCulled = false
  halo.frustumCulled = false
  scene.add(core, halo)
  return { positions, geometry, core, halo }
}

const orbitRing = (
  scene: Scene,
  dec: number,
  color: ColorRepresentation,
  opacity: number,
): {
  geometry: BufferGeometry
  ring: LineLoop<BufferGeometry, LineBasicMaterial>
} => {
  const pts = new Float32Array(128 * 3)
  for (let i = 0; i < 128; i++) {
    const H = (i / 128) * 2 * Math.PI
    const [x, y, z] = orbitPoint(dec, H)
    pts[i * 3] = x * SKY_ORBIT_RADIUS
    pts[i * 3 + 1] = y * SKY_ORBIT_RADIUS
    pts[i * 3 + 2] = z * SKY_ORBIT_RADIUS
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(pts, 3))
  const ring = new LineLoop(
    geometry,
    new LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      fog: false,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  )
  ring.frustumCulled = false
  scene.add(ring)
  return { geometry, ring }
}

export type SkyLayer = {
  update: (date: Date) => SkySnapshot
  dispose: () => void
}

const placeBody = (pair: BodyPair, position: SkyPosition, out: Vector3) => {
  const [x, y, z] = skyDirection(position.azN, position.elev)
  out.set(x, y, z)
  pair.positions[0] = x * SKY_ORBIT_RADIUS
  pair.positions[1] = y * SKY_ORBIT_RADIUS
  pair.positions[2] = z * SKY_ORBIT_RADIUS
  pair.geometry.attributes.position.needsUpdate = true
}

export const createSky = (scene: Scene, bootDate: Date): SkyLayer => {
  const sunTexture = radialGlowTexture([
    [0, 'rgba(255,250,238,1)'],
    [0.35, 'rgba(255,232,188,0.8)'],
    [1, 'rgba(255,210,140,0)'],
  ])
  const moonTexture = radialGlowTexture([
    [0, 'rgba(235,244,238,1)'],
    [0.35, 'rgba(205,222,212,0.7)'],
    [1, 'rgba(180,205,192,0)'],
  ])
  const sun = bodyPair(scene, {
    texture: sunTexture,
    coreColor: 0xfff3da,
    coreSize: 46,
    haloColor: 0xffd9a0,
    haloSize: 96,
    haloOpacity: 0.16,
  })
  const moon = bodyPair(scene, {
    texture: moonTexture,
    coreColor: 0xe8f2ea,
    coreSize: 26,
    haloColor: 0xc7dccd,
    haloSize: 56,
    haloOpacity: 0.05,
  })
  const rings = [
    orbitRing(scene, sunPosition(bootDate).dec, 0xffc98a, 0.2),
    orbitRing(scene, moonPosition(bootDate).dec, 0xa9c9b4, 0.16),
  ]

  const snapshot: SkySnapshot = {
    sunDir: new Vector3(0, 1, 0),
    sunIntensity: 0,
    sunWarmth: 0,
    sunWorld: new Vector3(),
    moonWorld: new Vector3(),
  }
  const moonDir = new Vector3()

  const update = (date: Date): SkySnapshot => {
    const sunNow = sunPosition(date)
    placeBody(sun, sunNow, snapshot.sunDir)
    snapshot.sunWorld.copy(snapshot.sunDir).multiplyScalar(SKY_ORBIT_RADIUS)
    snapshot.sunIntensity = sstep((sunNow.elev * DEG + 6) / 16)
    snapshot.sunWarmth = sstep((sunNow.elev * DEG) / 25)
    const moonNow = moonPosition(date)
    placeBody(moon, moonNow, moonDir)
    snapshot.moonWorld.copy(moonDir).multiplyScalar(SKY_ORBIT_RADIUS)
    return snapshot
  }

  const dispose = () => {
    for (const pair of [sun, moon]) {
      pair.geometry.dispose()
      pair.core.material.dispose()
      pair.halo.material.dispose()
      scene.remove(pair.core, pair.halo)
    }
    for (const { geometry, ring } of rings) {
      geometry.dispose()
      ring.material.dispose()
      scene.remove(ring)
    }
    sunTexture.dispose()
    moonTexture.dispose()
  }

  return { update, dispose }
}
