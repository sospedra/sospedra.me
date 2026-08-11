'use client'

import type React from 'react'
import { useMemo, useRef } from 'react'
import worldLand from './data/world/land.json'
import worldOverlays from './data/world/overlays.json'
import type { EclipseSite } from './eclipse-countries.ts'
import { formatClockMinutes } from './local-format.ts'
import type { CenterLinePoint } from './umbra-field.ts'
import { type PickHandler, useWorldGestures } from './use-world-gestures.ts'
import css from './world-map.module.css'
import {
  toWorldPoint,
  VIEW_WIDTH,
  viewBoxFor,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  WORLD_WINDOW,
} from './world-viewport.ts'

type LonLatRing = [number, number][]

const ringsToPath = (rings: LonLatRing[]): string =>
  rings
    .map(
      (ring) =>
        `M${ring
          .map(([lon, lat]) => {
            const point = toWorldPoint(lon, lat)
            return `${point.x.toFixed(1)},${point.y.toFixed(1)}`
          })
          .join('L')}Z`,
    )
    .join('')

/* Mercator draws graticule lines straight, so two points per line suffice. */
const graticulePath = (): string => {
  const meridians = []
  for (let lon = -140; lon <= 160; lon += 10) {
    const top = toWorldPoint(lon, WORLD_WINDOW.north)
    const bottom = toWorldPoint(lon, WORLD_WINDOW.south)
    meridians.push(
      `M${top.x.toFixed(1)},${top.y.toFixed(1)}L${bottom.x.toFixed(1)},${bottom.y.toFixed(1)}`,
    )
  }
  for (let lat = 10; lat <= 80; lat += 10) {
    const left = toWorldPoint(WORLD_WINDOW.west, lat)
    const right = toWorldPoint(WORLD_WINDOW.east, lat)
    meridians.push(
      `M${left.x.toFixed(1)},${left.y.toFixed(1)}L${right.x.toFixed(1)},${right.y.toFixed(1)}`,
    )
  }
  return meridians.join('')
}

const LAND_PATH = ringsToPath(worldLand.rings as LonLatRing[])
const GRATICULE_PATH = graticulePath()
const BAND_PATH = ringsToPath(worldOverlays.band as LonLatRing[])

type Isoline = { level: number; rings: LonLatRing[] }

const ISOLINES = (worldOverlays.isolines as Isoline[]).map((isoline) => ({
  level: isoline.level,
  d: ringsToPath(isoline.rings),
  anchor: isoline.rings
    .flat()
    .filter(([, lat]) => lat > 12 && lat < 82)
    .reduce((best, point) => (point[0] < best[0] ? point : best)),
}))

const TICK_INTERVAL_S = 1200

export type WorldSite = EclipseSite & { total: boolean }

const SITE_DOT_ZOOM = 2.6
const SITE_LABEL_ZOOM = 4.4
const TICK_LABEL_ZOOM = 2.2

