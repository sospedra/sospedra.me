import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  type Group,
  Line,
  LineBasicMaterial,
  Points,
  PointsMaterial,
  type Texture,
  Vector3,
} from 'three'
import type { HeightSampler } from './flight.ts'
import { TOUR_AMBER, TOUR_AMBER_RGB, TRAIL_HEAD } from './palette.ts'

const TRAIL_POINTS = 180
const TAIL_WINDOW = 50

export type FlightTrail = {
  head: Vector3
  build: (
    from: { x: number; z: number },
    to: { x: number; z: number },
    heightAt: HeightSampler,
  ) => void
  update: (progress: number, ms: number) => void
  hide: () => void
  dispose: () => void
}

export const createTrail = (
  world: Group,
  glowTexture: Texture,
): FlightTrail => {
  const trailPos = new Float32Array(TRAIL_POINTS * 3)
  const tailCol = new Float32Array(TRAIL_POINTS * 3)

  const routeGeo = new BufferGeometry()
  routeGeo.setAttribute('position', new BufferAttribute(trailPos, 3))
  routeGeo.setDrawRange(0, 0)
  const routeMat = new LineBasicMaterial({
    color: TOUR_AMBER,
    transparent: true,
    opacity: 0.35,
    blending: AdditiveBlending,
    depthTest: false,
  })
  const route = new Line(routeGeo, routeMat)
  route.frustumCulled = false
  route.renderOrder = 9
  route.visible = false
  world.add(route)

  const tailGeo = new BufferGeometry()
  tailGeo.setAttribute('position', new BufferAttribute(trailPos, 3))
  tailGeo.setAttribute('color', new BufferAttribute(tailCol, 3))
  tailGeo.setDrawRange(0, 0)
  const tailMat = new PointsMaterial({
    map: glowTexture,
    vertexColors: true,
    size: 9,
    sizeAttenuation: false,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: AdditiveBlending,
  })
  const tail = new Points(tailGeo, tailMat)
  tail.frustumCulled = false
  tail.renderOrder = 10
  tail.visible = false
  world.add(tail)

  const headPosition = new Float32Array(3)
  const headGeo = new BufferGeometry()
  headGeo.setAttribute('position', new BufferAttribute(headPosition, 3))
  const headMat = new PointsMaterial({
    map: glowTexture,
    color: TRAIL_HEAD,
    size: 26,
    sizeAttenuation: false,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: AdditiveBlending,
  })
  const haloMat = new PointsMaterial({
    map: glowTexture,
    color: TOUR_AMBER,
    size: 58,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.35,
    depthTest: false,
    depthWrite: false,
    blending: AdditiveBlending,
  })
  const headPt = new Points(headGeo, headMat)
  const haloPt = new Points(headGeo, haloMat)
  headPt.renderOrder = 12
  haloPt.renderOrder = 11
  headPt.frustumCulled = false
  haloPt.frustumCulled = false
  headPt.visible = false
  haloPt.visible = false
  world.add(headPt, haloPt)

  const head = new Vector3()
  const parts = [route, tail, headPt, haloPt]

  const build = (
    from: { x: number; z: number },
    to: { x: number; z: number },
    heightAt: HeightSampler,
  ) => {
    for (let s = 0; s < TRAIL_POINTS; s++) {
      const u = s / (TRAIL_POINTS - 1)
      const x = from.x + (to.x - from.x) * u
      const z = from.z + (to.z - from.z) * u
      trailPos[s * 3] = x
      trailPos[s * 3 + 1] = heightAt(x, z) + 24
      trailPos[s * 3 + 2] = z
      tailCol[s * 3] = 0
      tailCol[s * 3 + 1] = 0
      tailCol[s * 3 + 2] = 0
    }
    routeGeo.attributes.position.needsUpdate = true
    tailGeo.attributes.position.needsUpdate = true
    routeGeo.setDrawRange(0, 0)
    tailGeo.setDrawRange(0, 0)
    for (const part of parts) part.visible = true
  }

  const update = (progress: number, ms: number) => {
    const f = progress * (TRAIL_POINTS - 1)
    const i0 = Math.min(TRAIL_POINTS - 2, Math.floor(f))
    const fr = f - i0
    head.set(
      trailPos[i0 * 3] + (trailPos[(i0 + 1) * 3] - trailPos[i0 * 3]) * fr,
      trailPos[i0 * 3 + 1] +
        (trailPos[(i0 + 1) * 3 + 1] - trailPos[i0 * 3 + 1]) * fr +
        10 +
        Math.sin(ms * 0.005) * 5,
      trailPos[i0 * 3 + 2] +
        (trailPos[(i0 + 1) * 3 + 2] - trailPos[i0 * 3 + 2]) * fr,
    )
    headPosition[0] = head.x
    headPosition[1] = head.y
    headPosition[2] = head.z
    headGeo.attributes.position.needsUpdate = true
    const count = Math.max(2, i0 + 2)
    routeGeo.setDrawRange(0, count)
    tailGeo.setDrawRange(0, count)
    for (let s = 0; s < count; s++) {
      const d = f - s
      const k = d < 0 ? 1 : Math.max(0, 1 - d / TAIL_WINDOW)
      const twinkle = 0.8 + 0.2 * Math.sin(ms * 0.012 + s * 0.7)
      const b = (0.1 + 0.9 * k) * twinkle
      tailCol[s * 3] = TOUR_AMBER_RGB[0] * b
      tailCol[s * 3 + 1] = TOUR_AMBER_RGB[1] * b
      tailCol[s * 3 + 2] = TOUR_AMBER_RGB[2] * b
    }
    tailGeo.attributes.color.needsUpdate = true
    headMat.size = 26 + 6 * Math.sin(ms * 0.006)
    haloMat.size = 58 + 12 * Math.sin(ms * 0.006 + 1.2)
  }

  const hide = () => {
    for (const part of parts) part.visible = false
  }

  const dispose = () => {
    for (const part of parts) world.remove(part)
    routeGeo.dispose()
    tailGeo.dispose()
    headGeo.dispose()
    routeMat.dispose()
    tailMat.dispose()
    headMat.dispose()
    haloMat.dispose()
  }

  return { head, build, update, hide, dispose }
}
