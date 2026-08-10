import { clamp } from 'es-toolkit'
import { Clock, Vector3 } from 'three'
import type { CimsStore } from './cims-store.ts'
import { dampFactor, smoother, wrapPI } from './easing.ts'
import { createEdgePass } from './edge-pass.ts'
import {
  AUTO_ADVANCE_SECONDS,
  CLEARANCE_FLY,
  CLEARANCE_ORBIT,
  DAMP_FAST,
  DAMP_SLOW,
  flightPoint,
  orbitCameraPosition,
  showcaseTargets,
} from './flight.ts'
import { markerGlowTexture } from './glow-texture.ts'
import { marchGround } from './ground-hit.ts'
import { CITY_GREEN, TOUR_AMBER } from './palette.ts'
import { attachInput } from './pointer-input.ts'
import { createRig } from './rig.ts'
import { createCimsScene, SURFACE_MODES } from './scene.ts'
import { createSfx } from './sfx.ts'
import { createSky, type SkySnapshot } from './sky.ts'
import { createSlotManager } from './slot-manager.ts'
import {
  createStageProjector,
  type StageFrame,
  type StageRefs,
} from './stage-projection.ts'
import type { TerrainData } from './terrain-schema.ts'
import { createTourController } from './tour-controller.ts'
import { createTrail } from './trail.ts'

const HUD_INTERVAL_MS = 120
const COMPASS_LINGER_MS = 900

export type CimsEngineOptions = {
  canvas: HTMLCanvasElement
  data: TerrainData
  store: CimsStore
  quiet: () => boolean
  refs: StageRefs
}

export type CimsEngine = ReturnType<typeof createCimsEngine>

