'use client'

import { clamp } from 'es-toolkit'
import type React from 'react'
import { useRef, useState } from 'react'
import { tapHaptic } from 'services/haptics'
import css from './clip-lab.module.css'

type Point = [number, number]

const NUDGES: Record<string, Point> = {
  ArrowLeft: [-0.25, 0],
  ArrowRight: [0.25, 0],
  ArrowUp: [0, -0.25],
  ArrowDown: [0, 0.25],
}

const fmt = (value: number) => {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

const toClipPath = (points: Point[]) =>
  `polygon(${points.map(([x, y]) => `${fmt(x)}% ${fmt(y)}%`).join(', ')})`

const ClipLab: React.FC<{
  label: string
  plate: string
  src: string
  width: number
  height: number
  alt: string
  points: Point[]
}> = (props) => {
  const stage = useRef<HTMLDivElement>(null)
  const dragIndex = useRef<number | null>(null)
  const [points, setPoints] = useState<Point[]>(props.points)

  const updatePoint = (index: number, next: Point) => {
    setPoints((current) =>
      current.map((point, i) =>
        i === index ? [clamp(next[0], 0, 100), clamp(next[1], 0, 100)] : point,
      ),
    )
  }

  const startDrag =
    (index: number) => (event: React.PointerEvent<HTMLButtonElement>) => {
      dragIndex.current = index
      event.currentTarget.setPointerCapture(event.pointerId)
    }

  const drag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const index = dragIndex.current
    const rect = stage.current?.getBoundingClientRect()
    if (index === null || !rect) return
    updatePoint(index, [
      ((event.clientX - rect.left) / rect.width) * 100,
      ((event.clientY - rect.top) / rect.height) * 100,
    ])
  }

  const endDrag = () => {
    if (dragIndex.current !== null) tapHaptic()
    dragIndex.current = null
  }

  const nudge =
    (index: number) => (event: React.KeyboardEvent<HTMLButtonElement>) => {
      const delta = NUDGES[event.key]
      if (!delta) return
      event.preventDefault()
      const step = event.shiftKey ? 4 : 1
      const [x, y] = points[index]
      updatePoint(index, [x + delta[0] * step, y + delta[1] * step])
    }

  const clipPath = toClipPath(points)

  return (
    <section aria-label={props.label} className={css.lab}>
      <div className={css.head}>
        <span className={css.label}>{props.label}</span>
        <button
          className={css.reset}
          onClick={() => {
            tapHaptic()
            setPoints(props.points)
          }}
          type='button'
        >
          reset
        </button>
      </div>
      <div className={css.stage} ref={stage}>
        <img
          alt='the scavenger stall plate behind the keeper'
          className={css.plate}
          draggable={false}
          height={props.height}
          src={props.plate}
          width={props.width}
        />
        <img
          alt=''
          aria-hidden='true'
          className={css.ghost}
          draggable={false}
          height={props.height}
          src={props.src}
          width={props.width}
        />
        <img
          alt={props.alt}
          className={css.kept}
          draggable={false}
          height={props.height}
          src={props.src}
          style={{ clipPath }}
          width={props.width}
        />
        <svg
          aria-hidden='true'
          className={css.outline}
          preserveAspectRatio='none'
          viewBox='0 0 100 100'
        >
          <polygon points={points.map(([x, y]) => `${x},${y}`).join(' ')} />
        </svg>
        {points.map(([x, y], index) => (
          <button
            aria-label={`point ${index + 1}: ${fmt(x)}%, ${fmt(y)}%`}
            className={css.handle}
            // points never reorder, the index is the point's identity
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length polygon
            key={index}
            onKeyDown={nudge(index)}
            onPointerCancel={endDrag}
            onPointerDown={startDrag(index)}
            onPointerMove={drag}
            onPointerUp={endDrag}
            style={{ left: `${x}%`, top: `${y}%` }}
            type='button'
          />
        ))}
      </div>
      <p className={css.hint}>
        Drag a point, or focus one and nudge with the arrow keys. Shift moves
        faster. Dropped pixels fade to a faint silhouette and the stall shows
        through.
      </p>
      <code className={css.readout}>clip-path: {clipPath}</code>
    </section>
  )
}

export default ClipLab
