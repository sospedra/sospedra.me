import type { KeyboardEvent, PointerEvent, RefObject } from 'react'
import css from './geo-map.module.css'
import type { GeoMapLabels } from './map-labels'
import {
  EQUATOR_PATH,
  GRATICULE_MERIDIANS,
  GRATICULE_PARALLELS,
  MAP_HEIGHT,
  MAP_WIDTH,
  WORLD_OUTLINE_PATH,
  type WorldPoint,
} from './map-projection'
import type { Viewport } from './map-viewport'
import type { GeoCoordinate } from './model'

export function MapPlot({
  answerPoint,
  descriptionId,
  disabled,
  handleKeyDown,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  labels,
  liveRegionId,
  releasePointer,
  segments,
  selectedCoordinate,
  selectedPoint,
  svgRef,
  viewBox,
  viewport,
}: {
  answerPoint: WorldPoint | null
  descriptionId: string
  disabled: boolean
  handleKeyDown: (event: KeyboardEvent<SVGSVGElement>) => void
  handlePointerDown: (event: PointerEvent<SVGSVGElement>) => void
  handlePointerMove: (event: PointerEvent<SVGSVGElement>) => void
  handlePointerUp: (event: PointerEvent<SVGSVGElement>) => void
  labels: GeoMapLabels
  liveRegionId: string
  releasePointer: (event: PointerEvent<SVGSVGElement>) => void
  segments: { from: WorldPoint; to: WorldPoint }[]
  selectedCoordinate: GeoCoordinate | null
  selectedPoint: WorldPoint | null
  svgRef: RefObject<SVGSVGElement | null>
  viewBox: { height: number; width: number; x: number; y: number }
  viewport: Viewport
}) {
  return (
    <svg
      ref={svgRef}
      className={css.mapCanvas}
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
      preserveAspectRatio='none'
      role='application'
      // biome-ignore lint/a11y/noNoninteractiveTabindex: the map is a single keyboard-operated application control
      tabIndex={0}
      aria-label={labels.map}
      aria-describedby={`${descriptionId} ${liveRegionId}`}
      aria-disabled={disabled}
      aria-keyshortcuts='ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight + - Home Enter'
      data-has-marker={Boolean(selectedCoordinate)}
      onKeyDown={handleKeyDown}
      onPointerCancel={releasePointer}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ touchAction: 'none' }}
    >
      <title>{labels.map}</title>
      <desc>{labels.instructions}</desc>

      <path className={css.mapOcean} d={WORLD_OUTLINE_PATH} />
      <image
        className={css.mapLand}
        href='/games/geo/assets/map/world-map.svg'
        width={MAP_WIDTH}
        height={MAP_HEIGHT}
        preserveAspectRatio='none'
      />

      <g className={css.mapGrid}>
        {GRATICULE_MERIDIANS.map((meridian) => (
          <path key={`meridian-${meridian.id}`} d={meridian.d} />
        ))}
        {GRATICULE_PARALLELS.map((parallel) => (
          <path key={`parallel-${parallel.id}`} d={parallel.d} />
        ))}
        <path className={css.mapEquator} d={EQUATOR_PATH} />
      </g>

      {segments.length > 0 && (
        <g className={css.mapConnection}>
          {segments.map((segment) => (
            <line
              key={`${segment.from.x}:${segment.from.y}-${segment.to.x}:${segment.to.y}`}
              x1={segment.from.x}
              y1={segment.from.y}
              x2={segment.to.x}
              y2={segment.to.y}
              vectorEffect='non-scaling-stroke'
            />
          ))}
        </g>
      )}

      {selectedPoint && (
        <g
          className={css.mapSelectedMarker}
          transform={`translate(${selectedPoint.x} ${selectedPoint.y}) scale(${
            1 / viewport.zoom
          })`}
        >
          <circle className={css.mapMarkerPulse} r={16} />
          <circle className={css.mapMarkerRing} r={9} />
          <circle className={css.mapMarkerCore} r={3.5} />
        </g>
      )}

      {answerPoint && (
        <g
          className={css.mapAnswerMarker}
          transform={`translate(${answerPoint.x} ${answerPoint.y}) scale(${
            1 / viewport.zoom
          })`}
        >
          <circle r={10} />
          <path d='M -15 0 H 15 M 0 -15 V 15' />
          <circle className={css.mapAnswerCore} r={3} />
        </g>
      )}
    </svg>
  )
}
