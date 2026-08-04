'use client'

import { useReducedMotion } from '@react-spring/web'
import type React from 'react'
import { useEffect, useState } from 'react'
import { cssVars } from 'services/css-vars'
import { useTheme } from 'services/theme'
import { fetchVisitorLocation } from 'services/visitor-location'
import { type MoonPhase, moonPhase, moonTilt } from './lunar-phase'
import css from './moon-sprite.module.css'
import { useMoonScrub } from './use-moon-scrub'

// A real near-quarter terminator is almost straight; the sub-linear exponent
// exaggerates the ellipse so those phases read as moons, not ruler cuts.
const TERMINATOR_CURVE = 0.5

// Shadow overscans the dark side to the corners (the silhouette mask clips it)
// and closes on the terminator half-ellipse: rx = |2k − 1| · r, k = illumination.
const shadowPath = (phase: MoonPhase): string => {
  const rx = (
    Math.abs(2 * phase.illumination - 1) ** TERMINATOR_CURVE *
    50
  ).toFixed(2)
  const darkSide = phase.waxing ? 'L 0 0 L 0 100' : 'L 100 0 L 100 100'
  const crescent = phase.illumination < 0.5
  const terminatorSweep = phase.waxing === crescent ? 0 : 1
  return `M 50 0 ${darkSide} L 50 100 A ${rx} 50 0 0 ${terminatorSweep} 50 0 Z`
}

const SpriteMoon: React.FunctionComponent = () => {
  const [mountedAt, setMountedAt] = useState<number | null>(null)
  const [tilt, setTilt] = useState(0)
  const { fxMode } = useTheme()
  const prefersReducedMotion = useReducedMotion()
  const motionAllowed = fxMode === 'full' && !prefersReducedMotion
  const scrubber = useMoonScrub(motionAllowed)

  // Clock and IP are client facts: the server renders nothing, mount fills in
  useEffect(() => {
    setMountedAt(Date.now())

    let cancelled = false
    fetchVisitorLocation().then((visitor) => {
      if (cancelled || !visitor?.located || visitor.lat === undefined) return
      setTilt(moonTilt(visitor.lat))
    })
    return () => {
      cancelled = true
    }
  }, [])

  const preload = (
    <link
      rel='preload'
      as='image'
      href='/images/moon.webp'
      imageSrcSet='/images/moon.webp 1x, /images/moon@2x.webp 2x'
    />
  )

  if (mountedAt === null) return preload

  const phase = moonPhase(new Date(mountedAt + scrubber.scrub))
  const illumination = Math.round(phase.illumination * 100)
  return (
    <>
      {preload}
      <div
        role='slider'
        tabIndex={0}
        aria-label='Moon phase, drag sideways or press arrow keys to time travel'
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={illumination}
        aria-valuetext={`${phase.name}, ${illumination}% illuminated`}
        className={css.moon}
        style={cssVars({ '--moon-tilt': `${tilt}deg` })}
        onBlur={scrubber.onBlur}
        onKeyDown={scrubber.onKeyDown}
        onPointerCancel={scrubber.onPointerCancel}
        onPointerDown={scrubber.onPointerDown}
        onPointerMove={scrubber.onPointerMove}
        onPointerUp={scrubber.onPointerUp}
      >
        <svg viewBox='0 0 100 100' aria-hidden='true'>
          <defs>
            <radialGradient id='moon-sheen' cx='0.34' cy='0.3' r='0.75'>
              <stop offset='0' stopColor='#fffbe6' stopOpacity='0.3' />
              <stop offset='0.45' stopColor='#fffbe6' stopOpacity='0.09' />
              <stop offset='1' stopColor='#fffbe6' stopOpacity='0' />
            </radialGradient>
          </defs>
          <rect width='100' height='100' fill='url(#moon-sheen)' />
          <path d={shadowPath(phase)} />
        </svg>
      </div>
    </>
  )
}

export default SpriteMoon
