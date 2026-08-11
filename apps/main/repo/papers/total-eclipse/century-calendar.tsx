'use client'

import { geoOrthographic, geoPath } from 'd3-geo'
import { curveCatmullRom, line as d3line } from 'd3-shape'
import type React from 'react'
import css from './century-calendar.module.css'
import {
  type CalendarView,
  type CenturyState,
  passesFilters,
} from './century-state.ts'
import {
  type AtlasEclipse,
  bySarosSeries,
  CATALOGUE_FIRST_YEAR,
  CATALOGUE_LAST_YEAR,
  KIND_COLOR,
  MONTH_LABELS,
  PAPER_SAROS,
} from './eclipse-atlas.ts'
import { WORLD_LAND } from './world-land.ts'

const WIDTH = 660
const GUTTER = 46
const RIGHT = WIDTH - 12
const AXIS_HEIGHT = 26
const DECADE_TICKS = [1900, 1930, 1960, 1990, 2020]
const ROW_HEIGHT = 15
const YEAR_SPAN: [number, number] = [
  CATALOGUE_FIRST_YEAR - 2,
  CATALOGUE_LAST_YEAR + 2,
]

const yearX = (fraction: number) =>
  GUTTER +
  ((fraction - YEAR_SPAN[0]) / (YEAR_SPAN[1] - YEAR_SPAN[0])) * (RIGHT - GUTTER)

type MarkHandlers = {
  state: CenturyState
  selectedId: number | null
  onHover: (id: number | null) => void
  onPin: (id: number) => void
}

const YearAxis: React.FC<{ y: number }> = (props) => (
  <g className={css.axis}>
    {DECADE_TICKS.map((year) => (
      <text key={year} x={yearX(year)} y={props.y}>
        {year}
      </text>
    ))}
  </g>
)

const DecadeGrid: React.FC<{ top: number; bottom: number }> = (props) => (
  <g className={css.grid}>
    {DECADE_TICKS.map((year) => (
      <line
        key={year}
        x1={yearX(year)}
        x2={yearX(year)}
        y1={props.top}
        y2={props.bottom}
      />
    ))}
  </g>
)

const Mark: React.FC<
  MarkHandlers & { eclipse: AtlasEclipse; cx: number; cy: number; r: number }
> = (props) => {
  const active = props.eclipse.id === props.selectedId
  return (
    <circle
      className={css.mark}
      cx={props.cx}
      cy={props.cy}
      data-active={active}
      fill={KIND_COLOR[props.eclipse.kind]}
      onPointerEnter={() => props.onHover(props.eclipse.id)}
      onPointerUp={() => props.onPin(props.eclipse.id)}
      r={active ? props.r + 1.8 : props.r}
    />
  )
}

const CellsView: React.FC<MarkHandlers & { eclipses: AtlasEclipse[] }> = (
  props,
) => {
  const series = bySarosSeries(props.eclipses)
  const top = 16
  const height = top + series.length * ROW_HEIGHT + AXIS_HEIGHT
  const rowY = (saros: number) =>
    top + series.findIndex(([number]) => number === saros) * ROW_HEIGHT

  return (
    <svg
      aria-label='One row per saros series, one cell per eclipse'
      className={css.view}
      role='img'
      viewBox={`0 0 ${WIDTH} ${height}`}
    >
      <DecadeGrid bottom={height - AXIS_HEIGHT} top={top} />
      <rect
        className={css.paperRow}
        height={ROW_HEIGHT}
        width={RIGHT - GUTTER + 34}
        x={GUTTER - 34}
        y={rowY(PAPER_SAROS)}
      />
      {series.map(([saros]) => (
        <g key={saros}>
          <line
            className={css.rowRule}
            x1={GUTTER}
            x2={RIGHT}
            y1={rowY(saros) + ROW_HEIGHT / 2}
            y2={rowY(saros) + ROW_HEIGHT / 2}
          />
          <text
            className={saros === PAPER_SAROS ? css.rowNameOwn : css.rowName}
            x={GUTTER - 8}
            y={rowY(saros) + ROW_HEIGHT / 2 + 3.4}
          >
            {saros}
          </text>
        </g>
      ))}
      <text className={css.gutterTitle} x={GUTTER - 8} y={top - 4}>
        SAROS
      </text>
      {props.eclipses.map((eclipse) => {
        if (!passesFilters(eclipse, props.state)) return null
        const active = eclipse.id === props.selectedId
        return (
          <rect
            className={css.cell}
            data-active={active}
            fill={KIND_COLOR[eclipse.kind]}
            height={ROW_HEIGHT - 5}
            key={eclipse.id}
            onPointerEnter={() => props.onHover(eclipse.id)}
            onPointerUp={() => props.onPin(eclipse.id)}
            rx={1.5}
            width={7}
            x={yearX(eclipse.fraction) - 3.5}
            y={rowY(eclipse.saros) + 2.5}
          />
        )
      })}
      <YearAxis y={height - 8} />
    </svg>
  )
}

