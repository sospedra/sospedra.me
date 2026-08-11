'use client'

import type React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SarosControls, { type ScrubPhase } from './saros-controls.tsx'
import css from './saros-globe.module.css'
import {
  computeTrack,
  type Element,
  type LonLat,
  type Member,
  type Track,
} from './saros-path.ts'
import {
  formatApproach,
  formatPoint,
  nearestApproachKm,
  nearestPlace,
} from './saros-places.ts'
import {
  buildGraticule,
  drawGraticule,
  drawLand,
  drawMarker,
  drawPlace,
  drawSphere,
  fillPoints,
  sliceLine,
  strokePoints,
  unproject,
  type View,
} from './saros-render.ts'
import data from './saros126.json' with { type: 'json' }

const MEMBERS = data.members as Member[]
const ELEMENTS = data.elements as Record<string, Element>
const LAND = data.land as LonLat[][]
const GRATICULE = buildGraticule()

const HERO_INDEX = MEMBERS.findIndex((member) => member.key === '20260812')

const COLOR: Record<string, string> = {
  T: '#ffea00',
  H: '#f04bb8',
  A: '#6df7ea',
  P: '#5f7183',
}
const LABEL: Record<string, string> = {
  T: 'total',
  H: 'hybrid',
  A: 'annular',
  P: 'partial',
}

const kindOf = (member: Member) =>
  member.type[0] === 'P' ? 'P' : member.type[0]
const colorOf = (member: Member) => COLOR[kindOf(member)]
const labelOf = (member: Member) => LABEL[kindOf(member)]

const CENSUS = ['T', 'A', 'H', 'P'].map((kind) => ({
  kind,
  count: MEMBERS.filter((member) => kindOf(member) === kind).length,
}))

const TRAIL_LENGTH = 8
const SWEEP_SECONDS = 2.1
const HOLD = 0.55
const TAP_SLOP_PX = 8
const CHASE_RESPONSE = 6

const tracks = new Map<string, Track>()
const trackFor = (member: Member): Track | null => {
  const element = ELEMENTS[member.key]
  if (!element) return null
  const cached = tracks.get(member.key)
  if (cached) return cached
  const built = computeTrack(element, member.dT)
  tracks.set(member.key, built)
  return built
}

const clampLatitude = (lat: number) => Math.max(-62, Math.min(62, lat))
const shortestTurn = (from: number, to: number) =>
  ((to - from + 540) % 360) - 180

type Camera = { lon: number; lat: number }
type Pin = { lon: number; lat: number; label: string }

const pinFrom = (point: LonLat): Pin => ({
  lon: point[0],
  lat: point[1],
  label: nearestPlace(point)?.name ?? formatPoint(point),
})

