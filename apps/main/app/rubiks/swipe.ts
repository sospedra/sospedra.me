import {
  axisOf,
  FACE_NORMAL,
  FACES,
  type Face,
  type Move,
  type Vec,
} from './engine.ts'

export type Orbit = { rotateX: number; rotateY: number }
export type StickerHit = { face: Face; position: Vec }

const AXIS_UNIT: readonly Vec[] = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
]

const rad = (deg: number) => (deg * Math.PI) / 180

// engine is y-up right-handed, the scene applies rotateX(rx) rotateY(ry)
// in CSS y-down space: project a direction onto the screen plane
const toScreen = (orbit: Orbit, [x, y, z]: Vec): [number, number] => {
  const sinY = Math.sin(rad(orbit.rotateY))
  const cosY = Math.cos(rad(orbit.rotateY))
  const sinX = Math.sin(rad(orbit.rotateX))
  const cosX = Math.cos(rad(orbit.rotateX))
  const screenX = cosY * x + sinY * z
  const depth = -sinY * x + cosY * z
  return [screenX, cosX * -y - sinX * depth]
}

const cross = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]

// a swipe drags the touched sticker across its face: the better-aligned
// in-plane axis is the motion, the remaining axis holds the turned layer
export const swipeMove = (
  orbit: Orbit,
  hit: StickerHit,
  swipe: readonly [number, number],
): Move | null => {
  const [dx, dy] = swipe
  const alignment = (axis: number) => {
    const [x, y] = toScreen(orbit, AXIS_UNIT[axis])
    return Math.abs(x * dx + y * dy)
  }
  const [a, b] = [0, 1, 2].filter(
    (axis) => axis !== axisOf(FACE_NORMAL[hit.face]),
  )
  const layerAxis = alignment(a) >= alignment(b) ? b : a
  const layerCoord = hit.position[layerAxis]
  if (layerCoord === 0) return null
  const layerFace = FACES.find(
    (face) => FACE_NORMAL[face][layerAxis] === layerCoord,
  )
  if (!layerFace) return null

  const [vx, vy] = toScreen(orbit, cross(AXIS_UNIT[layerAxis], hit.position))
  const positiveTurn = vx * dx + vy * dy > 0
  // the engine's plain move is -90° · layerCoord about the layer axis
  const prime = positiveTurn === (layerCoord === 1)
  return { face: layerFace, prime }
}