const DriftView: React.FC<
  MarkHandlers & {
    eclipses: AtlasEclipse[]
    label: string
    inner: number
    valueOf: (eclipse: AtlasEclipse) => number
    domain: [number, number]
    rows: { at: number; text: string; strong?: boolean }[]
    /** Breaks the arm where the value wraps, as December meets January. */
    wrapAt?: number
  }
> = (props) => {
  const top = 12
  const height = top + props.inner + AXIS_HEIGHT
  const y = (value: number) =>
    top +
    ((value - props.domain[0]) / (props.domain[1] - props.domain[0])) *
      props.inner

  const draw = d3line<AtlasEclipse>()
    .curve(curveCatmullRom.alpha(0.6))
    .x((eclipse) => yearX(eclipse.fraction))
    .y((eclipse) => y(props.valueOf(eclipse)))
  const arms = bySarosSeries(props.eclipses).flatMap(([saros, members]) => {
    const sorted = members.toSorted(
      (left, right) => left.fraction - right.fraction,
    )
    const runs: AtlasEclipse[][] = [[]]
    for (const [index, member] of sorted.entries()) {
      const previous = sorted[index - 1]
      const wraps =
        props.wrapAt !== undefined &&
        previous !== undefined &&
        Math.abs(props.valueOf(member) - props.valueOf(previous)) > props.wrapAt
      if (wraps) runs.push([])
      runs[runs.length - 1].push(member)
    }
    return runs
      .filter((run) => run.length > 1)
      .map((run, index) => ({
        key: `${saros}-${index}`,
        own: saros === PAPER_SAROS,
        d: draw(run) ?? '',
      }))
  })

  return (
    <svg
      aria-label={props.label}
      className={css.view}
      role='img'
      viewBox={`0 0 ${WIDTH} ${height}`}
    >
      <DecadeGrid bottom={top + props.inner} top={top} />
      {props.rows.map((row) => (
        <g key={row.text}>
          <line
            className={row.strong ? css.rowRuleStrong : css.grid}
            x1={GUTTER}
            x2={RIGHT}
            y1={y(row.at)}
            y2={y(row.at)}
          />
          <text className={css.rowName} x={GUTTER - 8} y={y(row.at) + 3.4}>
            {row.text}
          </text>
        </g>
      ))}
      {arms.map((arm) => (
        <path
          className={arm.own ? css.armOwn : css.arm}
          d={arm.d}
          key={arm.key}
        />
      ))}
      {props.eclipses.map((eclipse) =>
        passesFilters(eclipse, props.state) ? (
          <Mark
            cx={yearX(eclipse.fraction)}
            cy={y(props.valueOf(eclipse))}
            eclipse={eclipse}
            key={eclipse.id}
            onHover={props.onHover}
            onPin={props.onPin}
            r={3.4}
            selectedId={props.selectedId}
            state={props.state}
          />
        ) : null,
      )}
      <YearAxis y={height - 8} />
    </svg>
  )
}

const SPIRAL_SIZE = 640
const SPIRAL_INNER = 74
const SPIRAL_OUTER = 288
const HUB_RADIUS = SPIRAL_INNER - 22

/* The spiral hub holds the Earth the shadows fall on, as in the prototype. */
const HUB_PROJECTION = geoOrthographic()
  .rotate([10, -30])
  .translate([SPIRAL_SIZE / 2, SPIRAL_SIZE / 2])
  .scale(HUB_RADIUS)
  .clipAngle(90)
const HUB_LAND = geoPath(HUB_PROJECTION)(WORLD_LAND) ?? ''