const SarosGlobe: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [index, setIndex] = useState(HERO_INDEX)
  const [playing, setPlaying] = useState(true)
  const [pin, setPin] = useState<Pin | null>(null)
  const [scrubbing, setScrubbing] = useState(false)

  const indexRef = useRef(index)
  const playingRef = useRef(playing)
  const pinRef = useRef(pin)
  const phaseRef = useRef(1 + HOLD)
  const camRef = useRef<Camera>({
    lon: MEMBERS[HERO_INDEX].lon,
    lat: clampLatitude(MEMBERS[HERO_INDEX].lat),
  })
  const viewRef = useRef<View>({
    centerLon: 0,
    centerLat: 0,
    radius: 100,
    cx: 0,
    cy: 0,
  })
  const draggingRef = useRef(false)
  const awayRef = useRef(false)
  const scrubbingRef = useRef(false)
  const wasPlayingRef = useRef(false)
  const onScreenRef = useRef(true)
  const calmRef = useRef(false)
  const pointerRef = useRef({ x: 0, y: 0, travel: 0 })

  const member = MEMBERS[index]

  const approach = useMemo(() => {
    if (!pin) return null
    const track = trackFor(member)
    if (!track) return 'no central line'
    return formatApproach(nearestApproachKm(track.line, [pin.lon, pin.lat]))
  }, [pin, member])

  const aim = useCallback((next: number, sweep: boolean) => {
    const wrapped = (next + MEMBERS.length) % MEMBERS.length
    indexRef.current = wrapped
    phaseRef.current = sweep ? 0 : 1
    awayRef.current = false
    setIndex(wrapped)
  }, [])

  const step = useCallback(
    (delta: number) => aim(indexRef.current + delta, true),
    [aim],
  )

  const onScrub = useCallback(
    (next: number, phase: ScrubPhase) => aim(next, phase === 'tap'),
    [aim],
  )

  const onScrubStart = useCallback(() => {
    wasPlayingRef.current = playingRef.current
    scrubbingRef.current = true
    setScrubbing(true)
    setPlaying(false)
  }, [])

  const onScrubEnd = useCallback(() => {
    if (!scrubbingRef.current) return
    scrubbingRef.current = false
    setScrubbing(false)
    if (wasPlayingRef.current) setPlaying(true)
  }, [])

  useEffect(() => {
    playingRef.current = playing
  }, [playing])

  useEffect(() => {
    pinRef.current = pin
    if (pin) awayRef.current = false
  }, [pin])

  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => {
      calmRef.current = query.matches
      setPlaying(!query.matches)
    }
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreenRef.current = entry.isIntersecting
        if (entry.isIntersecting && !calmRef.current) setPlaying(true)
      },
      { threshold: 0.25 },
    )
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const view = viewRef.current
    let frame = 0
    let last = performance.now()

    const resize = () => {
      const ratio = Math.min(devicePixelRatio || 1, 2)
      const box = canvas.getBoundingClientRect()
      canvas.width = Math.round(box.width * ratio)
      canvas.height = Math.round(box.height * ratio)
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      view.cx = box.width / 2
      view.cy = box.height / 2
      view.radius = Math.min(box.width, box.height) * 0.44
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    const advancePlayback = (dt: number) => {
      const held =
        playingRef.current &&
        onScreenRef.current &&
        !draggingRef.current &&
        !scrubbingRef.current
      if (!held) return
      phaseRef.current += dt / SWEEP_SECONDS
      if (phaseRef.current < 1 + HOLD) return
      phaseRef.current = 0
      awayRef.current = false
      indexRef.current = (indexRef.current + 1) % MEMBERS.length
      setIndex(indexRef.current)
    }

    // Exponential chase: retargets every frame from the live camera, so a new
    // goal mid-flight never resets progress and never jumps.
    const chaseCamera = (dt: number) => {
      if (draggingRef.current || awayRef.current) return
      const goal = pinRef.current ?? MEMBERS[indexRef.current]
      const response = calmRef.current ? 60 : CHASE_RESPONSE
      const blend = 1 - Math.exp(-dt * response)
      const cam = camRef.current
      cam.lon += shortestTurn(cam.lon, goal.lon) * blend
      cam.lat += (clampLatitude(goal.lat) - cam.lat) * blend
    }

    const paintTrails = () => {
      const now = indexRef.current
      for (let i = Math.max(0, now - TRAIL_LENGTH); i < now; i++) {
        const past = MEMBERS[i]
        ctx.globalAlpha = 0.5 * 0.78 ** (now - i)
        ctx.lineWidth = 1.1
        ctx.strokeStyle = colorOf(past)
        const trail = trackFor(past)
        if (trail) strokePoints(ctx, trail.line, view)
        else drawMarker(ctx, [past.lon, past.lat], view, colorOf(past), 2)
        ctx.globalAlpha = 1
      }
    }

    const paintCurrent = () => {
      const current = MEMBERS[indexRef.current]
      const tint = colorOf(current)
      const track = trackFor(current)
      if (!track) {
        drawMarker(ctx, [current.lon, current.lat], view, tint, 5)
        return
      }
      const grown = Math.min(1, phaseRef.current)
      if (grown >= 1) {
        ctx.globalAlpha = 0.18
        ctx.fillStyle = tint
        fillPoints(ctx, track.band, view)
        ctx.globalAlpha = 1
      }
      ctx.lineWidth = 2.2
      ctx.strokeStyle = tint
      strokePoints(ctx, sliceLine(track.line, grown), view)
      const head = track.line[Math.floor((track.line.length - 1) * grown)]
      if (head) drawMarker(ctx, head, view, tint, 4)
    }

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      advancePlayback(dt)
      chaseCamera(dt)
      view.centerLon = camRef.current.lon
      view.centerLat = camRef.current.lat

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      drawSphere(ctx, view, { face: '#0b1119', limb: 'rgb(109 247 234 / 22%)' })
      drawGraticule(ctx, GRATICULE, view, 'rgb(109 247 234 / 9%)')
      drawLand(ctx, LAND, view, 'rgb(150 176 200 / 34%)')
      paintTrails()
      paintCurrent()
      const held = pinRef.current
      if (held) drawPlace(ctx, [held.lon, held.lat], view, '#6df7ea')
      frame = requestAnimationFrame(render)
    }

    frame = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [])

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    draggingRef.current = true
    pointerRef.current = { x: event.clientX, y: event.clientY, travel: 0 }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggingRef.current) return
    const pointer = pointerRef.current
    const dx = event.clientX - pointer.x
    const dy = event.clientY - pointer.y
    pointer.x = event.clientX
    pointer.y = event.clientY
    pointer.travel += Math.abs(dx) + Math.abs(dy)
    if (pointer.travel <= TAP_SLOP_PX) return
    awayRef.current = true
    camRef.current = {
      lon: camRef.current.lon - dx * 0.3,
      lat: Math.max(-88, Math.min(88, camRef.current.lat + dy * 0.3)),
    }
  }

  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    draggingRef.current = false
    if (pointerRef.current.travel > TAP_SLOP_PX) return
    const box = event.currentTarget.getBoundingClientRect()
    const point = unproject(
      event.clientX - box.left,
      event.clientY - box.top,
      viewRef.current,
    )
    setPin(point ? pinFrom(point) : null)
  }

  return (
    <figure className={`${css.widget} ${css.widget}`}>
      <div className={css.stage}>
        <canvas
          ref={canvasRef}
          className={css.canvas}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        <div className={css.hud}>
          <span className={css.series}>saros 126 · solar</span>
          <strong className={css.date}>{member.date}</strong>
          <span className={css.type} style={{ color: colorOf(member) }}>
            {labelOf(member)} · {member.ord} of {MEMBERS.length}
          </span>
          {pin ? (
            <span className={css.approach}>
              {pin.label} · {approach}
              <button
                type='button'
                className={css.release}
                onClick={() => setPin(null)}
              >
                ✕<span className={css.sr}>release {pin.label}</span>
              </button>
            </span>
          ) : null}
        </div>
        <dl className={css.stats}>
          <div>
            <dt>gamma</dt>
            <dd>{member.gamma.toFixed(4)}</dd>
          </div>
          <div>
            <dt>mag</dt>
            <dd>{member.mag.toFixed(4)}</dd>
          </div>
          {member.width ? (
            <div>
              <dt>width</dt>
              <dd>{member.width} km</dd>
            </div>
          ) : null}
          {member.dur ? (
            <div>
              <dt>dur</dt>
              <dd>{member.dur}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <SarosControls
        members={MEMBERS}
        index={index}
        heroIndex={HERO_INDEX}
        playing={playing}
        scrubbing={scrubbing}
        colorOf={colorOf}
        labelOf={labelOf}
        onTogglePlay={() => setPlaying((on) => !on)}
        onStep={step}
        onScrub={onScrub}
        onScrubStart={onScrubStart}
        onScrubEnd={onScrubEnd}
      />

      <figcaption className={css.caption}>
        <span>
          Saros 126 runs 72 eclipses from 1179 to 2459, each about a third of
          the planet west of the last.
        </span>
        <span className={css.census}>
          {CENSUS.map(({ kind, count }) => (
            <span key={kind}>
              <i style={{ background: COLOR[kind] }} />
              {count} {LABEL[kind]}
            </span>
          ))}
        </span>
        <span>Eclipse predictions by Fred Espenak, NASA GSFC.</span>
      </figcaption>

      <ol className={css.sr}>
        {MEMBERS.map((entry) => (
          <li key={entry.key}>
            {entry.date}, {labelOf(entry)}
          </li>
        ))}
      </ol>
    </figure>
  )
}

export default SarosGlobe
