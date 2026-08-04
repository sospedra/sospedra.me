import cn from 'clsx'
import { range } from 'es-toolkit'
import type { CSSProperties } from 'react'
import cloudCss from './cloud-field.module.css'
import columnCss from './column-field.module.css'
import css from './games.module.css'

type ColumnStyle = CSSProperties & {
  '--column-hue': string
  '--column-tone': string
  '--column-z': string
}

const COLUMN_COUNT = 14 * 8
const COLUMN_GAPS = new Set([39, 40, 45, 46, 47, 93, 94, 100, 101])
const COLUMNS = range(COLUMN_COUNT).map((index) => {
  const seed = ((index + 1) * 47 + 13) % 101
  const style: ColumnStyle = {
    '--column-hue': `${224 + (seed % 16)}`,
    '--column-tone': `${31 + (seed % 22)}%`,
    '--column-z': `${-1 - (seed % 20)}vw`,
  }

  return {
    gap: COLUMN_GAPS.has(index),
    id: `ps2-column-${index + 1}`,
    style,
  }
})

export function CloudField() {
  return (
    <div className={cn(cloudCss.cloud, css.cloud)} aria-hidden='true'>
      <svg
        className={cloudCss.cloudTexture}
        viewBox='0 0 1000 580'
        preserveAspectRatio='none'
        aria-hidden='true'
        focusable='false'
      >
        <filter
          id='games-cloud-noise'
          x='-15%'
          y='-20%'
          width='130%'
          height='140%'
          colorInterpolationFilters='sRGB'
        >
          <feTurbulence
            type='fractalNoise'
            baseFrequency='.006 .010'
            numOctaves='5'
            seed='23'
            stitchTiles='stitch'
            result='noise'
          />
          <feTurbulence
            type='fractalNoise'
            baseFrequency='.018 .026'
            numOctaves='3'
            seed='41'
            stitchTiles='stitch'
            result='fineNoise'
          />
          <feBlend
            in='noise'
            in2='fineNoise'
            mode='multiply'
            result='cloudNoise'
          />
          <feColorMatrix
            in='cloudNoise'
            type='matrix'
            values='0 0 0 0 0.10 0 0 0 0 0.27 0 0 0 0 0.92 1.55 0 0 0 -0.28'
          />
          <feGaussianBlur stdDeviation='.65' />
        </filter>
        <rect
          x='-50'
          y='-40'
          width='1100'
          height='660'
          filter='url(#games-cloud-noise)'
        />
      </svg>
      <span className={cloudCss.cloudCore} />
      <span className={cloudCss.cloudWisp} />
      <span className={cloudCss.cloudVeil} />
    </div>
  )
}

export function ColumnField() {
  return (
    <div
      className={cn(columnCss.columnViewport, css.columnViewport)}
      aria-hidden='true'
    >
      <div className={columnCss.columnGrid}>
        {COLUMNS.map((column) => (
          <span
            key={column.id}
            className={columnCss.columnCell}
            data-gap={column.gap ? 'true' : undefined}
          >
            <span className={columnCss.column} style={column.style}>
              <i className={columnCss.columnTop} />
              <i className={columnCss.columnBottom} />
              <i className={columnCss.columnLeft} />
              <i className={columnCss.columnRight} />
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
