import type { Vector3 } from 'three'
import type { CimsSnapshot, CimsStore } from './cims-store.ts'
import {
  APPROACH_CLEARANCE,
  arrivePose,
  type FlightPlan,
  type HeightSampler,
  planLaunch,
  wrapStep,
} from './flight.ts'
import type { CimsRig } from './rig.ts'
import type { SurfaceMode } from './scene.ts'
import type { CimsSfx } from './sfx.ts'
import type { SlotManager, SlotPeak } from './slot-manager.ts'
import type { StageMarker } from './stage-projection.ts'
import {
  createTourState,
  destinationIndex,
  isAirborne,
  isEnRoute,
  otherSlot,
  type TourTarget,
  transition,
} from './tour-machine.ts'
import type { FlightTrail } from './trail.ts'

const CITY_APPROACH_RANGE = 2600
const CITY_ALTITUDE_OFFSET = 300
const BOOT_DROP_HEIGHT = 26000
const BOOT_APPROACH_SETBACK = 42000
const BOOT_DURATION_MS = 2600

export type TourControllerOptions = {
  mountainCount: number
  cityData: readonly StageMarker[]
  store: CimsStore
  rig: CimsRig
  slotManager: SlotManager
  trail: FlightTrail
  sfx: CimsSfx
  focus: Vector3
  focusT: Vector3
  camPos: Vector3
  now: () => number
  quiet: () => boolean
  exaggeration: () => number
  surfaceMode: () => SurfaceMode
  sampleAny: HeightSampler
  heightAtEx: HeightSampler
}

export type TourController = ReturnType<typeof createTourController>

type FlightLeg = {
  origin: { x: number; z: number }
  targetX: number
  targetZ: number
  targetH: number
  approachRange: number
  altitudeOffset: number
  startMs: number
}

