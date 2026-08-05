'use client'

import { useRef } from 'react'
import { useStoreSelector } from 'services/external-store'
import { type Regime, regimeAt, STAGE_MAX } from '../decor'
import { stageSimStore } from '../decor-store'
import { stageBox } from '../stage'
import css from './editor.module.css'
import { Scrub } from './fields'
import { stageSizeStore } from './store'

const BANDS: { regime: Regime; from: number; to: number }[] = [
  { regime: 'm', from: 0, to: 700 },
  { regime: 'b', from: 700, to: 1690 },
  { regime: 'a', from: 1690, to: 2560 },
  { regime: 'w', from: 2560, to: STAGE_MAX },
]

const PRESETS = [390, 768, 1024, 1366, 1690, 1920, 2560, 3440, STAGE_MAX]

const SIM_MIN = 320

const clampSim = (value: number) =>
  Math.round(Math.min(STAGE_MAX, Math.max(SIM_MIN, value)))

/** the regime ruler: scrub the real stage through M/B/A/W, live */
export default function Ruler() {
  const size = useStoreSelector(stageSizeStore, (value) => value)
  const sim = useStoreSelector(stageSimStore, (value) => value)
  const trackRef = useRef<HTMLDivElement>(null)
  const regime = regimeAt(size.w)
  const scale = stageBox().scale

  const setFromPoint = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    stageSimStore.set(clampSim(ratio * STAGE_MAX))
  }

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    setFromPoint(event.clientX)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.buttons === 1) setFromPoint(event.clientX)
  }

  return (
    <div className={css.ruler}>
      <div className={css.rulerTop}>
        <span className={css.regimeBadge}>{regime.toUpperCase()}</span>
        <span className={css.stageReadout}>
          stage{' '}
          <b>
            {size.w}×{size.h}
          </b>
          {scale < 1 && <> · preview ×{scale.toFixed(2)}</>}
        </span>
        <Scrub
          label='w'
          value={size.w}
          step={2}
          min={SIM_MIN}
          max={STAGE_MAX}
          precision={0}
          onLive={(value) => stageSimStore.set(clampSim(value))}
          onCommit={(value) => stageSimStore.set(clampSim(value))}
        />
      </div>
      <div
        ref={trackRef}
        className={css.track}
        role='slider'
        aria-label='stage width'
        aria-valuemin={SIM_MIN}
        aria-valuemax={STAGE_MAX}
        aria-valuenow={size.w}
        tabIndex={-1}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
      >
        {BANDS.map((band) => (
          <div
            key={band.regime}
            className={css.bandSeg}
            data-active={band.regime === regime || undefined}
            style={{ width: `${((band.to - band.from) / STAGE_MAX) * 100}%` }}
          >
            {band.regime.toUpperCase()}
          </div>
        ))}
        <div
          className={css.caret}
          style={{
            left: `${(Math.min(size.w, STAGE_MAX) / STAGE_MAX) * 100}%`,
          }}
        />
      </div>
      <div className={css.ticks}>
        {[700, 1690, 2560].map((boundary) => (
          <span
            key={boundary}
            className={css.tick}
            style={{ left: `${(boundary / STAGE_MAX) * 100}%` }}
          >
            {boundary}
          </span>
        ))}
      </div>
      <div className={css.presets}>
        <button
          type='button'
          className={css.chip}
          data-on={sim === null || undefined}
          onClick={() => stageSimStore.set(null)}
        >
          OFF
        </button>
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type='button'
            className={css.chip}
            data-on={sim === preset || undefined}
            onClick={() => stageSimStore.set(preset)}
          >
            {preset}
          </button>
        ))}
      </div>
    </div>
  )
}
