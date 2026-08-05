import { clamp } from 'es-toolkit'
import { sstep } from './easing.ts'

export type Vec3 = { x: number; y: number; z: number }
export type HeightSampler = (x: number, z: number) => number

export const AUTO_ADVANCE_SECONDS = 9
export const DAMP_SLOW = 0.15
export const DAMP_FAST = 0.06
export const PITCH_MIN = 0.14
export const PITCH_MAX = 1.4
export const RANGE_MIN = 900
export const RANGE_MAX = 380000
export const FLY_DEBOUNCE_MS = 350
export const CLEARANCE_FLY = 160
export const CLEARANCE_ORBIT = 50

export const wrapStep = (k: number, count: number): number =>
  ((k % count) + count) % count

export type LaunchInput = {
  cam: Vec3
  targetX: number
  targetZ: number
  targetH: number
  approachRange: number
  altitudeOffset: number
  ex: number
  reduced: boolean
  heightAtEx: HeightSampler
}

export type LaunchPlan = {
  end: Vec3
  durationMs: number
  arcHeight: number
  dist: number
}

export const planLaunch = (input: LaunchInput): LaunchPlan => {
  const dx = input.cam.x - input.targetX
  const dz = input.cam.z - input.targetZ
  const dist = Math.sqrt(dx * dx + dz * dz)
  const inv = dist > 1 ? 1 / dist : 0
  const endX = input.targetX + dx * inv * input.approachRange
  const endZ = input.targetZ + dz * inv * input.approachRange
  const endY = Math.max(
    input.targetH * input.ex + input.altitudeOffset,
    input.heightAtEx(endX, endZ) + 110,
  )
  const durationMs = input.reduced ? 1 : clamp(1 + dist / 60000, 1, 5) * 1000
  const baseArc = clamp(dist * 0.22, 2000, 28000)
  const arcHeight = Math.max(0, baseArc - Math.max(0, input.cam.y - endY))
  return { end: { x: endX, y: endY, z: endZ }, durationMs, arcHeight, dist }
}

export const flightPoint = (
  from: Vec3,
  end: Vec3,
  arcHeight: number,
  eased: number,
): Vec3 => ({
  x: from.x + (end.x - from.x) * eased,
  y: from.y + (end.y - from.y) * eased + 4 * eased * (1 - eased) * arcHeight,
  z: from.z + (end.z - from.z) * eased,
})

export type OrbitPose = { range: number; heading: number; pitch: number }

export const arrivePose = (cam: Vec3, focus: Vec3, ex: number): OrbitPose => {
  const focusYEx = focus.y * ex
  const dx = cam.x - focus.x
  const dz = cam.z - focus.z
  const dy = cam.y - focusYEx
  const range = Math.max(300, Math.sqrt(dx * dx + dy * dy + dz * dz))
  return {
    range,
    heading: Math.atan2(dx, dz),
    pitch: clamp(Math.asin(dy / range), PITCH_MIN, PITCH_MAX),
  }
}

export type ShowcaseTargets = {
  headingT: number
  rangeT: number
  done: boolean
}

export const showcaseTargets = (
  showT: number,
  heading0: number,
  range0: number,
): ShowcaseTargets => {
  const u = Math.min(1, showT / AUTO_ADVANCE_SECONDS)
  return {
    headingT: heading0 + u * Math.PI,
    rangeT: range0 * (1 + 0.18 * sstep(u)),
    done: u >= 1,
  }
}

export type SlotView = {
  approachRange: number
  altitudeOffset: number
  peakSpan: number
}

export const slotViewFor = (relief: number): SlotView => ({
  approachRange: clamp(900 + 1.8 * relief, 1500, 4600),
  altitudeOffset: clamp(0.32 * relief, 160, 460),
  peakSpan: 0.15 * relief,
})

export const orbitCameraPosition = (
  pose: OrbitPose,
  focus: Vec3,
  ex: number,
): Vec3 => {
  const cosPitch = Math.cos(pose.pitch)
  return {
    x: focus.x + Math.sin(pose.heading) * pose.range * cosPitch,
    y: focus.y * ex + pose.range * Math.sin(pose.pitch),
    z: focus.z + Math.cos(pose.heading) * pose.range * cosPitch,
  }
}
