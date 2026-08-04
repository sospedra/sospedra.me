import { useCallback, useEffect, useReducer } from 'react'
import {
  fetchVisitorLocation,
  type VisitorLocation,
} from 'services/visitor-location'
import { match } from 'ts-pattern'
import type { Visitor } from './destinations'
import { formatCoords, formatCountry } from './travel-format'

export type UplinkState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'located'; visitor: Visitor }
  | { status: 'unavailable' }

type UplinkEvent =
  | { type: 'locate' }
  | { type: 'located'; visitor: Visitor }
  | { type: 'unavailable' }

const uplinkReducer = (state: UplinkState, event: UplinkEvent): UplinkState =>
  match(event)
    .returnType<UplinkState>()
    .with({ type: 'locate' }, () => ({ status: 'locating' }))
    .with({ type: 'located' }, ({ visitor }) =>
      state.status === 'locating' ? { status: 'located', visitor } : state,
    )
    .with({ type: 'unavailable' }, () =>
      state.status === 'locating' ? { status: 'unavailable' } : state,
    )
    .exhaustive()

const visitorFrom = (location: VisitorLocation | null): Visitor | null => {
  if (!location?.located) return null
  if (location.lat === undefined || location.lon === undefined) return null
  return {
    lat: location.lat,
    lon: location.lon,
    city: location.city ?? null,
    country: location.country ?? null,
  }
}

export const useVisitor = () => {
  const [state, dispatch] = useReducer(uplinkReducer, { status: 'idle' })

  const locate = useCallback(async () => {
    dispatch({ type: 'locate' })
    const visitor = visitorFrom(await fetchVisitorLocation())
    dispatch(visitor ? { type: 'located', visitor } : { type: 'unavailable' })
  }, [])

  useEffect(() => {
    void locate()
  }, [locate])

  const visitor = state.status === 'located' ? state.visitor : null
  return { locate, state, visitor }
}

export type VisitorNote = { title: string; detail: string }

const SEARCHING_NOTE: VisitorNote = {
  title: 'Finding this patch of Earth…',
  detail: 'Listening for nearby towers…',
}

const UNLOCATED_NOTES: Record<
  'idle' | 'locating' | 'unavailable',
  VisitorNote
> = {
  idle: SEARCHING_NOTE,
  locating: SEARCHING_NOTE,
  unavailable: {
    title: 'Position signal went quiet.',
    detail: 'Still on Earth. Probably.',
  },
}

export const visitorNoteFor = (state: UplinkState): VisitorNote => {
  if (state.status !== 'located') return UNLOCATED_NOTES[state.status]
  const { visitor } = state
  const country = visitor.country ? formatCountry(visitor.country) : null
  return {
    title: `Woke up in ${visitor.city ?? country ?? 'a familiar place'}.`,
    detail: `${formatCoords(visitor)} · roughly`,
  }
}
