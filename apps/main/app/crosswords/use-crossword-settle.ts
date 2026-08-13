import {
  type ActionDispatch,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { pulseHaptic } from 'services/haptics'
import type { Copy } from './crossword-copy'
import type { CrosswordPuzzle } from './crossword-data'
import type { CrosswordAction } from './crossword-engine'

/* covers the 640ms solved-word sweep plus its per-cell stagger in crosswords.module.css */
const WORD_SWEEP_MS = 900

export type WordSweep = { entryId: string; run: number } | null

export const useCrosswordSettle = ({
  announce,
  complete,
  copy,
  dispatch,
  inputRef,
  puzzle,
  ringFanfare,
  solutions,
  thudDeadKey,
  whiteIndices,
}: {
  announce: (message: string) => void
  complete: boolean
  copy: Copy
  dispatch: ActionDispatch<[action: CrosswordAction]>
  inputRef: RefObject<HTMLInputElement | null>
  puzzle: CrosswordPuzzle
  ringFanfare: () => void
  solutions: Record<string, string>
  thudDeadKey: () => void
  whiteIndices: number[]
}) => {
  const [wordSweep, setWordSweep] = useState<WordSweep>(null)
  const sweepRunRef = useRef(0)

  /* a puzzle restored complete must not celebrate again on mount */
  const celebratedRef = useRef(complete)
  useEffect(() => {
    if (complete && !celebratedRef.current) {
      pulseHaptic()
      ringFanfare()
    }
    celebratedRef.current = complete
  }, [complete, ringFanfare])

  useEffect(() => {
    if (!wordSweep) return
    const timeout = window.setTimeout(() => setWordSweep(null), WORD_SWEEP_MS)
    return () => window.clearTimeout(timeout)
  }, [wordSweep])

  const settleBoard = useCallback(
    (guesses: string[]) => {
      const filled = whiteIndices.every((index) => guesses[index])
      if (!filled) return
      const correct = whiteIndices.every(
        (index) => guesses[index] === solutions[index],
      )
      if (correct) {
        inputRef.current?.blur()
        dispatch({ type: 'COMPLETE', now: Date.now() })
        return
      }
      thudDeadKey()
      announce(copy.notCorrect)
    },
    [
      announce,
      copy.notCorrect,
      dispatch,
      inputRef,
      solutions,
      thudDeadKey,
      whiteIndices,
    ],
  )

  const sweepEntry = wordSweep
    ? puzzle.entries.find((entry) => entry.id === wordSweep.entryId)
    : undefined

  return { settleBoard, setWordSweep, sweepEntry, sweepRunRef, wordSweep }
}
