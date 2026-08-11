'use client'

import { geoEqualEarth, geoGraticule10, geoPath } from 'd3-geo'
import type React from 'react'
import { useMemo, useRef } from 'react'
import css from './century-map.module.css'
import type { CenturyState } from './century-state.ts'
import { isVisible } from './century-state.ts'
import {
  type AtlasEclipse,
  formatEclipseDate,
  KIND_COLOR,
  KIND_NAME,
} from './eclipse-atlas.ts'
import { WORLD_LAND } from './world-land.ts'

const WIDTH = 660
const HEIGHT = 348

const projection = geoEqualEarth().fitExtent(
  [
    [6, 6],
    [WIDTH - 6, HEIGHT - 6],
  ],
  { type: 'Sphere' },
)
const path = geoPath(projection)

const SPHERE = path({ type: 'Sphere' }) ?? ''
const GRATICULE = path(geoGraticule10()) ?? ''
const LAND = path(WORLD_LAND) ?? ''

const CenturyMap: React.FC<{
  eclipses: AtlasEclipse[]
  state: CenturyState
  selected: AtlasEclipse | null
  onHover: (id: number | null) => void
  onPin: (id: number) => void
}> = (props) => {
  /* The tooltip follows the pointer, so it stays hidden until one arrives. */
  const stageRef = useRef<HTMLDivElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)

  const tracks = useMemo(
    () =>
      props.eclipses.map((eclipse) => ({
        eclipse,
        d: path({ type: 'LineString', coordinates: eclipse.path }) ?? '',
      })),
    [props.eclipses],
  )

  const selectedId = props.selected?.id ?? null

  const moveTip = (event: React.PointerEvent) => {
    const stage = stageRef.current
    const tip = tipRef.current
    if (!stage || !tip) return
    const rect = stage.getBoundingClientRect()
    tip.style.left = `${Math.min(event.clientX - rect.left + 14, rect.width - 176)}px`
    tip.style.top = `${event.clientY - rect.top + 14}px`
  }

  return (
    <div className={css.stage} ref={stageRef}>
      <svg
        aria-label='Equal Earth world map with the center line of every central solar eclipse between 1900 and 2028'
        className={css.map}
        onPointerLeave={() => props.onHover(null)}
        role='img'
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      >
        <path className={css.sphere} d={SPHERE} />
        <path className={css.graticule} d={GRATICULE} />
        <path className={css.land} d={LAND} />
        <g className={css.tracks}>
          {tracks.map(({ eclipse, d }) => {
            if (!isVisible(eclipse, props.state)) return null
            const active = eclipse.id === selectedId
            return (
              <g
                key={eclipse.id}
                onPointerEnter={() => props.onHover(eclipse.id)}
                onPointerMove={moveTip}
                onPointerUp={() => props.onPin(eclipse.id)}
              >
                <path
                  className={css.track}
                  d={d}
                  data-active={active}
                  data-dim={selectedId !== null && !active}
                  stroke={active ? '#ffffff' : KIND_COLOR[eclipse.kind]}
                />
                <path className={css.hit} d={d} />
              </g>
            )
          })}
        </g>
      </svg>
      <div
        className={css.tip}
        data-shown={props.state.hovered !== null && props.selected !== null}
        ref={tipRef}
      >
        {props.selected ? (
          <>
            <b>{formatEclipseDate(props.selected.date)}</b>
            <span style={{ color: KIND_COLOR[props.selected.kind] }}>
              {`${KIND_NAME[props.selected.kind]} · saros ${props.selected.saros}`}
            </span>
          </>
        ) : null}
      </div>
    </div>
  )
}

export default CenturyMap