export const createTourController = (options: TourControllerOptions) => {
  const { store, rig, trail, sfx, focus, focusT, camPos } = options
  const { slots } = options.slotManager
  let state = createTourState()
  let flightPlan: FlightPlan | null = null
  let activePeaks: readonly SlotPeak[] = []

  const publishTour = (distanceKm: number) => {
    const snapshot = store.get()
    const peakLabels: CimsSnapshot['peakLabels'] =
      state.target.kind === 'mountain'
        ? activePeaks
            .slice(0, 2)
            .map((peak) => ({ name: peak.name, elev: peak.elev }))
        : []
    const seqIndex =
      state.target.kind === 'mountain' ? state.target.index : snapshot.seqIndex
    store.set({
      ...snapshot,
      target: state.target,
      seqIndex,
      enRoute: isEnRoute(state),
      distanceKm,
      peakLabels,
    })
  }

  const trailOrigin = (): { x: number; z: number } =>
    state.phase !== 'orbiting' && flightPlan?.showTrail
      ? { x: trail.head.x, z: trail.head.z }
      : { x: focus.x, z: focus.z }

  const beginFlight = (leg: FlightLeg): number => {
    const launch = planLaunch({
      cam: camPos,
      targetX: leg.targetX,
      targetZ: leg.targetZ,
      targetH: leg.targetH,
      approachRange: leg.approachRange,
      altitudeOffset: leg.altitudeOffset,
      ex: options.exaggeration(),
      reduced: options.quiet(),
      heightAtEx: options.heightAtEx,
    })
    flightPlan = {
      from: { x: camPos.x, y: camPos.y, z: camPos.z },
      end: launch.end,
      target: { x: leg.targetX, y: leg.targetH, z: leg.targetZ },
      startMs: leg.startMs,
      durationMs: launch.durationMs,
      arcHeight: launch.arcHeight,
      showTrail: true,
    }
    trail.build(
      leg.origin,
      { x: leg.targetX, z: leg.targetZ },
      options.sampleAny,
    )
    sfx.travel()
    sfx.flightStart()
    return launch.dist
  }

  const flyToMountain = (index: number) => {
    const mountainIndex = wrapStep(index, options.mountainCount)
    const startMs = options.now()
    const target: TourTarget = { kind: 'mountain', index: mountainIndex }
    const next = transition(state, { type: 'launch', target, atMs: startMs })
    if (next === state || next.phase !== 'flying') return
    const origin = trailOrigin()
    const hostSlot = slots[next.pendingSlot]
    if (state.assignments[next.pendingSlot] === mountainIndex) {
      hostSlot.active = true
      options.slotManager.applyVisibility(hostSlot, options.surfaceMode())
    } else {
      options.slotManager.buildSlot(
        hostSlot,
        mountainIndex,
        options.surfaceMode(),
      )
    }
    state = next
    activePeaks = hostSlot.peaks
    const distanceMeters = beginFlight({
      origin,
      targetX: hostSlot.center.x,
      targetZ: hostSlot.center.z,
      targetH: hostSlot.center.y,
      approachRange: hostSlot.approachRange,
      altitudeOffset: hostSlot.altitudeOffset,
      startMs,
    })
    publishTour(Math.round(distanceMeters / 1000))
  }

  const flyToCity = (index: number) => {
    const startMs = options.now()
    const target: TourTarget = { kind: 'city', index }
    const next = transition(state, { type: 'launch', target, atMs: startMs })
    if (next === state || next.phase !== 'flying') return
    const origin = trailOrigin()
    state = next
    activePeaks = []
    const city = options.cityData[index]
    const distanceMeters = beginFlight({
      origin,
      targetX: city.x,
      targetZ: city.z,
      targetH: city.h,
      approachRange: CITY_APPROACH_RANGE,
      altitudeOffset: CITY_ALTITUDE_OFFSET,
      startMs,
    })
    publishTour(Math.round(distanceMeters / 1000))
  }

  const arrive = () => {
    const next = transition(state, { type: 'arrive' })
    if (next === state) return
    state = next
    sfx.flightStop()
    sfx.arrive()
    trail.hide()
    flightPlan = null
    if (state.target.kind === 'city') {
      const city = options.cityData[state.target.index]
      focus.set(city.x, city.h, city.z)
    } else {
      const retired = slots[otherSlot(state.slot)]
      retired.active = false
      options.slotManager.applyVisibility(retired, options.surfaceMode())
      focus.copy(slots[state.slot].center)
    }
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
    rig.showH0 = pose.heading
    rig.showR0 = pose.range
    rig.autoT = 0
    rig.idleT = 0
    publishTour(0)
  }

  const bootPlan = (): FlightPlan => {
    const first = slots[0]
    const approachX = first.center.x
    const approachZ = first.center.z + first.approachRange
    const approachY = Math.max(
      first.center.y * options.exaggeration() + first.altitudeOffset,
      options.heightAtEx(approachX, approachZ) + APPROACH_CLEARANCE,
    )
    return {
      from: {
        x: first.center.x,
        y: approachY + BOOT_DROP_HEIGHT,
        z: first.center.z + first.approachRange + BOOT_APPROACH_SETBACK,
      },
      end: { x: approachX, y: approachY, z: approachZ },
      target: { x: first.center.x, y: first.center.y, z: first.center.z },
      startMs: options.now(),
      durationMs: options.quiet() ? 1 : BOOT_DURATION_MS,
      arcHeight: 0,
      showTrail: false,
    }
  }

  const boot = (): FlightPlan => {
    options.slotManager.buildSlot(slots[0], 0, options.surfaceMode())
    activePeaks = slots[0].peaks
    flightPlan = bootPlan()
    publishTour(0)
    return flightPlan
  }

  return {
    boot,
    flyToMountain,
    flyToCity,
    arrive,
    advance: (step: number) => flyToMountain(destinationIndex(state) + step),
    destIndex: () => destinationIndex(state),
    airborne: () => isAirborne(state),
    plan: () => flightPlan,
    activePeaks: () => activePeaks,
  }
}
