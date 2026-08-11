import { type DebouncedFunction, debounce } from 'es-toolkit'
import {
  type ActionDispatch,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { readLocalJson, writeLocalJson } from 'services/storage'
import type { CrosswordPuzzle } from './crossword-data'
import {
  type CrosswordAction,
  type CrosswordState,
  crosswordReducer,
  restoreCrosswordState,
  serializeCrosswordState,
} from './crossword-engine'

const SAVE_DEBOUNCE_MS = 180
const PROGRESS_VERSION = 'v2'

const progressKey = (puzzle: CrosswordPuzzle) =>
  `crossword:${PROGRESS_VERSION}:progress:${puzzle.locale}:${puzzle.publicationDate}`

export const useCrosswordProgress = ({
  dispatch,
  latestStateRef,
  puzzle,
  settleBoard,
  state,
}: {
  dispatch: ActionDispatch<[action: CrosswordAction]>
  latestStateRef: RefObject<CrosswordState>
  puzzle: CrosswordPuzzle
  settleBoard: (guesses: string[]) => void
  state: CrosswordState
}) => {
  const [hydrated, setHydrated] = useState(false)
  const debouncedSaveRef = useRef<DebouncedFunction<
    (current: CrosswordState) => void
  > | null>(null)

  const save = useCallback(
    (current: CrosswordState) => {
      writeLocalJson(
        progressKey(puzzle),
        serializeCrosswordState(current, puzzle.id),
      )
    },
    [puzzle],
  )

  /* one restore per puzzle: a re-run would stomp live play with a stale save */
  const restoredPuzzleRef = useRef<string | null>(null)

  useEffect(() => {
    if (restoredPuzzleRef.current === puzzle.id) return
    restoredPuzzleRef.current = puzzle.id
    const loaded = readLocalJson(progressKey(puzzle))
    if (loaded.status === 'ok') {
      const restored = restoreCrosswordState(loaded.value, puzzle, Date.now())
      if (restored) {
        dispatch({ type: 'HYDRATE', state: restored })
        settleBoard(restored.guesses)
      }
    }
    setHydrated(true)
  }, [dispatch, puzzle, settleBoard])

  useEffect(() => {
    const debouncedSave = debounce(save, SAVE_DEBOUNCE_MS)
    debouncedSaveRef.current = debouncedSave
    return () => debouncedSave.cancel()
  }, [save])

  useEffect(() => {
    if (!hydrated) return
    debouncedSaveRef.current?.(state)
  }, [hydrated, state])

  useEffect(() => {
    const flush = () => debouncedSaveRef.current?.flush()
    const onVisibility = () => {
      if (document.hidden) {
        const current = latestStateRef.current
        if (current.status === 'playing') {
          const action = {
            type: 'PAUSE' as const,
            now: Date.now(),
            automatic: true,
          }
          const pausedState = crosswordReducer(current, action)
          latestStateRef.current = pausedState
          dispatch(action)
          save(pausedState)
        } else {
          save(current)
        }
        return
      }
      if (
        latestStateRef.current.status === 'paused' &&
        latestStateRef.current.autoPaused
      ) {
        dispatch({ type: 'RESUME', now: Date.now() })
      }
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [dispatch, latestStateRef, save])

  return { hydrated, save }
}
