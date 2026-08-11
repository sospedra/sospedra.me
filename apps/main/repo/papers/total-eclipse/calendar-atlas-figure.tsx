'use client'

import cn from 'clsx'
import type React from 'react'
import { useMemo, useReducer } from 'react'
import css from './century-atlas.module.css'
import CenturyCalendar, { CALENDAR_BRIEF } from './century-calendar.tsx'
import { ECLIPSES, PAPER_ID } from './century-catalogue.ts'
import { CountryFilter, countryLabel, KindFilters } from './century-filters.tsx'
import {
  CALENDAR_VIEWS,
  type CalendarView,
  centuryReducer,
  initialCenturyState,
  passesFilters,
  selectedId,
} from './century-state.ts'
import {
  bySarosSeries,
  formatEclipseDate,
  KIND_NAME,
  PAPER_SAROS,
} from './eclipse-atlas.ts'
import chrome from './figure.module.css'

const VIEW_NAMES: Record<CalendarView, string> = {
  cells: 'cells',
  latitude: 'latitude',
  date: 'date',
  spiral: 'spiral',
}

const CalendarAtlasFigure: React.FC = () => {
  const [state, dispatch] = useReducer(centuryReducer, initialCenturyState)

  const filtered = useMemo(
    () => ECLIPSES.filter((eclipse) => passesFilters(eclipse, state)),
    [state],
  )
  const current = selectedId(state, PAPER_ID)
  const selected = current === null ? null : (ECLIPSES[current] ?? null)
  const seriesCount = useMemo(() => bySarosSeries(filtered).length, [filtered])

  return (
    <section className={cn(chrome.figure, chrome.bleed)}>
      <div className={chrome.card}>
        <div className={chrome.head}>
          <span className={chrome.label}>fig 03 · the saros calendar</span>
          <span className={chrome.count}>
            {selected
              ? `${formatEclipseDate(selected.date)} · ${KIND_NAME[selected.kind]} · saros ${selected.saros}`
              : `${seriesCount} series`}
          </span>
        </div>

        <div className={chrome.body}>
          <p className={chrome.brief}>
            Four readings of one catalogue: a cell per eclipse by series, the
            latitude each shadow crossed, the date it fell on inside the year,
            and every series as an arm of one spiral.{' '}
            <strong>
              Series {PAPER_SAROS} runs from May 1900 to August 2026.
            </strong>{' '}
            Spain did not get lucky twice. Spain got the same eclipse back.
          </p>

          <div className={chrome.controls}>
            <KindFilters dispatch={dispatch} state={state} />
            <CountryFilter dispatch={dispatch} state={state} />
          </div>

          <div className={chrome.controls}>
            {CALENDAR_VIEWS.map((view) => (
              <button
                aria-pressed={state.view === view}
                className={chrome.chip}
                key={view}
                onClick={() => dispatch({ type: 'view', view })}
                type='button'
              >
                {VIEW_NAMES[view]}
              </button>
            ))}
          </div>

          <p className={css.watch}>{CALENDAR_BRIEF[state.view]}</p>

          <CenturyCalendar
            eclipses={filtered}
            onHover={(id) => dispatch({ type: 'hover', id })}
            onPin={(id) => dispatch({ type: 'pin', id })}
            selectedId={selected?.id ?? null}
            state={state}
          />

          <p className={chrome.note}>
            {`Filtered to ${countryLabel(state.country)}. The white arm is series ${PAPER_SAROS}. Hover a mark to name its eclipse.`}
          </p>
        </div>
      </div>
    </section>
  )
}

export default CalendarAtlasFigure
