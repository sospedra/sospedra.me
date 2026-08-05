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

  const updateLabels = (frame: StageFrame) => {
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
    const cityRange = clamp(frame.camY * 26, 70000, 2000000)
    const rangeSq = cityRange * cityRange
    const culled = (marker: StageMarker) => {
      const dx = marker.x - frame.camX
      const dz = marker.z - frame.camZ
      return dx * dx + dz * dz > rangeSq
    }
    cityData.forEach((city, i) => {
      if (culled(city)) {
        hide(refs.cities[i])
        return
      }
      place(refs.cities[i], city.x, (city.h + 16) * frame.ex, city.z, 1.05)
    })
    destData.forEach((dest, i) => {
      if (i === frame.currentDestIndex || culled(dest)) {
        hide(refs.dests[i])
        return
      }
      place(refs.dests[i], dest.x, (dest.h + 20) * frame.ex, dest.z, 1.05)
    })
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
    if (root && root.dataset.show !== (shown ? '1' : '0')) {
      root.dataset.show = shown ? '1' : '0'
    }
    if (shown && refs.needle.current) {
      refs.needle.current.style.transform = `rotate(${-headingDegrees(camera)}deg)`
    }
  }

  return { updateLabels, updateHud, updateCompass }
}
