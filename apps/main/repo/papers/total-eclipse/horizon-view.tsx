'use client'

import type React from 'react'
import { useEffect, useRef } from 'react'
import css from './horizon-view.module.css'
import type { ShadowEngine, Site } from './shadow-engine.ts'

const AZIMUTH_SPAN = 64
const GROUND_FRACTION = 0.86
const TICK_AZIMUTHS = [225, 247.5, 270, 292.5, 315, 337.5, 0]
const TICK_NAMES = ['SW', 'WSW', 'W', 'WNW', 'NW', 'NNW', 'N']

type Frame = {
  width: number
  height: number
  scale: number
  x: (azimuth: number) => number
  y: (altitude: number) => number
}

const skyGradient = (
  context: CanvasRenderingContext2D,
  frame: Frame,
  darkness: number,
) => {
  const sky = context.createLinearGradient(0, 0, 0, frame.height)
  const top = (base: number, drop: number) => Math.round(base - drop * darkness)
  sky.addColorStop(0, `rgb(${top(12, 5)},${top(20, 10)},${top(34, 18)})`)
  sky.addColorStop(1, `rgb(${top(58, 34)},${top(46, 28)},${top(52, 28)})`)
  return sky
}

const drawAltitudeGrid = (
  context: CanvasRenderingContext2D,
  frame: Frame,
  top: number,
) => {
  context.strokeStyle = 'rgb(140 152 178 / 28%)'
  context.fillStyle = 'rgb(140 152 178 / 72%)'
  context.font = `${10 * frame.scale}px var(--font-code, monospace)`
  context.setLineDash([3, 4])
  const step = top > 20 ? 10 : 5
  for (let altitude = 0; altitude <= top; altitude += step) {
    const y = frame.y(altitude)
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(frame.width, y)
    context.stroke()
    if (altitude > 0) {
      context.fillText(
        `${altitude}°`,
        frame.width - 26 * frame.scale,
        y - 3 * frame.scale,
      )
    }
  }
  context.setLineDash([])
}

const drawGround = (context: CanvasRenderingContext2D, frame: Frame) => {
  context.fillStyle = '#141c25'
  context.fillRect(0, frame.height * GROUND_FRACTION, frame.width, frame.height)
  context.fillStyle = 'rgb(232 236 246 / 82%)'
  for (const [index, azimuth] of TICK_AZIMUTHS.entries()) {
    const x = frame.x(azimuth)
    if (x < 0 || x > frame.width) continue
    context.fillRect(
      x,
      frame.height * GROUND_FRACTION,
      1.2 * frame.scale,
      5 * frame.scale,
    )
    context.fillText(
      TICK_NAMES[index],
      x + 3 * frame.scale,
      frame.height * 0.975,
    )
  }
}

const HorizonView: React.FC<{
  engine: ShadowEngine
  site: Site
  seconds: number
  centerAzimuth: number
  topAltitude: number
}> = (props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    const scale = Math.min(2, window.devicePixelRatio || 1)
    const cssWidth = canvas.offsetWidth || 300
    const width = Math.round(cssWidth * scale)
    const height = Math.round((cssWidth / 2) * scale)
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }

    const start = props.centerAzimuth - AZIMUTH_SPAN / 2
    const top = props.topAltitude
    const frame: Frame = {
      width,
      height,
      scale,
      x: (azimuth) => (width * (azimuth - start)) / AZIMUTH_SPAN,
      y: (altitude) =>
        height * GROUND_FRACTION - (altitude / top) * height * 0.8,
    }

    const moment = props.engine.instantAt(props.site, props.seconds)
    const darkness = Math.max(0, moment.obscuration) ** 3
    context.fillStyle = skyGradient(context, frame, darkness)
    context.fillRect(0, 0, width, height)
    drawAltitudeGrid(context, frame, top)

    /* The discs are schematic: 13 px stands for a half-degree sun. So the moon
       offset has to be measured in sun radii too, or an 85 percent partial draws
       as a hairline instead of a crescent. */
    const sunRadius = 13 * scale
    const sunRadiusDegrees = (moment.sunRadius * 180) / Math.PI
    const perRadius = sunRadius / sunRadiusDegrees
    const sunX = frame.x(moment.sunAzimuth)
    const sunY = frame.y(Math.max(moment.sunAltitude, -2))

    if (moment.obscuration > 0.996) {
      const corona = context.createRadialGradient(
        sunX,
        sunY,
        sunRadius * 0.9,
        sunX,
        sunY,
        sunRadius * 2.7,
      )
      corona.addColorStop(0, 'rgb(236 241 255 / 82%)')
      corona.addColorStop(1, 'rgb(236 241 255 / 0%)')
      context.fillStyle = corona
      context.beginPath()
      context.arc(sunX, sunY, sunRadius * 2.7, 0, Math.PI * 2)
      context.fill()
    }

    context.fillStyle = '#ffea00'
    context.beginPath()
    context.arc(sunX, sunY, sunRadius, 0, Math.PI * 2)
    context.fill()

    const azimuthGap =
      (moment.moonAzimuth - moment.sunAzimuth) *
      Math.cos((moment.sunAltitude * Math.PI) / 180)
    const altitudeGap = moment.moonAltitude - moment.sunAltitude
    context.fillStyle = '#05070c'
    context.beginPath()
    context.arc(
      sunX + azimuthGap * perRadius,
      sunY - altitudeGap * perRadius,
      sunRadius * (moment.moonRadius / moment.sunRadius),
      0,
      Math.PI * 2,
    )
    context.fill()

    drawGround(context, frame)
  }, [
    props.engine,
    props.site,
    props.seconds,
    props.centerAzimuth,
    props.topAltitude,
  ])

  return (
    <canvas
      aria-label='The sun and the moon over the horizon at the selected moment'
      className={css.horizon}
      ref={canvasRef}
    />
  )
}

export default HorizonView
