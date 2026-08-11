'use client'

import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import chrome from './figure.module.css'
import { formatObscuration } from './local-format.ts'
import css from './overlap-lab.module.css'
import {
  type EclipseKind3,
  formatLux,
  luxAt,
  luxGaugePosition,
  momentAt,
  type OverlapMoment,
  purkinjeBlend,
  sceneDarkness,
  verdictAt,
} from './overlap-optics.ts'

const KINDS: { kind: EclipseKind3; label: string; note: string }[] = [
  { kind: 'total', label: 'total', note: '12 Aug 2026' },
  { kind: 'annular', label: 'annular', note: '26 Jan 2028' },
  { kind: 'partial', label: 'partial', note: 'outside the band' },
]

const SCRUB_STEPS = 1000
const PLAYBACK_SECONDS = 14
const SUN_SCREEN_RADIUS = 46

const GAUGE_MARKS = [
  { lux: 100_000, label: 'clear noon' },
  { lux: 1000, label: '99% covered' },
  { lux: 10, label: 'deep twilight' },
  { lux: 0.25, label: 'full moon · totality' },
]

const mixChannel = (from: number, to: number, amount: number) =>
  Math.round(from + (to - from) * amount)

const mixColor = (
  from: [number, number, number],
  to: [number, number, number],
  amount: number,
) =>
  `rgb(${mixChannel(from[0], to[0], amount)} ${mixChannel(from[1], to[1], amount)} ${mixChannel(from[2], to[2], amount)})`

/** Rods are colorblind: red collapses to dark gray, green holds as pale gray. */
const purkinjeSwatches = (blend: number) => ({
  red: mixColor([230, 68, 60], [46, 44, 50], blend),
  green: mixColor([74, 222, 128], [168, 182, 172], blend * 0.55),
})

const drawSky = (
  context: CanvasRenderingContext2D,
  size: { width: number; height: number },
  darkness: number,
) => {
  const sky = context.createLinearGradient(0, 0, 0, size.height)
  const top = (base: number, drop: number) => Math.round(base - drop * darkness)
  sky.addColorStop(0, `rgb(${top(96, 84)},${top(150, 130)},${top(206, 172)})`)
  sky.addColorStop(1, `rgb(${top(140, 108)},${top(168, 130)},${top(214, 160)})`)
  context.fillStyle = sky
  context.fillRect(0, 0, size.width, size.height)
}

const drawCorona = (
  context: CanvasRenderingContext2D,
  center: { x: number; y: number },
  radius: number,
) => {
  const corona = context.createRadialGradient(
    center.x,
    center.y,
    radius * 0.95,
    center.x,
    center.y,
    radius * 3,
  )
  corona.addColorStop(0, 'rgb(238 242 255 / 90%)')
  corona.addColorStop(0.4, 'rgb(226 232 250 / 34%)')
  corona.addColorStop(1, 'rgb(226 232 250 / 0%)')
  context.fillStyle = corona
  context.beginPath()
  context.arc(center.x, center.y, radius * 3, 0, Math.PI * 2)
  context.fill()
}

const drawDiscs = (
  context: CanvasRenderingContext2D,
  center: { x: number; y: number },
  moment: OverlapMoment,
  darkness: number,
) => {
  if (moment.totality) drawCorona(context, center, SUN_SCREEN_RADIUS)

  if (moment.diamondRing) {
    const angle = Math.atan2(-moment.moonY, -moment.moonX)
    const bead = {
      x: center.x + Math.cos(angle) * SUN_SCREEN_RADIUS,
      y: center.y + Math.sin(angle) * SUN_SCREEN_RADIUS,
    }
    const flash = context.createRadialGradient(
      bead.x,
      bead.y,
      0,
      bead.x,
      bead.y,
      SUN_SCREEN_RADIUS * 1.6,
    )
    flash.addColorStop(0, 'rgb(255 252 235 / 95%)')
    flash.addColorStop(1, 'rgb(255 252 235 / 0%)')
    context.fillStyle = flash
    context.beginPath()
    context.arc(bead.x, bead.y, SUN_SCREEN_RADIUS * 1.6, 0, Math.PI * 2)
    context.fill()
  }

  context.fillStyle = moment.ringOfFire ? '#ffd75e' : '#ffdd3d'
  context.beginPath()
  context.arc(center.x, center.y, SUN_SCREEN_RADIUS, 0, Math.PI * 2)
  context.fill()

  const moonTone = Math.round(18 + 26 * (1 - darkness))
  context.fillStyle = `rgb(${moonTone} ${moonTone + 4} ${moonTone + 10})`
  context.beginPath()
  context.arc(
    center.x + moment.moonX * SUN_SCREEN_RADIUS,
    center.y + moment.moonY * SUN_SCREEN_RADIUS,
    moment.moonRadius * SUN_SCREEN_RADIUS,
    0,
    Math.PI * 2,
  )
  context.fill()
}

/**
 * The colander effect: every gap projects the uncovered shape of the sun, so
 * the ground under a tree fills with little crescents. A pinhole inverts the
 * image, so the ground bite mirrors the sky one.
 */