export const createCimsEngine = (options: CimsEngineOptions) => {
  const { canvas, data, store, quiet, refs } = options
  const exaggeration = () => store.get().exaggeration
  const surfaceMode = () => store.get().surfaceMode

  const stage = createCimsScene(canvas, data, exaggeration())
  const { renderer, scene, camera, world, fog } = stage
  const edge = createEdgePass(renderer)
  const slotManager = createSlotManager({
    world,
    data,
    heightAtBase: stage.heightAtBase,
    createTerrainMaterial: stage.createTerrainMaterial,
  })
  const { slots } = slotManager
  const glowTexture = markerGlowTexture()
  const sky = createSky(scene, new Date())
  const trail = createTrail(world, glowTexture)
  const sfx = createSfx()

  const cityData = data.cities.map((city) => ({
    x: city.x,
    z: city.z,
    h: stage.heightAtBase(city.x, city.z),
  }))
  const patchCenter = (k: number) => {
    const mountain = data.mountains[k]
    const cx = (data.grid - 1) / 2
    const x = mountain.ox + (mountain.peaks[0].i - cx) * mountain.cellX
    const z = mountain.oz + (mountain.peaks[0].j - cx) * mountain.cellZ
    return { x, z, h: stage.heightAtBase(x, z) }
  }
  const destData = data.mountains.map((_, k) => patchCenter(k))
  stage.addMarkerPoints(cityData, glowTexture, CITY_GREEN, 8, 16)
  stage.addMarkerPoints(destData, glowTexture, TOUR_AMBER, 7, 20)

  const sampleAny = (x: number, z: number): number =>
    Math.max(stage.heightAtBase(x, z), slotManager.sampleActive(x, z))
  const heightAtEx = (x: number, z: number): number =>
    sampleAny(x, z) * exaggeration()

  const rig = createRig()
  const focus = new Vector3()
  const focusT = new Vector3()
  const worldHalfX = ((data.base.nx - 1) / 2) * data.base.cellX
  const worldHalfZ = ((data.base.nz - 1) / 2) * data.base.cellZ
  const clampFocus = () => {
    focusT.x = clamp(focusT.x, -worldHalfX, worldHalfX)
    focusT.z = clamp(focusT.z, -worldHalfZ, worldHalfZ)
  }

  const camPos = new Vector3()
  const camTgt = new Vector3()
  const desired = new Vector3()
  const headWorld = new Vector3()
  const rayDir = new Vector3()
  const prevCam = new Vector3()

  const tour = createTourController({
    mountainCount: data.mountains.length,
    cityData,
    store,
    rig,
    slotManager,
    trail,
    sfx,
    focus,
    focusT,
    camPos,
    now: () => performance.now(),
    quiet,
    exaggeration,
    surfaceMode,
    sampleAny,
    heightAtEx,
  })

  const flyStep = (dt: number, ms: number) => {
    const plan = tour.plan()
    if (!plan) return
    const t = Math.min(1, (ms - plan.startMs) / plan.durationMs)
    const eased = smoother(t)
    const point = flightPoint(plan.from, plan.end, plan.arcHeight, eased)
    camPos.set(
      point.x,
      Math.max(point.y, heightAtEx(point.x, point.z) + CLEARANCE_FLY),
      point.z,
    )
    desired.set(
      plan.target.x,
      plan.target.y * exaggeration() + 40,
      plan.target.z,
    )
    if (plan.showTrail) {
      trail.update(smoother(Math.min(1, t + 0.12)), ms)
      headWorld.set(trail.head.x, trail.head.y * exaggeration(), trail.head.z)
      desired.lerp(headWorld, 0.3)
    }
    rig.lookYawT *= Math.exp(-dt * 2)
    rig.lookTiltT *= Math.exp(-dt * 2)
    const damp = dampFactor(dt, DAMP_SLOW)
    rig.lookYaw += (rig.lookYawT - rig.lookYaw) * damp
    rig.lookTilt += (rig.lookTiltT - rig.lookTilt) * damp
    if (t >= 1) tour.arrive()
  }

  const advanceShowcase = (dt: number) => {
    rig.showT += dt
    const targets = showcaseTargets(rig.showT, rig.showH0, rig.showR0)
    rig.headingT = targets.headingT
    rig.rangeT = targets.rangeT
    if (targets.done) rig.showT = -1
  }

  const autoOrbitStep = (dt: number) => {
    if (rig.holdOn || rig.gesture || !store.get().autoOn) return
    if (rig.showT >= 0) advanceShowcase(dt)
    rig.autoT += dt
    if (rig.autoT > AUTO_ADVANCE_SECONDS) tour.advance(1)
  }

  const orbitStep = (dt: number, ms: number) => {
    autoOrbitStep(dt)
    rig.idleT += dt
    const fastInput = rig.gesture || ms - rig.lastInputMs < 250
    const damp = dampFactor(dt, fastInput ? DAMP_FAST : DAMP_SLOW)
    rig.heading += wrapPI(rig.headingT - rig.heading) * damp
    rig.pitch += (rig.pitchT - rig.pitch) * damp
    rig.range += (rig.rangeT - rig.range) * damp
    rig.lookYaw += (rig.lookYawT - rig.lookYaw) * damp
    rig.lookTilt += (rig.lookTiltT - rig.lookTilt) * damp
    focus.x += (focusT.x - focus.x) * damp
    focus.z += (focusT.z - focus.z) * damp
    focus.y += (rig.focusYT - focus.y) * damp
    const pos = orbitCameraPosition(rig, focus, exaggeration())
    camPos.set(
      pos.x,
      Math.max(pos.y, heightAtEx(pos.x, pos.z) + CLEARANCE_ORBIT),
      pos.z,
    )
    desired.set(focus.x, focus.y * exaggeration() + 30, focus.z)
  }

  const applyAtmosphere = () => {
    const far = clamp(camPos.y * 16, 9000, 900000)
    fog.far = far
    fog.near = far * 0.3
    const clearance = camPos.y - heightAtEx(camPos.x, camPos.z)
    camera.near = clamp(clearance * 0.25, 3, 20000)
    camera.updateProjectionMatrix()
  }

  const applyCamera = () => {
    camera.position.copy(camPos)
    camera.lookAt(camTgt)
    camera.rotation.y += rig.lookYaw
    camera.rotation.x = Math.max(
      -1.5,
      Math.min(0.9, camera.rotation.x + rig.lookTilt),
    )
    camera.rotation.z = 0
  }

  const applyMaterials = (ms: number, sun: SkySnapshot) => {
    const still = quiet()
    stage.riverMaterial.uniforms.uTime.value = still ? 0 : ms * 0.001
    const sweepH = still ? -10000 : ((ms * 0.00003) % 1) * 3600
    const ex = exaggeration()
    for (const material of stage.terrainMaterials) {
      material.uniforms.uSweepH.value = sweepH
      material.uniforms.uEx.value = ex
      material.uniforms.uSunDir.value.copy(sun.sunDir)
      material.uniforms.uSunI.value = sun.sunIntensity
      material.uniforms.uSunCol.value.setRGB(
        1,
        0.72 + 0.26 * sun.sunWarmth,
        0.5 + 0.42 * sun.sunWarmth,
      )
    }
  }

  const projector = createStageProjector({ camera, refs, cityData, destData })
  const stageFrame: StageFrame = {
    ex: exaggeration(),
    camX: 0,
    camY: 0,
    camZ: 0,
    activePeaks: [],
    currentDestIndex: 0,
    sunWorld: new Vector3(),
    moonWorld: new Vector3(),
  }

  const groundPointAt = (cx: number, cy: number) => {
    rayDir
      .set(
        (cx / window.innerWidth) * 2 - 1,
        -(cy / window.innerHeight) * 2 + 1,
        0.5,
      )
      .unproject(camera)
      .sub(camera.position)
      .normalize()
    return marchGround(camera.position, rayDir, heightAtEx)
  }

  const focusAt = (cx: number, cy: number) => {
    if (tour.airborne()) return
    const ground = groundPointAt(cx, cy)
    if (!ground) return
    focusT.set(ground.x, 0, ground.z)
    clampFocus()
    rig.focusYT = sampleAny(ground.x, ground.z)
    rig.lookYawT = 0
    rig.lookTiltT = 0
    rig.showT = -1
    rig.autoT = 0
    rig.idleT = 0
  }

  let hudNext = 0
  let lastMoveMs = 0

  const cameraMoving = (): boolean =>
    tour.airborne() ||
    rig.gesture !== null ||
    rig.showT >= 0 ||
    Math.abs(wrapPI(rig.headingT - rig.heading)) > 0.002 ||
    Math.abs(rig.pitchT - rig.pitch) > 0.002 ||
    Math.abs(rig.rangeT - rig.range) / rig.range > 0.002

  const updateOverlay = (dt: number, ms: number, sun: SkySnapshot) => {
    stageFrame.ex = exaggeration()
    stageFrame.camX = camPos.x
    stageFrame.camY = camPos.y
    stageFrame.camZ = camPos.z
    stageFrame.activePeaks = tour.activePeaks()
    stageFrame.currentDestIndex = tour.destIndex()
    stageFrame.sunWorld.copy(sun.sunWorld)
    stageFrame.moonWorld.copy(sun.moonWorld)
    projector.updateLabels(stageFrame)
    if (ms > hudNext) {
      hudNext = ms + HUD_INTERVAL_MS
      const speed = dt > 0 ? prevCam.distanceTo(camPos) / dt : 0
      projector.updateHud(camPos.y / exaggeration(), speed)
    }
    if (cameraMoving()) lastMoveMs = ms
    projector.updateCompass(ms - lastMoveMs < COMPASS_LINGER_MS)
  }

  const clock = new Clock()
  let raf = 0
  const frame = () => {
    raf = requestAnimationFrame(frame)
    const dt = Math.min(clock.getDelta(), 0.05)
    const ms = performance.now()
    prevCam.copy(camPos)
    if (tour.airborne()) flyStep(dt, ms)
    else orbitStep(dt, ms)
    camTgt.lerp(desired, Math.min(1, dt * (tour.airborne() ? 3.2 : 7)))
    applyAtmosphere()
    applyCamera()
    const sun = sky.update(new Date())
    applyMaterials(ms, sun)
    updateOverlay(dt, ms, sun)
    edge.renderDepth(scene, camera)
    renderer.render(scene, camera)
    edge.composite(camera, fog.near, fog.far)
  }

  const bootCamera = () => {
    const plan = tour.boot()
    focus.copy(slots[0].center)
    focusT.copy(focus)
    rig.focusYT = focus.y
    camPos.set(plan.from.x, plan.from.y, plan.from.z)
    camTgt.set(
      plan.target.x,
      plan.target.y * exaggeration() + 40,
      plan.target.z,
    )
  }

  const detachInput = attachInput({
    canvas,
    rig,
    focusT,
    airborne: () => tour.airborne(),
    clampFocus,
    groundPointAt,
    focusAt,
    next: () => tour.advance(1),
    prev: () => tour.advance(-1),
    resumeAudio: sfx.resume,
    onResize: () => {
      stage.resize()
      edge.resize()
    },
  })

  bootCamera()
  store.set({ ...store.get(), ready: true, autoOn: !quiet() })
  frame()

  const dispose = () => {
    cancelAnimationFrame(raf)
    detachInput()
    sfx.dispose()
    trail.dispose()
    sky.dispose()
    slotManager.dispose()
    edge.dispose()
    glowTexture.dispose()
    stage.dispose()
  }

  return {
    flyToMountain: tour.flyToMountain,
    flyToCity: tour.flyToCity,
    next: () => tour.advance(1),
    prev: () => tour.advance(-1),
    toggleAuto: () => {
      rig.autoT = 0
      store.set({ ...store.get(), autoOn: !store.get().autoOn })
    },
    cycleSurface: () => {
      const at = SURFACE_MODES.indexOf(surfaceMode())
      const nextMode = SURFACE_MODES[(at + 1) % SURFACE_MODES.length]
      stage.showSurface(nextMode)
      for (const slot of slots) slotManager.applyVisibility(slot, nextMode)
      store.set({ ...store.get(), surfaceMode: nextMode })
    },
    setExaggeration: (value: number) => {
      world.scale.y = value
      store.set({ ...store.get(), exaggeration: value })
    },
    faceNorth: () => {
      rig.headingT = rig.heading - wrapPI(rig.heading)
      rig.lookYawT = 0
      rig.showT = -1
      rig.autoT = 0
      rig.idleT = 0
    },
    playClick: sfx.click,
    dispose,
  }
}
