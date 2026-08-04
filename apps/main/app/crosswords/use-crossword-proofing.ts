import { type ActionDispatch, type RefObject, useEffect, useState } from 'react'
import type { Copy } from './crossword-copy'
import type { CrosswordEntry } from './crossword-data'
import type { CrosswordAction, CrosswordState } from './crossword-engine'
import type { Scope } from './crossword-settings'

const REVEAL_DISARM_MS = 5000

const revealTargetFor = (scope: Scope, cell: number, entryId: string) => {
  if (scope === 'cell') return `cell:${cell}`
  if (scope === 'answer') return `answer:${entryId}`
  return 'puzzle'
}

export const useCrosswordProofing = ({
  activeEntry,
  announce,
  copy,
  dispatch,
  latestStateRef,
  selectedCell,
  settleBoard,
  solutions,
  whiteIndices,
}: {
  activeEntry: CrosswordEntry
  announce: (message: string) => void
  copy: Copy
  dispatch: ActionDispatch<[action: CrosswordAction]>
  latestStateRef: RefObject<CrosswordState>
  selectedCell: number
  settleBoard: (guesses: string[]) => void
  solutions: Record<number, string>
  whiteIndices: number[]
}) => {
  const [toolScope, setToolScope] = useState<Scope>('answer')
  const [armedRevealTarget, setArmedRevealTarget] = useState<string | null>(
    null,
  )

  const revealTargetKey = revealTargetFor(
    toolScope,
    selectedCell,
    activeEntry.id,
  )
  const revealArmed = armedRevealTarget === revealTargetKey

  useEffect(() => {
    if (!armedRevealTarget) return
    const timeout = window.setTimeout(
      () => setArmedRevealTarget(null),
      REVEAL_DISARM_MS,
    )
    const disarm = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setArmedRevealTarget(null)
      announce(copy.revealDisarmed)
    }
    window.addEventListener('keydown', disarm)
    return () => {
      window.clearTimeout(timeout)
      window.removeEventListener('keydown', disarm)
    }
  }, [announce, armedRevealTarget, copy.revealDisarmed])

  const indicesFor = (scope: Scope) => {
    if (scope === 'cell') return [latestStateRef.current.selectedCell]
    if (scope === 'answer') return [...activeEntry.cells]
    return whiteIndices
  }

  const check = (scope: Scope) => {
    const indices = indicesFor(scope)
    dispatch({ type: 'CHECK', indices, solutions })
    const count = indices.filter(
      (index) =>
        latestStateRef.current.guesses[index] &&
        latestStateRef.current.guesses[index] !== solutions[index],
    ).length
    announce(count > 0 ? copy.errorsFound(count) : copy.noErrors)
  }

  const reveal = (scope: Scope) => {
    const indices = indicesFor(scope)
    dispatch({
      type: 'REVEAL',
      indices,
      solutions,
      now: Date.now(),
    })
    announce(copy.revealDone)
    const projectedGuesses = [...latestStateRef.current.guesses]
    for (const index of indices) {
      const solution = solutions[index]
      if (solution) projectedGuesses[index] = solution
    }
    settleBoard(projectedGuesses)
  }

  const requestReveal = () => {
    if (!revealArmed) {
      setArmedRevealTarget(revealTargetKey)
      announce(copy.revealArmed)
      return
    }
    setArmedRevealTarget(null)
    reveal(toolScope)
  }

  const changeToolScope = (scope: Scope) => {
    setArmedRevealTarget(null)
    setToolScope(scope)
  }

  const disarmReveal = () => setArmedRevealTarget(null)

  return {
    changeToolScope,
    check,
    disarmReveal,
    requestReveal,
    revealArmed,
    toolScope,
  }
}
