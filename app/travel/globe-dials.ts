import { clamp } from 'es-toolkit'
import {
  clampTheta,
  type GlobeView,
  TAU,
  viewLongitude,
} from './globe-projection'
import type { GlobeViewState } from './globe-view-state'

const ZOOM_STEP = 1.12
const DIAL_IDLE_GRACE_MS = 220

export const createCompassPainter = (state: GlobeViewState) => {
  const {
    compassHeadingRef,
    compassLatitudeRef,
    compassReadoutRef,
    compassRef,
    orbitControlRef,
    orbitKnobRef,
    orbitKnobStateRef,
    pitchControlRef,
    pitchKnobRef,
  } = state

  return (view: GlobeView) => {
    const card = compassRef.current
    if (!card) return

    const longitude = viewLongitude(view.phi)
    const latitude = clamp((view.theta * 180) / Math.PI, -90, 90)
    card.style.transform = `rotate(${(-longitude).toFixed(2)}deg)`

    const orbitKnob = orbitKnobStateRef.current
    const longitudeDelta = ((longitude - orbitKnob.raw + 540) % 360) - 180
    orbitKnob.angle -= longitudeDelta
    orbitKnob.raw = longitude
    orbitKnobRef.current?.style.setProperty(
      '--range-angle',
      `${orbitKnob.angle.toFixed(2)}deg`,
    )
    pitchKnobRef.current?.style.setProperty(
      '--range-angle',
      `${(-latitude).toFixed(2)}deg`,
    )

    const heading = Math.round(longitude) % 360
    const roundedLatitude = Math.round(latitude)
    const previous = compassReadoutRef.current
    if (heading !== previous.heading) {
      compassHeadingRef.current?.replaceChildren(
        `${String(heading).padStart(3, '0')}°`,
      )
      orbitControlRef.current?.setAttribute('aria-valuenow', String(heading))
      orbitControlRef.current?.setAttribute(
        'aria-valuetext',
        `${String(heading).padStart(3, '0')} degrees heading`,
      )
      previous.heading = heading
    }
    if (roundedLatitude !== previous.latitude) {
      const sign = roundedLatitude >= 0 ? '+' : '−'
      compassLatitudeRef.current?.replaceChildren(
        `${sign}${String(Math.abs(roundedLatitude)).padStart(2, '0')}°`,
      )
      pitchControlRef.current?.setAttribute(
        'aria-valuenow',
        String(roundedLatitude),
      )
      pitchControlRef.current?.setAttribute(
        'aria-valuetext',
        roundedLatitude === 0
          ? '0 degrees, equator'
          : `${Math.abs(roundedLatitude)} degrees ${
              roundedLatitude > 0 ? 'north' : 'south'
            }`,
      )
      previous.latitude = roundedLatitude
    }
  }
}

export const createDialControls = (state: GlobeViewState) => {
  const {
    applyZoom,
    dialControlCountRef,
    dialIdleUntilRef,
    focusTimeRef,
    phiRef,
    pointersRef,
    thetaRef,
    velocityRef,
    zoomTargetRef,
  } = state

  const nudgeAxis = (value: number, apply: (value: number) => void) => {
    if (!Number.isFinite(value) || pointersRef.current.size > 0) return
    focusTimeRef.current = 0
    velocityRef.current = { phi: 0, theta: 0 }
    apply(value)
    dialIdleUntilRef.current = performance.now() + DIAL_IDLE_GRACE_MS
  }

  const orbitBy = (knobDelta: number) => {
    if (Math.abs(knobDelta) < 0.001) return
    nudgeAxis(knobDelta, (delta) => {
      phiRef.current =
        (((phiRef.current + (delta * Math.PI) / 180) % TAU) + TAU) % TAU
    })
  }

  const orbitTo = (heading: number) =>
    nudgeAxis(heading, (value) => {
      const normalized = ((value % 360) + 360) % 360
      phiRef.current = (((270 - normalized) * Math.PI) / 180 + TAU) % TAU
    })

  const pitchBy = (knobDelta: number) => {
    if (Math.abs(knobDelta) < 0.001) return
    nudgeAxis(knobDelta, (delta) => {
      thetaRef.current = clampTheta(thetaRef.current - (delta * Math.PI) / 180)
    })
  }

  const pitchTo = (latitude: number) =>
    nudgeAxis(latitude, (value) => {
      thetaRef.current = clampTheta((value * Math.PI) / 180)
    })

  const setDialControlActive = (active: boolean) => {
    dialControlCountRef.current = Math.max(
      0,
      dialControlCountRef.current + (active ? 1 : -1),
    )
    velocityRef.current = { phi: 0, theta: 0 }
    if (dialControlCountRef.current > 0) {
      focusTimeRef.current = 0
      dialIdleUntilRef.current = Number.POSITIVE_INFINITY
      return
    }
    dialIdleUntilRef.current = performance.now() + DIAL_IDLE_GRACE_MS
  }

  const zoomIn = () => applyZoom(zoomTargetRef.current * ZOOM_STEP)
  const zoomOut = () => applyZoom(zoomTargetRef.current / ZOOM_STEP)

  return {
    orbitBy,
    orbitTo,
    pitchBy,
    pitchTo,
    setDialControlActive,
    zoomIn,
    zoomOut,
  }
}
