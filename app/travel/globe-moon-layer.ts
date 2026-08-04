import type React from 'react'
import {
  type GlobeView,
  projectLunarPoint,
  viewRotation,
} from './globe-projection'
import { lunarOrbitAtVisit } from './lunar-position'

const LUNAR_SVG_SIZE = 1000
const LUNAR_ORBIT_SAMPLES = 48
export const LUNAR_ORBIT_FRAME_STEP = 2

type TravelMoonLayerRefs = {
  body: React.RefObject<SVGGElement | null>
  label: React.RefObject<SVGTextElement | null>
  orbit?: React.RefObject<SVGPathElement | null>
  svg: React.RefObject<SVGSVGElement | null>
}

export type TravelMoonRefs = {
  back: TravelMoonLayerRefs
  front: TravelMoonLayerRefs
}

type MoonRef = React.RefObject<TravelMoonRefs | undefined>

export const sizeMoonLayers = (
  moonRef: MoonRef,
  size: { width: number; height: number },
) => {
  const lunarSide = Math.min(size.width, size.height)
  for (const layer of [moonRef.current?.back, moonRef.current?.front]) {
    const svg = layer?.svg.current
    if (!svg) continue
    svg.style.width = `${lunarSide}px`
    svg.style.height = `${lunarSide}px`
  }
}

export const createMoonPainter = (moonRef: MoonRef) => {
  const hasLunarOrbit = Boolean(
    moonRef.current?.back.orbit?.current ||
      moonRef.current?.front.orbit?.current,
  )
  const lunarVisit = lunarOrbitAtVisit(
    new Date(),
    hasLunarOrbit ? LUNAR_ORBIT_SAMPLES : 1,
  )
  for (const layer of [moonRef.current?.back, moonRef.current?.front]) {
    const svg = layer?.svg.current
    if (!svg) continue
    svg.dataset.observedAt = lunarVisit.observedAt
    svg.dataset.sublunarLatitude = lunarVisit.sublunarLatitude.toFixed(4)
    svg.dataset.sublunarLongitude = lunarVisit.sublunarLongitude.toFixed(4)
    svg.dataset.distanceKm = lunarVisit.distanceKm.toFixed(0)
  }

  let moonIsFront: boolean | null = null
  let moonLabelOnLeft: boolean | null = null
  const updateMoon = (view: GlobeView, updateOrbit: boolean) => {
    const back = moonRef.current?.back
    const front = moonRef.current?.front
    if (!back || !front) return
    const rotation = viewRotation(view.phi, view.theta)

    if (hasLunarOrbit && updateOrbit) {
      let backPath = ''
      let frontPath = ''
      let previous: { front: boolean; x: number; y: number } | undefined

      for (const point of lunarVisit.orbit) {
        const projected = projectLunarPoint(point, view, rotation)
        const next = {
          front: projected.z >= 0,
          x: projected.x * LUNAR_SVG_SIZE,
          y: projected.y * LUNAR_SVG_SIZE,
        }
        const coordinate = `${next.x.toFixed(1)} ${next.y.toFixed(1)}`

        if (!previous) {
          if (next.front) frontPath = `M ${coordinate}`
          else backPath = `M ${coordinate}`
          previous = next
          continue
        }

        if (previous.front === next.front) {
          if (next.front) frontPath += ` L ${coordinate}`
          else backPath += ` L ${coordinate}`
        } else {
          const previousCoordinate = `${previous.x.toFixed(1)} ${previous.y.toFixed(1)}`
          if (previous.front) {
            frontPath += ` L ${coordinate}`
            backPath += ` M ${previousCoordinate} L ${coordinate}`
          } else {
            backPath += ` L ${coordinate}`
            frontPath += ` M ${previousCoordinate} L ${coordinate}`
          }
        }
        previous = next
      }

      back.orbit?.current?.setAttribute('d', backPath)
      front.orbit?.current?.setAttribute('d', frontPath)
    }

    const current = projectLunarPoint(lunarVisit.current, view, rotation)
    const isFront = current.z >= 0
    const labelOnLeft = current.x > 0.5
    if (moonLabelOnLeft !== labelOnLeft) {
      for (const layer of [back, front]) {
        const label = layer.label.current
        if (!label) continue
        label.setAttribute('x', labelOnLeft ? '-12' : '12')
        label.setAttribute('text-anchor', labelOnLeft ? 'end' : 'start')
      }
      moonLabelOnLeft = labelOnLeft
    }
    const body = isFront ? front.body.current : back.body.current
    const transform = `translate(${(current.x * LUNAR_SVG_SIZE).toFixed(1)} ${(
      current.y * LUNAR_SVG_SIZE
    ).toFixed(1)}) scale(${view.zoom.toFixed(3)})`
    body?.setAttribute('transform', transform)
    if (moonIsFront !== isFront) {
      body?.setAttribute('opacity', '1')
      const hiddenBody = isFront ? back.body.current : front.body.current
      hiddenBody?.setAttribute('opacity', '0')
      moonIsFront = isFront
    }
  }

  return updateMoon
}
