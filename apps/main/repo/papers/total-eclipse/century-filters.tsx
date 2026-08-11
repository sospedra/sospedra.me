'use client'

import type React from 'react'
import type { CenturyEvent, CenturyState } from './century-state.ts'
import { type EclipseKind, KIND_COLOR, KIND_NAME } from './eclipse-atlas.ts'
import { ECLIPSE_COUNTRIES } from './eclipse-countries.ts'
import chrome from './figure.module.css'

export type Dispatch = (event: CenturyEvent) => void

const KINDS: EclipseKind[] = ['T', 'A', 'H']

export const KindFilters: React.FC<{
  state: CenturyState
  dispatch: Dispatch
}> = (props) => (
  <>
    {KINDS.map((kind) => (
      <button
        aria-pressed={props.state.kinds[kind]}
        className={chrome.chip}
        key={kind}
        onClick={() => props.dispatch({ type: 'kind', kind })}
        type='button'
      >
        <span className={chrome.dot} style={{ background: KIND_COLOR[kind] }} />
        {KIND_NAME[kind]}
      </button>
    ))}
  </>
)

export const CountryFilter: React.FC<{
  state: CenturyState
  dispatch: Dispatch
}> = (props) => (
  <label className={chrome.pickerLabel}>
    visited
    <select
      className={chrome.picker}
      onChange={(event) =>
        props.dispatch({
          type: 'country',
          code: event.target.value === '' ? null : event.target.value,
        })
      }
      value={props.state.country ?? ''}
    >
      <option value=''>anywhere</option>
      {ECLIPSE_COUNTRIES.map((entry) => (
        <option key={entry.code} value={entry.code}>
          {entry.name}
        </option>
      ))}
    </select>
  </label>
)

export const countryLabel = (code: string | null): string =>
  ECLIPSE_COUNTRIES.find((entry) => entry.code === code)?.name ?? 'anywhere'
