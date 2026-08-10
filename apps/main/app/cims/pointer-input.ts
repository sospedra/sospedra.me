import { clamp } from 'es-toolkit'
import type { Vector3 } from 'three'
import { PITCH_MAX, PITCH_MIN, RANGE_MAX, RANGE_MIN } from './flight.ts'
import type { CimsRig } from './rig.ts'

export type PointerHost = {
  canvas: HTMLCanvasElement
  rig: CimsRig
  focusT: Vector3
  airborne: () => boolean
  clampFocus: () => void
  groundPointAt: (cx: number, cy: number) => { x: number; z: number } | null
  focusAt: (cx: number, cy: number) => void
  next: () => void
  prev: () => void
  resumeAudio: () => void
  onResize: () => void
}

const DRAG_YAW = 0.0028
const DRAG_TILT = 0.002
const KEY_HEADING = 0.12
const KEY_PITCH = 0.08
const KEY_ZOOM = 1.15

const interactiveTarget = (target: EventTarget | null): boolean =>
  target instanceof Element &&
  target.closest('button, input, a, select, textarea, [contenteditable]') !==
    null

const gestureForButton = (
  event: PointerEvent,
  spaceHeld: boolean,
): 'look' | 'pan' | 'orbit' | null => {
  const primaryWithModifier =
    event.button === 0 && (event.ctrlKey || event.metaKey)
  if (event.button === 1 || primaryWithModifier) return 'look'
  if (event.button === 2 || (event.button === 0 && spaceHeld)) return 'pan'
  if (event.button === 0) return 'orbit'
  return null
}

