'use client'

import { minBy } from 'es-toolkit'
import type React from 'react'
import { useState } from 'react'
import css from './palette-clamp.module.css'

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i

const isHexColor = (value: string) => HEX_COLOR_PATTERN.test(value)

const hexToRgb = (hex: string) => {
  const value = Number.parseInt(hex.slice(1), 16)
  return [value >> 16, (value >> 8) & 255, value & 255] as const
}

const distance = (a: string, b: string) => {
  const [r1, g1, b1] = hexToRgb(a)
  const [r2, g2, b2] = hexToRgb(b)
  return (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2
}

const nearestOf = (hex: string, pool: string[]) =>
  minBy(pool, (candidate) => distance(hex, candidate)) ?? hex

const PaletteClamp: React.FC<{
  label: string
  before: string[]
  after: string[]
  scopes?: Record<string, string>
}> = (props) => {
  const [clamped, setClamped] = useState(false)

  const before = props.before.filter(isHexColor)
  const after = props.after.filter(isHexColor)
  const merges = Object.fromEntries(
    before.map((hex) => [hex, nearestOf(hex, after)]),
  )
  const added = after.filter((hex) => !before.includes(hex))
  const chips = clamped ? [...before, ...added] : before

  return (
    <section aria-label={props.label} className={css.palette}>
      <div className={css.head}>
        <span className={css.label}>{props.label}</span>
        <span aria-hidden='true' className={css.count}>
          {clamped
            ? `${after.length} colors survive`
            : `${before.length} colors sampled`}
        </span>
        <span className={css.toggle}>
          <button
            aria-pressed={!clamped}
            className={css.mode}
            onClick={() => setClamped(false)}
            type='button'
          >
            sampled {before.length}
          </button>
          <button
            aria-pressed={clamped}
            className={css.mode}
            onClick={() => setClamped(true)}
            type='button'
          >
            clamped {after.length}
          </button>
        </span>
      </div>
      <div className={css.grid}>
        {chips.map((hex) => {
          const isAdded = clamped && !before.includes(hex)
          const target = clamped && !isAdded ? merges[hex] : hex
          const isStray = clamped && target !== hex
          const scope = clamped ? props.scopes?.[target] : undefined
          return (
            <span
              className={css.chip}
              data-added={isAdded ? 'true' : 'false'}
              data-stray={isStray ? 'true' : 'false'}
              key={hex}
              title={isStray ? `${hex} merges into ${target}` : hex}
            >
              <span className={css.swatch} style={{ background: target }} />
              <span className={css.hex}>{hex}</span>
              {isAdded ? <span className={css.scope}>added by law</span> : null}
              {scope ? <span className={css.scope}>{scope}</span> : null}
            </span>
          )
        })}
      </div>
    </section>
  )
}

export default PaletteClamp