const SpiralView: React.FC<MarkHandlers & { eclipses: AtlasEclipse[] }> = (
  props,
) => {
  const center = SPIRAL_SIZE / 2
  const radius = (fraction: number) =>
    SPIRAL_INNER +
    ((fraction - YEAR_SPAN[0]) / (YEAR_SPAN[1] - YEAR_SPAN[0])) *
      (SPIRAL_OUTER - SPIRAL_INNER)
  const angle = (fraction: number) => (fraction % 1) * 2 * Math.PI
  const px = (fraction: number) =>
    center + radius(fraction) * Math.sin(angle(fraction))
  const py = (fraction: number) =>
    center - radius(fraction) * Math.cos(angle(fraction))

  const draw = d3line<AtlasEclipse>()
    .curve(curveCatmullRom.alpha(0.6))
    .x((eclipse) => px(eclipse.fraction))
    .y((eclipse) => py(eclipse.fraction))
  const arms = bySarosSeries(props.eclipses).map(([saros, members]) => ({
    key: saros,
    own: saros === PAPER_SAROS,
    d:
      draw(members.toSorted((left, right) => left.fraction - right.fraction)) ??
      '',
  }))

  return (
    <svg
      aria-label='Radial saros spiral: the angle is the month, the radius is the year'
      className={css.view}
      role='img'
      viewBox={`0 0 ${SPIRAL_SIZE} ${SPIRAL_SIZE}`}
    >
      <circle className={css.hubSea} cx={center} cy={center} r={HUB_RADIUS} />
      <path className={css.hubLand} d={HUB_LAND} />
      <g className={css.grid}>
        {MONTH_LABELS.map((month, index) => {
          const spoke = (index / 12) * 2 * Math.PI
          const mid = ((index + 0.5) / 12) * 2 * Math.PI
          return (
            <g key={month}>
              <line
                x1={center + SPIRAL_INNER * Math.sin(spoke)}
                x2={center + SPIRAL_OUTER * Math.sin(spoke)}
                y1={center - SPIRAL_INNER * Math.cos(spoke)}
                y2={center - SPIRAL_OUTER * Math.cos(spoke)}
              />
              <text
                className={css.spiralMonth}
                x={center + (SPIRAL_OUTER + 18) * Math.sin(mid)}
                y={center - (SPIRAL_OUTER + 18) * Math.cos(mid) + 3}
              >
                {month}
              </text>
            </g>
          )
        })}
        {[1900, 1950, 2000, 2028].map((year) => (
          <g key={year}>
            <circle cx={center} cy={center} r={radius(year)} />
            <text
              className={css.spiralYear}
              x={center + 5}
              y={center - radius(year) - 4}
            >
              {year}
            </text>
          </g>
        ))}
      </g>
      {arms.map((arm) => (
        <path
          className={arm.own ? css.armOwn : css.arm}
          d={arm.d}
          key={arm.key}
        />
      ))}
      {props.eclipses.map((eclipse) =>
        passesFilters(eclipse, props.state) ? (
          <Mark
            cx={px(eclipse.fraction)}
            cy={py(eclipse.fraction)}
            eclipse={eclipse}
            key={eclipse.id}
            onHover={props.onHover}
            onPin={props.onPin}
            r={3.2}
            selectedId={props.selectedId}
            state={props.state}
          />
        ) : null,
      )}
    </svg>
  )
}

export const CALENDAR_BRIEF: Record<CalendarView, string> = {
  cells:
    'Inside a row the cells keep the same gap, forever. That fixed gap of 18 years is the saros.',
  latitude:
    'Every series is born near one pole and dies near the other. The white arm is 126, crossing Spain on its way north.',
  date: 'Every series slides 11 days later per cycle. The identical slope of every line is that fraction of the saros.',
  spiral:
    'Angle is the month, radius is the year, 1900 at the middle. Each arm is one series, and it curls because the saros adds 11 days a cycle.',
}

const LATITUDE_ROWS = [
  { at: 60, text: '60°N' },
  { at: 30, text: '30°N' },
  { at: 0, text: '0°', strong: true },
  { at: -30, text: '30°S' },
  { at: -60, text: '60°S' },
]

const DATE_ROWS = MONTH_LABELS.map((month, index) => ({
  at: (index * 365) / 12,
  text: month,
}))

const CenturyCalendar: React.FC<MarkHandlers & { eclipses: AtlasEclipse[] }> = (
  props,
) => {
  if (props.state.view === 'cells') return <CellsView {...props} />
  if (props.state.view === 'spiral') return <SpiralView {...props} />
  if (props.state.view === 'latitude') {
    return (
      <DriftView
        {...props}
        domain={[90, -90]}
        inner={300}
        label='Latitude drift of every saros series'
        rows={LATITUDE_ROWS}
        valueOf={(eclipse) => eclipse.midLatitude}
      />
    )
  }
  return (
    <DriftView
      {...props}
      domain={[0, 365]}
      inner={320}
      label='Date drift inside the year for every saros series'
      rows={DATE_ROWS}
      valueOf={(eclipse) => eclipse.dayOfYear}
      wrapAt={180}
    />
  )
}

export default CenturyCalendar
