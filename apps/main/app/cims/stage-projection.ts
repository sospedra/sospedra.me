import { clamp } from 'es-toolkit'
import { type PerspectiveCamera, Vector3 } from 'three'
import { padDigits } from './easing.ts'
import type { SlotPeak } from './slot-manager.ts'

export type ElementRef = { current: HTMLElement | SVGElement | null }

export type StageRefs = {
  peaks: readonly ElementRef[]
  cities: readonly ElementRef[]
  dests: readonly ElementRef[]
  sun: ElementRef
  moon: ElementRef
  alt: ElementRef
  spd: ElementRef
  hdg: ElementRef
  compass: ElementRef
  needle: ElementRef
}

export type StageMarker = { x: number; z: number; h: number }

const markerDistanceSq = (
  marker: StageMarker,
  camX: number,
  camZ: number,
): number => {
  const dx = marker.x - camX
  const dz = marker.z - camZ
  return dx * dx + dz * dz
}

const outOfRange = (
  marker: StageMarker,
  frame: { camX: number; camZ: number },
  rangeSq: number,
): boolean => markerDistanceSq(marker, frame.camX, frame.camZ) > rangeSq

export type StageFrame = {
  ex: number
  camX: number
  camY: number
  camZ: number
  activePeaks: readonly SlotPeak[]
  currentDestIndex: number
  sunWorld: Vector3
  moonWorld: Vector3
}

type ProjectorOptions = {
  camera: PerspectiveCamera
  refs: StageRefs
  cityData: readonly StageMarker[]
  destData: readonly StageMarker[]
}

export const headingDegrees = (camera: PerspectiveCamera): number =>
  ((((-camera.rotation.y * 180) / Math.PI) % 360) + 360) % 360

export const createStageProjector = (options: ProjectorOptions) => {
  const { camera, refs, cityData, destData } = options
  const scratch = new Vector3()

  const hide = (ref: ElementRef) => {
    if (ref.current) ref.current.style.display = 'none'
  }

  const place = (
    ref: ElementRef,
    x: number,
    yWorld: number,
    z: number,
    margin: number,
  ) => {
    const el = ref.current
    if (!el) return
    scratch.set(x, yWorld, z).project(camera)
    const visible =
      scratch.z < 1 &&
      Math.abs(scratch.x) < margin &&
      Math.abs(scratch.y) < margin
    if (!visible) {
      el.style.display = 'none'
      return
    }
    el.style.display = 'block'
    el.style.left = `${((scratch.x + 1) / 2) * window.innerWidth}px`
    el.style.top = `${((1 - scratch.y) / 2) * window.innerHeight}px`
  }

  const placePeaks = (frame: StageFrame) => {
    for (let i = 0; i < refs.peaks.length; i++) {
      const peak = frame.activePeaks[i]
      if (!peak) {
        hide(refs.peaks[i])
        continue
      }
      place(
        refs.peaks[i],
        peak.pos.x,
        peak.pos.y * frame.ex + 24,
        peak.pos.z,
        1.1,
      )
    }
  }

  const placeCities = (frame: StageFrame, rangeSq: number) => {
    for (const [index, city] of cityData.entries()) {
      if (outOfRange(city, frame, rangeSq)) {
        hide(refs.cities[index])
        continue
      }
      place(refs.cities[index], city.x, (city.h + 16) * frame.ex, city.z, 1.05)
    }
  }

  const placeDestinations = (frame: StageFrame, rangeSq: number) => {
    for (const [index, dest] of destData.entries()) {
      if (
        index === frame.currentDestIndex ||
        outOfRange(dest, frame, rangeSq)
      ) {
        hide(refs.dests[index])
        continue
      }
      place(refs.dests[index], dest.x, (dest.h + 20) * frame.ex, dest.z, 1.05)
    }
  }

  const updateLabels = (frame: StageFrame) => {
    placePeaks(frame)
    const cityRange = clamp(frame.camY * 26, 70000, 2000000)
    const rangeSq = cityRange * cityRange
    placeCities(frame, rangeSq)
    placeDestinations(frame, rangeSq)
    place(
      refs.sun,
      frame.sunWorld.x,
      frame.sunWorld.y + 9000,
      frame.sunWorld.z,
      1.05,
    )
    place(
      refs.moon,
      frame.moonWorld.x,
      frame.moonWorld.y + 9000,
      frame.moonWorld.z,
      1.05,
    )
  }

  const updateHud = (altitude: number, speed: number) => {
    if (refs.alt.current) refs.alt.current.textContent = padDigits(altitude, 5)
    if (refs.spd.current) refs.spd.current.textContent = padDigits(speed, 5)
    if (refs.hdg.current) {
      refs.hdg.current.textContent = padDigits(headingDegrees(camera), 3)
    }
  }

  const updateCompass = (shown: boolean) => {
    const root = refs.compass.current
    const shownFlag = shown ? '1' : '0'
    if (root && root.dataset.show !== shownFlag) root.dataset.show = shownFlag
    if (shown && refs.needle.current) {
      refs.needle.current.style.transform = `rotate(${-headingDegrees(camera)}deg)`
    }
  }

  return { updateLabels, updateHud, updateCompass }
}
