import type { Dispatch, RefObject } from 'react'
import { useEffect, useRef, useState } from 'react'
import type { ExternalStore } from 'services/external-store'
import { getBrowserStorage } from 'services/storage'
import type { GeoGameAction, GeoGameState } from './game-state'
import {
  loadGeoStats,
  saveGeoRun,
  saveGeoStats,
  serializeGeoRun,
} from './persistence'
import { geoGameReducer } from './reducer'
import { createOfficialRunRecord, recordOfficialRun } from './stats'

export const useRunStorage = ({
  dispatch,
  questionElapsedRef,
  roundClock,
  state,
  stateRef,
}: {
  dispatch: Dispatch<GeoGameAction>
  questionElapsedRef: RefObject<number>
  roundClock: ExternalStore<number>
  state: GeoGameState
  stateRef: RefObject<GeoGameState>
}) => {
  const [stats, setStats] = useState(
    () => loadGeoStats(getBrowserStorage()).value,
  )

  const recordedCompletionRef = useRef<string | null>(null)

  useEffect(() => {
    const serialized = serializeGeoRun(state)
    if (!serialized) return
    saveGeoRun(getBrowserStorage(), state.challenge.publicationDate, serialized)
  }, [state])

  useEffect(() => {
    if (
      state.phase !== 'completed' ||
      state.runKind !== 'official' ||
      !state.completedAt ||
      recordedCompletionRef.current === state.completedAt
    ) {
      return
    }
    recordedCompletionRef.current = state.completedAt
    const storage = getBrowserStorage()
    const loaded = loadGeoStats(storage).value
    const record = createOfficialRunRecord({
      answers: state.answers,
      challenge: state.challenge,
      completedAt: state.completedAt,
    })
    const next = recordOfficialRun(loaded, record)
    saveGeoStats(storage, next)
    setStats(next)
  }, [state])

  useEffect(() => {
    const freezeAndSave = () => {
      const current = stateRef.current
      if (
        current.phase !== 'question' &&
        current.phase !== 'feedback' &&
        current.phase !== 'countdown'
      ) {
        return
      }
      const frozen = geoGameReducer(current, {
        type: 'VISIBILITY_HIDDEN',
        elapsedMs: questionElapsedRef.current,
        roundElapsedMs: roundClock.get(),
      })
      const serialized = serializeGeoRun(frozen)
      if (serialized) {
        saveGeoRun(
          getBrowserStorage(),
          current.challenge.publicationDate,
          serialized,
        )
      }
      dispatch({
        type: 'VISIBILITY_HIDDEN',
        elapsedMs: questionElapsedRef.current,
        roundElapsedMs: roundClock.get(),
      })
    }
    const handleVisibility = () => {
      if (document.hidden) freezeAndSave()
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('pagehide', freezeAndSave)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('pagehide', freezeAndSave)
    }
  }, [roundClock])

  return { stats }
}
