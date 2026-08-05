import type { Vector3 } from 'three'
import type { CimsSnapshot, CimsStore, TourTarget } from './cims-store.ts'
import {
  arrivePose,
  FLY_DEBOUNCE_MS,
  type HeightSampler,
  planLaunch,
  wrapStep,
} from './flight.ts'
import type { CimsRig } from './rig.ts'
import type { SurfaceMode } from './scene.ts'
import type { CimsSfx } from './sfx.ts'
import type { SlotManager, SlotPeak } from './slot-manager.ts'
import type { StageMarker } from './stage-projection.ts'
import type { FlightTrail } from './trail.ts'

const CITY_APPROACH_RANGE = 2600
const CITY_ALTITUDE_OFFSET = 300

export type FlightPlanState = {
  t0: number
  T: number
  H: number
  trail: boolean
  city: number | null
  fp: Vector3
  ep: Vector3
  target: Vector3
}

export type TourControllerOptions = {
  mountainCount: number
  cityData: readonly StageMarker[]
  store: CimsStore
  rig: CimsRig
  fly: FlightPlanState
  slotManager: SlotManager
  trail: FlightTrail
  sfx: CimsSfx
  focus: Vector3
  focusT: Vector3
  camPos: Vector3
  quiet: () => boolean
  exaggeration: () => number
  surfaceMode: () => SurfaceMode
  sampleAny: HeightSampler
  heightAtEx: HeightSampler
}

export type TourController = ReturnType<typeof createTourController>

export const createTourController = (options: TourControllerOptions) => {
  const { store, rig, fly, trail, sfx, focus, focusT, camPos } = options
  const { slots } = options.slotManager
  let curSlot = 0
  let pendingSlot = 0
  let lastFly = 0
  let activePeaks: readonly SlotPeak[] = []

  const publish = (patch: Partial<CimsSnapshot>) =>
    store.set({ ...store.get(), ...patch })

  const destIndex = (): number =>
    rig.mode === 'fly' && fly.city === null
      ? slots[pendingSlot].k
      : slots[curSlot].k

  const publishTour = (
    target: TourTarget,
    enRoute: boolean,
    distanceKm: number,
  ) => {
    const peakLabels =
      target.kind === 'mountain'
        ? activePeaks.slice(0, 2).map((p) => ({ name: p.name, elev: p.elev }))
        : []
    const seqIndex =
      target.kind === 'mountain' ? target.index : store.get().seqIndex
    publish({ target, seqIndex, enRoute, distanceKm, peakLabels })
  }

  const launchTo = (
    targetX: number,
    targetZ: number,
    targetH: number,
    approachRange: number,
    altitudeOffset: number,
  ): number => {
    const plan = planLaunch({
      cam: camPos,
      targetX,
      targetZ,
      targetH,
      approachRange,
      altitudeOffset,
      ex: options.exaggeration(),
      reduced: options.quiet(),
      heightAtEx: options.heightAtEx,
    })
    const from =
      rig.mode === 'fly' && fly.trail
        ? { x: trail.head.x, z: trail.head.z }
        : { x: focus.x, z: focus.z }
    fly.fp.copy(camPos)
    fly.ep.set(plan.end.x, plan.end.y, plan.end.z)
    fly.target.set(targetX, targetH, targetZ)
    fly.T = plan.durationMs
    fly.H = plan.arcHeight
    fly.t0 = performance.now()
    fly.trail = true
    trail.build(from, { x: targetX, z: targetZ }, options.sampleAny)
    rig.mode = 'fly'
    sfx.travel()
    sfx.flightStart()
    return plan.dist
  }

  const flyToMountain = (index: number) => {
    const now = performance.now()
    if (now - lastFly < FLY_DEBOUNCE_MS) return
    const k = wrapStep(index, options.mountainCount)
    if (fly.city === null && k === destIndex() && rig.mode === 'fly') return
    if (rig.mode === 'orbit' && fly.city === null && k === slots[curSlot].k) {
      return
    }
    lastFly = now
    const target = k === slots[curSlot].k ? curSlot : 1 - curSlot
    if (slots[target].k !== k) {
      options.slotManager.buildSlot(slots[target], k, options.surfaceMode())
    } else {
      slots[target].active = true
      options.slotManager.applyVisibility(slots[target], options.surfaceMode())
    }
    pendingSlot = target
    fly.city = null
    const slot = slots[target]
    activePeaks = slot.peaks
    const dist = launchTo(
      slot.center.x,
      slot.center.z,
      slot.center.y,
      slot.approachRange,
      slot.altitudeOffset,
    )
    publishTour({ kind: 'mountain', index: k }, true, Math.round(dist / 1000))
  }

  const flyToCity = (index: number) => {
    const now = performance.now()
    if (now - lastFly < FLY_DEBOUNCE_MS) return
    lastFly = now
    fly.city = index
    pendingSlot = curSlot
    const city = options.cityData[index]
    activePeaks = []
    const dist = launchTo(
      city.x,
      city.z,
      city.h,
      CITY_APPROACH_RANGE,
      CITY_ALTITUDE_OFFSET,
    )
    publishTour({ kind: 'city', index }, true, Math.round(dist / 1000))
  }

  const arrive = () => {
    sfx.flightStop()
    sfx.arrive()
    trail.hide()
    if (fly.city !== null) {
      const city = options.cityData[fly.city]
      focus.set(city.x, city.h, city.z)
      publishTour({ kind: 'city', index: fly.city }, false, 0)
    } else {
      curSlot = pendingSlot
      const other = slots[1 - curSlot]
      other.active = false
      options.slotManager.applyVisibility(other, options.surfaceMode())
      focus.copy(slots[curSlot].center)
      publishTour({ kind: 'mountain', index: slots[curSlot].k }, false, 0)
    }
    rig.mode = 'orbit'
    focusT.copy(focus)
    rig.focusYT = focus.y
    const pose = arrivePose(camPos, focus, options.exaggeration())
    rig.range = pose.range
    rig.rangeT = pose.range
    rig.heading = pose.heading
    rig.headingT = pose.heading
    rig.pitch = pose.pitch
    rig.pitchT = pose.pitch
    rig.lookYaw = 0
    rig.lookTilt = 0
    rig.lookYawT = 0
    rig.lookTiltT = 0
    rig.showT = options.quiet() || !store.get().autoOn ? -1 : 0
    rig.showH0 = rig.heading
    rig.showR0 = rig.range
    rig.autoT = 0
    rig.idleT = 0
    fly.city = null
  }

  const boot = () => {
    options.slotManager.buildSlot(slots[0], 0, options.surfaceMode())
    activePeaks = slots[0].peaks
    publishTour({ kind: 'mountain', index: 0 }, false, 0)
  }

  return {
    boot,
    flyToMountain,
    flyToCity,
    arrive,
    destIndex,
    advance: (step: number) => flyToMountain(slots[curSlot].k + step),
    activePeaks: () => activePeaks,
  }
}