const drawCrescents = (
  context: CanvasRenderingContext2D,
  size: { width: number; height: number },
  moment: OverlapMoment,
  darkness: number,
) => {
  const groundTop = size.height * 0.82
  context.fillStyle = `rgb(${Math.round(52 - 30 * darkness)} ${Math.round(
    46 - 26 * darkness,
  )} ${Math.round(40 - 22 * darkness)})`
  context.fillRect(0, groundTop, size.width, size.height - groundTop)

  const glow = Math.max(0.12, 1 - darkness)
  const radius = 7
  for (let spot = 0; spot < 7; spot += 1) {
    const x = size.width * (0.1 + spot * 0.13)
    const y = groundTop + (size.height - groundTop) * (0.32 + (spot % 3) * 0.18)
    context.fillStyle = `rgb(255 216 130 / ${(glow * 88).toFixed(0)}%)`
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = `rgb(${Math.round(52 - 30 * darkness)} ${Math.round(
      46 - 26 * darkness,
    )} ${Math.round(40 - 22 * darkness)})`
    context.beginPath()
    context.arc(
      x - moment.moonX * radius,
      y - moment.moonY * radius,
      moment.moonRadius * radius,
      0,
      Math.PI * 2,
    )
    context.fill()
  }
}

const OverlapLab: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)
  const [kind, setKind] = useState<EclipseKind3>('total')
  const [t, setT] = useState(-0.55)
  const [playing, setPlaying] = useState(false)

  const moment = momentAt(kind, t)
  const lux = luxAt(moment)
  const darkness = sceneDarkness(lux)
  const blend = purkinjeBlend(lux)
  const swatches = purkinjeSwatches(blend)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const scale = Math.min(2, window.devicePixelRatio || 1)
    const cssWidth = canvas.offsetWidth || 600
    const width = Math.round(cssWidth * scale)
    const height = Math.round(cssWidth * 0.46 * scale)
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }
    context.save()
    context.scale(scale, scale)
    const size = { width: width / scale, height: height / scale }
    drawSky(context, size, darkness)
    drawDiscs(
      context,
      { x: size.width / 2, y: size.height * 0.42 },
      moment,
      darkness,
    )
    drawCrescents(context, size, moment, darkness)
    context.restore()
  }, [moment, darkness])

  useEffect(() => {
    if (!playing) return
    let last = performance.now()
    const step = (stamp: number) => {
      const delta = (stamp - last) / 1000
      last = stamp
      setT((current) => {
        const next = current + (2 * delta) / PLAYBACK_SECONDS
        if (next >= 1) {
          setPlaying(false)
          return 1
        }
        return next
      })
      frameRef.current = requestAnimationFrame(step)
    }
    frameRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameRef.current)
  }, [playing])

  return (
    <section className={chrome.figure}>
      <div className={chrome.card}>
        <div className={chrome.head}>
          <span className={chrome.label}>fig 02 · the light switch</span>
          <span className={chrome.count}>
            {`covered ${formatObscuration(moment.obscuration)} · ${formatLux(lux)}`}
          </span>
        </div>

        <div className={chrome.body}>
          <p className={chrome.brief}>
            Drag the moon across the sun and watch the light meter, not the
            discs. The scale is logarithmic because your pupils are. In a total
            eclipse the moon disc is the larger one, in an annular it is the
            smaller one, and in a partial the alignment misses.{' '}
            <strong>The last percent is a light switch.</strong>
          </p>

          <div className={chrome.controls}>
            {KINDS.map((entry) => (
              <button
                aria-pressed={kind === entry.kind}
                className={chrome.chip}
                key={entry.kind}
                onClick={() => setKind(entry.kind)}
                type='button'
              >
                {entry.label}
                <span className={css.kindNote}>{entry.note}</span>
              </button>
            ))}
          </div>

          <canvas
            aria-label='The moon disc crossing the sun disc, with the daylight and the ground crescents dimming'
            className={css.scene}
            ref={canvasRef}
          />

          <div className={css.scrub}>
            <button
              aria-label={playing ? 'Pause the pass' : 'Play the pass'}
              className={css.play}
              onClick={() => {
                if (playing) {
                  setPlaying(false)
                  return
                }
                if (t >= 0.99) setT(-1)
                setPlaying(true)
              }}
              type='button'
            >
              {playing ? '❚❚' : '▶'}
            </button>
            <input
              aria-label='Position of the moon across the sun'
              className={css.range}
              max={SCRUB_STEPS}
              min={0}
              onChange={(event) => {
                setPlaying(false)
                setT((Number(event.target.value) / SCRUB_STEPS) * 2 - 1)
              }}
              type='range'
              value={Math.round(((t + 1) / 2) * SCRUB_STEPS)}
            />
          </div>

          <div className={css.meters}>
            <div className={css.gauge}>
              <div className={css.gaugeTrack}>
                <div
                  className={css.gaugeFill}
                  style={{ transform: `scaleX(${luxGaugePosition(lux)})` }}
                />
                {GAUGE_MARKS.map((mark) => (
                  <span
                    className={css.gaugeMark}
                    data-align={
                      luxGaugePosition(mark.lux) > 0.7 ? 'end' : 'start'
                    }
                    key={mark.lux}
                    style={{ left: `${luxGaugePosition(mark.lux) * 100}%` }}
                  >
                    <i />
                    {mark.label}
                  </span>
                ))}
              </div>
            </div>

            <div className={css.purkinje}>
              <span className={css.swatch} style={{ background: swatches.red }}>
                red
              </span>
              <span
                className={css.swatch}
                style={{ background: swatches.green }}
              >
                green
              </span>
              <p className={css.purkinjeNote}>
                {blend < 0.05
                  ? 'Cones rule: red and green both read as themselves.'
                  : 'The Purkinje shift: rods take over, red quits first.'}
              </p>
            </div>
          </div>

          <p className={css.verdict}>{verdictAt(moment)}</p>

          <p className={chrome.note}>
            The ground strip shows the colander effect: every gap projects the
            uncovered shape of the sun, so tree shade fills with crescents. Disc
            ratios are the real ones: 1.045 for 12 August 2026, 0.955 for the
            annular of 26 January 2028.
          </p>
        </div>
      </div>
    </section>
  )
}

export default OverlapLab