const WorldMap: React.FC<{
  line: CenterLinePoint[]
  sites: WorldSite[]
  marker: { latitude: number; longitude: number }
  driveTo: { latitude: number; longitude: number } | null
  onPick: PickHandler
  onPickSite: (site: EclipseSite) => void
}> = (props) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const gestures = useWorldGestures(svgRef, props.onPick)
  const viewBox = viewBoxFor(gestures.viewport)
  /* World units per on-screen pixel: marks counter-scale by it. */
  const perPixel = viewBox.width / VIEW_WIDTH
  const zoom = gestures.viewport.zoom

  const linePath = useMemo(
    () =>
      `M${props.line
        .map((point) => {
          const at = toWorldPoint(point.longitude, point.latitude)
          return `${at.x.toFixed(1)},${at.y.toFixed(1)}`
        })
        .join('L')}`,
    [props.line],
  )
  const ticks = useMemo(
    () => props.line.filter((point) => point.seconds % TICK_INTERVAL_S === 0),
    [props.line],
  )

  const markerAt = toWorldPoint(props.marker.longitude, props.marker.latitude)
  const driveAt = props.driveTo
    ? toWorldPoint(props.driveTo.longitude, props.driveTo.latitude)
    : null

  return (
    <div className={css.stage}>
      <svg
        aria-label='Draggable world map of the 12 August 2026 eclipse: the yellow band is totality, dashed lines are maximum obscuration. Drag to move, pinch or use the buttons to zoom, tap to read a spot.'
        className={css.map}
        onKeyDown={gestures.onKeyDown}
        onPointerCancel={gestures.onPointerUp}
        onPointerDown={gestures.onPointerDown}
        onPointerMove={gestures.onPointerMove}
        onPointerUp={gestures.onPointerUp}
        preserveAspectRatio='xMidYMid slice'
        ref={svgRef}
        role='application'
        // biome-ignore lint/a11y/noNoninteractiveTabindex: the map is a single keyboard-operated application control
        tabIndex={0}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
      >
        <rect
          className={css.sea}
          height={WORLD_HEIGHT}
          width={WORLD_WIDTH}
          x={0}
          y={0}
        />
        <path className={css.graticule} d={GRATICULE_PATH} />
        <path className={css.land} d={LAND_PATH} />

        {ISOLINES.map((isoline) => {
          const at = toWorldPoint(isoline.anchor[0], isoline.anchor[1])
          return (
            <g key={isoline.level}>
              <path className={css.isoline} d={isoline.d} />
              <text
                className={css.isolineLabel}
                transform={`translate(${at.x - 3 * perPixel},${at.y + 3 * perPixel}) scale(${perPixel})`}
              >
                {`${Math.round(isoline.level * 100)}%`}
              </text>
            </g>
          )
        })}

        {/* The strip wraps the pole, so its contour is exterior plus hole:
            evenodd keeps the hole open regardless of winding. */}
        <path className={css.band} d={BAND_PATH} fillRule='evenodd' />
        <path className={css.centerLine} d={linePath} />

        {ticks.map((tick) => {
          const at = toWorldPoint(tick.longitude, tick.latitude)
          return (
            <g
              key={tick.seconds}
              transform={`translate(${at.x},${at.y}) scale(${perPixel})`}
            >
              <circle className={css.tick} r={2.4} />
              {zoom >= TICK_LABEL_ZOOM ? (
                <text className={css.tickLabel} x={6} y={-4}>
                  {`${formatClockMinutes(tick.seconds, 'UTC')} UT`}
                </text>
              ) : null}
            </g>
          )
        })}

        {zoom >= SITE_DOT_ZOOM
          ? props.sites.map((site) => {
              const at = toWorldPoint(site.longitude, site.latitude)
              return (
                <g
                  className={css.site}
                  key={site.name}
                  onPointerUp={(event) => {
                    event.stopPropagation()
                    props.onPickSite(site)
                  }}
                  transform={`translate(${at.x},${at.y}) scale(${perPixel})`}
                >
                  <circle
                    className={site.total ? css.siteTotal : css.sitePartial}
                    r={3.4}
                  />
                  {zoom >= SITE_LABEL_ZOOM ? (
                    <text className={css.siteLabel} x={6} y={3.2}>
                      {site.name}
                    </text>
                  ) : null}
                </g>
              )
            })
          : null}

        {driveAt ? (
          <g
            className={css.drive}
            transform={`translate(${driveAt.x},${driveAt.y}) scale(${perPixel})`}
          >
            <circle r={5} />
          </g>
        ) : null}

        <g
          className={css.marker}
          transform={`translate(${markerAt.x},${markerAt.y}) scale(${perPixel})`}
        >
          <circle r={7.5} />
          <circle className={css.markerCore} r={1.7} />
        </g>
      </svg>

      <div className={css.zoomRail}>
        <button
          aria-label='Zoom in'
          className={css.zoomButton}
          onClick={() => gestures.zoomBy(1.6)}
          type='button'
        >
          +
        </button>
        <button
          aria-label='Zoom out'
          className={css.zoomButton}
          onClick={() => gestures.zoomBy(1 / 1.6)}
          type='button'
        >
          −
        </button>
        <button
          aria-label='Reset the view to the band'
          className={css.zoomButton}
          onClick={gestures.reset}
          type='button'
        >
          ⌂
        </button>
      </div>
    </div>
  )
}

export default WorldMap