export const attachInput = (host: PointerHost): (() => void) => {
  const { canvas, rig, focusT } = host
  let lastX = 0
  let lastY = 0
  let spaceHeld = false
  let spaceUsed = false
  const pointers = new Map<number, [number, number]>()
  let pinchD0 = 0
  let pinchR0 = 2600
  let pinchCX = 0
  let pinchCY = 0
  let tapMs = 0
  let tapX = 0
  let tapY = 0
  let downX = 0
  let downY = 0
  let downMs = 0

  const markInput = () => {
    rig.showT = -1
    rig.autoT = 0
    rig.idleT = 0
    rig.lastInputMs = performance.now()
  }

  const panFocus = (dx: number, dy: number) => {
    const k = (rig.range * 1.4) / window.innerHeight
    const fwdX = -Math.sin(rig.heading)
    const fwdZ = -Math.cos(rig.heading)
    const rX = Math.cos(rig.heading)
    const rZ = -Math.sin(rig.heading)
    focusT.x -= (dx * rX - dy * fwdX) * k
    focusT.z -= (dx * rZ - dy * fwdZ) * k
    host.clampFocus()
  }

  const onContextMenu = (e: Event) => e.preventDefault()

  const beginPinch = () => {
    const [first, second] = [...pointers.values()]
    pinchD0 = Math.max(
      20,
      Math.hypot(first[0] - second[0], first[1] - second[1]),
    )
    pinchR0 = rig.rangeT
    pinchCX = (first[0] + second[0]) / 2
    pinchCY = (first[1] + second[1]) / 2
    rig.gesture = 'pinch'
    rig.showT = -1
  }

  const applyPressGesture = (e: PointerEvent) => {
    if (pointers.size === 2) {
      beginPinch()
      return
    }
    const gesture = gestureForButton(e, spaceHeld)
    if (!gesture) return
    rig.gesture = gesture
    if (gesture === 'pan') spaceUsed = true
  }

  const onPointerDown = (e: PointerEvent) => {
    lastX = e.clientX
    lastY = e.clientY
    downX = e.clientX
    downY = e.clientY
    downMs = performance.now()
    pointers.set(e.pointerId, [e.clientX, e.clientY])
    applyPressGesture(e)
    if (rig.gesture) canvas.setPointerCapture(e.pointerId)
    e.preventDefault()
  }

  const onPinchMove = () => {
    if (host.airborne() || pointers.size < 2) return
    const it = [...pointers.values()]
    const d1 = Math.max(
      20,
      Math.hypot(it[0][0] - it[1][0], it[0][1] - it[1][1]),
    )
    rig.rangeT = clamp((pinchR0 * pinchD0) / d1, RANGE_MIN, RANGE_MAX)
    const cx = (it[0][0] + it[1][0]) / 2
    const cy = (it[0][1] + it[1][1]) / 2
    panFocus(cx - pinchCX, cy - pinchCY)
    pinchCX = cx
    pinchCY = cy
    rig.autoT = 0
    rig.idleT = 0
    rig.lastInputMs = performance.now()
  }

  const applyDragGesture = (dx: number, dy: number) => {
    if (rig.gesture === 'orbit') {
      rig.headingT -= dx * 0.005
      rig.pitchT = clamp(rig.pitchT + dy * 0.004, PITCH_MIN, PITCH_MAX)
      rig.lookYawT = 0
      rig.lookTiltT = 0
      return
    }
    if (rig.gesture === 'pan') {
      panFocus(dx, dy)
      rig.lookYawT = 0
      rig.lookTiltT = 0
      return
    }
    rig.lookYawT = clamp(rig.lookYawT - dx * DRAG_YAW, -2.6, 2.6)
    rig.lookTiltT = clamp(rig.lookTiltT - dy * DRAG_TILT, -1, 1)
  }

  const onPointerMove = (e: PointerEvent) => {
    if (!rig.gesture) return
    if (pointers.has(e.pointerId)) {
      pointers.set(e.pointerId, [e.clientX, e.clientY])
    }
    if (rig.gesture === 'pinch') {
      onPinchMove()
      return
    }
    const dx = e.clientX - lastX
    const dy = e.clientY - lastY
    lastX = e.clientX
    lastY = e.clientY
    if (host.airborne()) {
      rig.lookYawT -= dx * DRAG_YAW
      rig.lookTiltT = clamp(rig.lookTiltT - dy * DRAG_TILT, -1, 1)
      return
    }
    applyDragGesture(dx, dy)
    markInput()
  }

  const onPointerEnd = (e: PointerEvent) => {
    pointers.delete(e.pointerId)
    if (rig.gesture === 'pinch') {
      rig.gesture = null
      return
    }
    const now = performance.now()
    const isTap =
      e.pointerType === 'touch' &&
      rig.gesture !== null &&
      Math.hypot(e.clientX - downX, e.clientY - downY) < 12 &&
      now - downMs < 300
    if (isTap) {
      const isDoubleTap =
        now - tapMs < 350 && Math.hypot(e.clientX - tapX, e.clientY - tapY) < 44
      if (isDoubleTap) {
        host.focusAt(e.clientX, e.clientY)
        tapMs = 0
      } else {
        tapMs = now
        tapX = e.clientX
        tapY = e.clientY
      }
    }
    rig.gesture = null
  }

  const onDoubleClick = (e: MouseEvent) => host.focusAt(e.clientX, e.clientY)

  // anchor on real terrain, cached per zoom burst
  const refreshZoomAnchor = (e: WheelEvent, now: number) => {
    if (now - rig.lastZoomMs <= 300) return
    const ground = host.groundPointAt(e.clientX, e.clientY)
    rig.zoomAnchorOk = ground !== null
    if (!ground) return
    rig.zoomAnchorX = ground.x
    rig.zoomAnchorZ = ground.z
  }

  const pullFocusToAnchor = (factor: number) => {
    if (!rig.zoomAnchorOk) return
    const pull = 1 - factor
    focusT.x += (rig.zoomAnchorX - focusT.x) * pull
    focusT.z += (rig.zoomAnchorZ - focusT.z) * pull
    host.clampFocus()
  }

  const onWheel = (e: WheelEvent) => {
    if (host.airborne()) return
    e.preventDefault()
    const now = performance.now()
    const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY
    const factor = Math.exp(delta * (e.ctrlKey ? 0.01 : 0.0016))
    rig.rangeT = clamp(rig.rangeT * factor, RANGE_MIN, RANGE_MAX)
    if (factor < 1) {
      refreshZoomAnchor(e, now)
      pullFocusToAnchor(factor)
    }
    rig.lastZoomMs = now
    markInput()
  }

  const orbitArrowKey = (code: string): boolean => {
    if (code === 'ArrowRight') {
      rig.headingT -= KEY_HEADING
      return true
    }
    if (code === 'ArrowLeft') {
      rig.headingT += KEY_HEADING
      return true
    }
    if (code === 'ArrowUp') {
      rig.pitchT = clamp(rig.pitchT + KEY_PITCH, PITCH_MIN, PITCH_MAX)
      return true
    }
    if (code === 'ArrowDown') {
      rig.pitchT = clamp(rig.pitchT - KEY_PITCH, PITCH_MIN, PITCH_MAX)
      return true
    }
    return false
  }

  const orbitZoomKey = (key: string): boolean => {
    if (key === '+' || key === '=') {
      rig.rangeT = clamp(rig.rangeT / KEY_ZOOM, RANGE_MIN, RANGE_MAX)
      return true
    }
    if (key === '-') {
      rig.rangeT = clamp(rig.rangeT * KEY_ZOOM, RANGE_MIN, RANGE_MAX)
      return true
    }
    return false
  }

  const orbitKey = (e: KeyboardEvent): boolean => {
    if (host.airborne()) return false
    return orbitArrowKey(e.code) || orbitZoomKey(e.key)
  }

  const pressSpace = (e: KeyboardEvent) => {
    if (!spaceHeld) {
      spaceHeld = true
      spaceUsed = false
    }
    e.preventDefault()
  }

  const stepKeys: Record<string, () => void> = {
    ArrowRight: host.next,
    ArrowLeft: host.prev,
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (interactiveTarget(e.target)) return
    if (document.activeElement === canvas && orbitKey(e)) {
      e.preventDefault()
      markInput()
      return
    }
    if (e.code === 'Space') pressSpace(e)
    stepKeys[e.code]?.()
  }

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code !== 'Space') return
    if (!spaceUsed) rig.holdOn = !rig.holdOn
    spaceHeld = false
  }

  const onResize = () => host.onResize()
  const onAnyInput = () => host.resumeAudio()

  canvas.addEventListener('contextmenu', onContextMenu)
  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', onPointerEnd)
  canvas.addEventListener('pointercancel', onPointerEnd)
  canvas.addEventListener('dblclick', onDoubleClick)
  canvas.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('resize', onResize)
  window.addEventListener('pointerdown', onAnyInput)
  window.addEventListener('keydown', onAnyInput)

  return () => {
    canvas.removeEventListener('contextmenu', onContextMenu)
    canvas.removeEventListener('pointerdown', onPointerDown)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerup', onPointerEnd)
    canvas.removeEventListener('pointercancel', onPointerEnd)
    canvas.removeEventListener('dblclick', onDoubleClick)
    canvas.removeEventListener('wheel', onWheel)
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('resize', onResize)
    window.removeEventListener('pointerdown', onAnyInput)
    window.removeEventListener('keydown', onAnyInput)
  }
}
