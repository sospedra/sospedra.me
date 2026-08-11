'use client'

import cn from 'clsx'
import type React from 'react'
import { useMemo, useReducer } from 'react'
import css from './century-atlas.module.css'
import { ECLIPSES, PAPER_ID } from './century-catalogue.ts'
import { CountryFilter, countryLabel, KindFilters } from './century-filters.tsx'
import CenturyMap from './century-map.tsx'
import {
  centuryReducer,
  initialCenturyState,
  isVisible,
  selectedId,
} from './century-state.ts'
import CenturyTimeline from './century-timeline.tsx'
import {
  type AtlasEclipse,
  formatEclipseDate,
  KIND_COLOR,
  KIND_NAME,
} from './eclipse-atlas.ts'
import chrome from './figure.module.css'

const AtlasReadout: React.FC<{
  selected: AtlasEclipse | null
  disabled: boolean
  onStep: (direction: number) => void
}> = (props) => {
  const { selected } = props
  return (
    <div className={css.readout}>
      <div>
        <p className={css.date}>
          {selected ? formatEclipseDate(selected.date) : '—'}
        </p>
        <p
          className={css.kind}
          style={{ color: selected ? KIND_COLOR[selected.kind] : undefined }}
        >
          {selected
            ? `${KIND_NAME[selected.kind]} · saros ${selected.saros}`
            : 'nothing selected'}
        </p>
        <p className={css.reached}>
          {selected && selected.countries.length > 0
            ? `reached ${selected.countries.join(' ')}`
            : 'reached none of the nine'}
        </p>
      </div>
      <div className={css.stepper}>
        <button
          className={chrome.nav}
          disabled={props.disabled}
          onClick={() => props.onStep(-1)}
          type='button'
        >
          ‹ earlier
        </button>
        <button
          className={chrome.nav}
          disabled={props.disabled}
          onClick={() => props.onStep(1)}
          type='button'
        >
          later ›
        </button>
      </div>
    </div>
  )
}

const CenturyAtlasFigure: React.FC = () => {
  const [state, dispatch] = useReducer(centuryReducer, initialCenturyState)

  const visible = useMemo(
    () => ECLIPSES.filter((eclipse) => isVisible(eclipse, state)),
    [state],
  )
  const current = selectedId(state, PAPER_ID)
  const selected = current === null ? null : (ECLIPSES[current] ?? null)
  const onMap = selected && isVisible(selected, state) ? selected : null

  const step = (direction: number) => {
    if (visible.length === 0) return
    const at = visible.findIndex((eclipse) => eclipse.id === selected?.id)
    const next = visible[(at + direction + visible.length) % visible.length]
    dispatch({ type: 'pin', id: next.id })
  }

  return (
    <section className={cn(chrome.figure, chrome.bleed)}>
      <div className={chrome.card}>
        <div className={chrome.head}>
          <span className={chrome.label}>
            fig 01 · a century of shadows, 1900 to 2028
          </span>
          <span className={chrome.count}>
            {`${visible.length} of ${ECLIPSES.length} · ${state.range[0]}–${state.range[1]}`}
          </span>
        </div>

        <div className={chrome.body}>
          <p className={chrome.brief}>
            Every central solar eclipse of the century, one line per shadow,
            drawn on its center line. Somewhere on Earth the moon covers the sun
            completely about every eighteen months.{' '}
            <strong>Rare means the shadow visits you.</strong> Pick a country
            and the map keeps only the shadows that reached its ground.
          </p>

          <div className={chrome.controls}>
            <KindFilters dispatch={dispatch} state={state} />
            <CountryFilter dispatch={dispatch} state={state} />
          </div>

          <CenturyMap
            eclipses={ECLIPSES}
            onHover={(id) => dispatch({ type: 'hover', id })}
            onPin={(id) => dispatch({ type: 'pin', id })}
            selected={onMap}
            state={state}
          />

          <CenturyTimeline
            eclipses={ECLIPSES}
            onClearRange={() => dispatch({ type: 'clearRange' })}
            onHover={(id) => dispatch({ type: 'hover', id })}
            onPin={(id) => dispatch({ type: 'pin', id })}
            onRange={(range) => dispatch({ type: 'range', range })}
            selectedId={onMap?.id ?? null}
            state={state}
          />

          <AtlasReadout
            disabled={visible.length === 0}
            onStep={step}
            selected={selected}
          />

          <p className={chrome.note}>
            {`Filtered to ${countryLabel(state.country)}. Drag the timeline to narrow the years, click it to reset. A country counts when the umbra reached its ground, not when the center line passed nearby.`}
          </p>
        </div>
      </div>
    </section>
  )
}

export default CenturyAtlasFigure
