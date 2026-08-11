'use client'

import type React from 'react'
import { useMemo, useRef, useState } from 'react'
import {
  type CenturyState,
  FULL_RANGE,
  passesFilters,
} from './century-state.ts'
import css from './century-timeline.module.css'
import { type AtlasEclipse, KIND_COLOR } from './eclipse-atlas.ts'

const WIDTH = 660
const HEIGHT = 76
const LEFT = 12
const RIGHT = WIDTH - 12
const STRIP_TOP = 8
const STRIP_BOTTOM = HEIGHT - 22
const TICK_YEARS = [1900, 1920, 1940, 1960, 1980, 2000, 2020]
const ROW_Y: Record<string, number> = { T: 17, A: 29, H: 41 }
/** A drag under this many pixels is a click, and a click clears the brush. */
const DRAG_THRESHOLD = 4

const toX = (fraction: number) =>
  LEFT +
  ((fraction - FULL_RANGE[0]) / (FULL_RANGE[1] + 1 - FULL_RANGE[0])) *
    (RIGHT - LEFT)

const toYear = (x: number) =>
  FULL_RANGE[0] +
  ((x - LEFT) / (RIGHT - LEFT)) * (FULL_RANGE[1] + 1 - FULL_RANGE[0])

const CenturyTimeline: React.FC<{
  eclipses: AtlasEclipse[]
  state: CenturyState
  selectedId: number | null
  onHover: (id: number | null) => void
  onPin: (id: number) => void
  onRange: (range: [number, number]) => void
  onClearRange: () => void
}> = (props) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{ x: number; moved: number } | null>(null)
  const [drag, setDrag] = useState<[number, number] | null>(null)

  const dots = useMemo(
    () =>
      props.eclipses.map((eclipse) => ({
        eclipse,
        cx: toX(eclipse.fraction),
        cy: ROW_Y[eclipse.kind],
      })),
    [props.eclipses],
  )

  const localX = (clientX: number) => {
    const svg = svgRef.current
    if (!svg) return 0
    const rect = svg.getBoundingClientRect()
    return ((clientX - rect.left) / rect.width) * WIDTH
  }

  const start = (event: React.PointerEvent<SVGSVGElement>) => {
    const x = localX(event.clientX)
    dragRef.current = { x, moved: 0 }
    setDrag([x, x])
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const move = (event: React.PointerEvent<SVGSVGElement>) => {
    const held = dragRef.current
    if (!held) return
    const x = localX(event.clientX)
    held.moved = Math.abs(x - held.x)
    setDrag([Math.min(held.x, x), Math.max(held.x, x)])
  }

  const end = () => {
    const held = dragRef.current
    dragRef.current = null
    if (!held) return
    if (held.moved < DRAG_THRESHOLD) {
      setDrag(null)
      props.onClearRange()
      return
    }
    if (!drag) return
    props.onRange([Math.round(toYear(drag[0])), Math.round(toYear(drag[1]))])
  }

  const selection = drag ?? [
    toX(props.state.range[0]),
    toX(props.state.range[1] + 1),
  ]
  const brushed =
    drag !== null ||
    props.state.range[0] !== FULL_RANGE[0] ||
    props.state.range[1] !== FULL_RANGE[1]

  return (
    /* The drag lives on the svg, not on an overlay rect: a rect below the marks
       never sees a press that starts on one, and every mark is a press target. */
    <svg
      aria-label='One mark per eclipse across the century. Drag to narrow the years, click to reset.'
      className={css.timeline}
      onPointerCancel={end}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      ref={svgRef}
      role='img'
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
    >
      <g className={css.axis}>
        {TICK_YEARS.map((year) => (
          <g key={year}>
            <line
              x1={toX(year)}
              x2={toX(year)}
              y1={STRIP_TOP}
              y2={STRIP_BOTTOM}
            />
            <text x={toX(year)} y={HEIGHT - 6}>
              {year}
            </text>
          </g>
        ))}
      </g>

      {brushed ? (
        <rect
          className={css.selection}
          height={STRIP_BOTTOM - STRIP_TOP}
          width={Math.max(1, selection[1] - selection[0])}
          x={selection[0]}
          y={STRIP_TOP}
        />
      ) : null}

      <g>
        {dots.map(({ eclipse, cx, cy }) => {
          if (!passesFilters(eclipse, props.state)) return null
          const active = eclipse.id === props.selectedId
          return (
            <circle
              className={css.dot}
              cx={cx}
              cy={cy}
              data-active={active}
              fill={KIND_COLOR[eclipse.kind]}
              key={eclipse.id}
              onPointerEnter={() => props.onHover(eclipse.id)}
              onPointerUp={(event) => {
                event.stopPropagation()
                props.onPin(eclipse.id)
              }}
              r={active ? 4.6 : 2.4}
            />
          )
        })}
      </g>
    </svg>
  )
}

export default CenturyTimeline
