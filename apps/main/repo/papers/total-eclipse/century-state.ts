import {
  type AtlasEclipse,
  CATALOGUE_FIRST_YEAR,
  CATALOGUE_LAST_YEAR,
  type EclipseKind,
} from './eclipse-atlas.ts'

export type CalendarView = 'cells' | 'latitude' | 'date' | 'spiral'

export const CALENDAR_VIEWS: CalendarView[] = [
  'spiral',
  'cells',
  'latitude',
  'date',
]

export type CenturyState = {
  kinds: Record<EclipseKind, boolean>
  /** Country code the shadow had to reach, or null for the whole world. */
  country: string | null
  range: [number, number]
  hovered: number | null
  pinned: number | null
  view: CalendarView
}

export type CenturyEvent =
  | { type: 'kind'; kind: EclipseKind }
  | { type: 'country'; code: string | null }
  | { type: 'range'; range: [number, number] }
  | { type: 'clearRange' }
  | { type: 'hover'; id: number | null }
  | { type: 'pin'; id: number }
  | { type: 'view'; view: CalendarView }

export const FULL_RANGE: [number, number] = [
  CATALOGUE_FIRST_YEAR,
  CATALOGUE_LAST_YEAR,
]

export const initialCenturyState: CenturyState = {
  kinds: { T: true, A: true, H: true },
  country: null,
  range: FULL_RANGE,
  hovered: null,
  pinned: null,
  view: 'spiral',
}

export const centuryReducer = (
  state: CenturyState,
  event: CenturyEvent,
): CenturyState => {
  switch (event.type) {
    case 'kind': {
      const kinds = { ...state.kinds, [event.kind]: !state.kinds[event.kind] }
      return { ...state, kinds, pinned: null }
    }
    case 'country':
      if (event.code === state.country) return state
      return { ...state, country: event.code, pinned: null }
    case 'range':
      return { ...state, range: event.range, pinned: null }
    case 'clearRange':
      /* Resetting the years must not unpin: a click on a mark both pins that
         eclipse and clears the brush, and the pin has to survive. */
      return { ...state, range: FULL_RANGE }
    case 'hover':
      return state.hovered === event.id
        ? state
        : { ...state, hovered: event.id }
    case 'pin':
      return {
        ...state,
        pinned: state.pinned === event.id ? null : event.id,
        hovered: event.id,
      }
    case 'view':
      return state.view === event.view ? state : { ...state, view: event.view }
  }
}

/** The kind and country filters drive the marks; the year range only the map. */
export const passesFilters = (
  eclipse: AtlasEclipse,
  state: CenturyState,
): boolean =>
  state.kinds[eclipse.kind] &&
  (state.country === null || eclipse.countries.includes(state.country))

export const isVisible = (
  eclipse: AtlasEclipse,
  state: CenturyState,
): boolean =>
  passesFilters(eclipse, state) &&
  eclipse.year >= state.range[0] &&
  eclipse.year <= state.range[1]

export const selectedId = (
  state: CenturyState,
  fallback: number | null,
): number | null => state.pinned ?? state.hovered ?? fallback
