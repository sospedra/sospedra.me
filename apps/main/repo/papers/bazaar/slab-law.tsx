'use client'

import type React from 'react'
import { useState } from 'react'
import { tapHaptic } from 'services/haptics'
import css from './slab-law.module.css'

const RISE = 81
const LAW_RUN = 68
const LAW_DEG = (Math.atan2(RISE, LAW_RUN) * 180) / Math.PI
const TOLERANCE_DEG = 0.4

const TOP = 58
const BASE = TOP + RISE
const FRONT = BASE + 62
const LEFT = 10
const RIGHT = 350
const CHECKPOINT_ROWS = [20, 40, 60, 80]

const insetFor = (deg: number) => RISE / Math.tan((deg * Math.PI) / 180)

const slabPoints = (inset: number) =>
  `${LEFT},${BASE} ${LEFT + inset},${TOP} ${RIGHT - inset},${TOP} ${RIGHT},${BASE}`

const checkpoints = (inset: number) =>
  CHECKPOINT_ROWS.flatMap((rows) => {
    const dx = (inset * rows) / RISE
    return [
      { key: `l${rows}`, x: LEFT + dx, y: BASE - rows },
      { key: `r${rows}`, x: RIGHT - dx, y: BASE - rows },
    ]
  })

const SlabLaw: React.FC<{ label: string }> = (props) => {
  const [deg, setDeg] = useState(62)
  const inset = insetFor(deg)
  const pass = Math.abs(deg - LAW_DEG) < TOLERANCE_DEG
  const stroke = pass ? 'var(--color-signal-cyan, #6df7ea)' : '#ff5ea8'

  return (
    <section aria-label={props.label} className={css.slab}>
      <div className={css.head}>
        <span className={css.label}>{props.label}</span>
        <button
          className={css.snap}
          onClick={() => {
            tapHaptic()
            setDeg(Number(LAW_DEG.toFixed(1)))
          }}
          type='button'
        >
          snap to law
        </button>
      </div>
      <svg
        aria-label={`slab construction at ${deg.toFixed(1)} degrees`}
        className={css.stage}
        role='img'
        viewBox='0 0 360 236'
      >
        <rect
          fill='#1d1526'
          height={FRONT - BASE}
          stroke='rgb(255 255 255 / 22%)'
          width={RIGHT - LEFT}
          x={LEFT}
          y={BASE}
        />
        <polygon
          fill='none'
          points={slabPoints(LAW_RUN)}
          stroke='#58e08d'
          strokeDasharray='5 4'
        />
        <polygon
          fill='rgb(109 247 234 / 12%)'
          points={slabPoints(inset)}
          stroke={stroke}
          strokeWidth='2'
        />
        {checkpoints(inset).map((dot) => (
          <circle cx={dot.x} cy={dot.y} fill='#58e08d' key={dot.key} r='2.4' />
        ))}
        <text className={css.corner} x={LEFT + 10} y={BASE - 8}>
          {deg.toFixed(1)}°
        </text>
        <text className={css.corner} x={LEFT + 10} y={TOP + 16}>
          {(180 - deg).toFixed(1)}°
        </text>
      </svg>
      <div className={css.controls}>
        <label className={css.slider}>
          side slope
          <input
            max='70'
            min='40'
            onChange={(event) => setDeg(Number(event.target.value))}
            step='0.1'
            type='range'
            value={deg}
          />
        </label>
        <span className={css.measure}>
          sides {Math.round(inset)}:{RISE}
        </span>
        <span className={css.verdict} data-pass={pass ? 'true' : 'false'}>
          {pass
            ? 'law pass · 68:81, coprime on purpose'
            : `reject · you drew ${deg.toFixed(1)}°, the law is 50.0°`}
        </span>
      </div>
    </section>
  )
}

export default SlabLaw
