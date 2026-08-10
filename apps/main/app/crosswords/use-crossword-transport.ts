import { type ActionDispatch, type RefObject, useState } from 'react'
import type { Copy } from './crossword-copy'
import type { CrosswordLocale, CrosswordPuzzle } from './crossword-data'
import {
  type CrosswordAction,
  type CrosswordState,
  createCrosswordState,
  crosswordReducer,
} from './crossword-engine'
import { MOBILE_LAYOUT_MEDIA } from './crossword-viewport'

export const useCrosswordTransport = ({
  announce,
  bringCellIntoView,
  copy,
  disarmReveal,
  dispatch,
  focusCellAt,
  focusGridRef,
  inputRef,
  latestStateRef,
  locale,
  openerRef,
  puzzle,
  save,
  setDialog,
  setLocale,
  setWordSweep,
}: {
  announce: (message: string) => void
  bringCellIntoView: (index: number) => void
  copy: Copy
  disarmReveal: () => void
  dispatch: ActionDispatch<[action: CrosswordAction]>
  focusCellAt: (index: number) => void
  focusGridRef: RefObject<boolean>
  inputRef: RefObject<HTMLInputElement | null>
  latestStateRef: RefObject<CrosswordState>
  locale: CrosswordLocale
  openerRef: RefObject<HTMLElement | null>
  puzzle: CrosswordPuzzle
  save: (current: CrosswordState) => void
  setDialog: (dialog: null) => void
  setLocale: (locale: CrosswordLocale) => void
  setWordSweep: (sweep: { entryId: string; run: number } | null) => void
}) => {
  const [completionDismissed, setCompletionDismissed] = useState(false)

  const restartPuzzle = () => {
    const freshState = createCrosswordState(puzzle)
    latestStateRef.current = freshState
    focusGridRef.current = true
    openerRef.current = null
    setWordSweep(null)
    disarmReveal()
    setCompletionDismissed(false)
    document.querySelector<HTMLDialogElement>('dialog[open]')?.close()
    setDialog(null)
    dispatch({ type: 'HYDRATE', state: freshState })
    save(freshState)
    announce(copy.restartedAnnouncement)
    window.requestAnimationFrame(() => focusCellAt(freshState.selectedCell))
  }

  const startPuzzle = () => {
    focusGridRef.current = true
    dispatch({ type: 'START', now: Date.now() })
    announce(copy.startedAnnouncement)
    window.requestAnimationFrame(() =>
      focusCellAt(latestStateRef.current.selectedCell),
    )
  }

  const resumePuzzle = () => {
    const mobile = window.matchMedia(MOBILE_LAYOUT_MEDIA).matches
    const selectedCell = latestStateRef.current.selectedCell
    focusGridRef.current = !mobile
    announce(copy.resumedAnnouncement)
    dispatch({ type: 'RESUME', now: Date.now() })
    window.requestAnimationFrame(() => {
      if (mobile) {
        bringCellIntoView(selectedCell)
        inputRef.current?.focus({ preventScroll: true })
      } else {
        focusCellAt(selectedCell)
      }
    })
  }

  const pauseFrom = (button: HTMLButtonElement) => {
    openerRef.current = button
    announce(copy.pausedAnnouncement)
    dispatch({ type: 'PAUSE', now: Date.now(), automatic: false })
  }

  const resumeFrom = (button: HTMLButtonElement) => {
    openerRef.current = button
    resumePuzzle()
  }

  const changeLocale = (nextLocale: CrosswordLocale) => {
    if (nextLocale === locale) return
    const current = latestStateRef.current
    const persisted =
      current.status === 'playing'
        ? crosswordReducer(current, {
            type: 'PAUSE',
            now: Date.now(),
            automatic: false,
          })
        : current
    save(persisted)
    setLocale(nextLocale)
  }

  const dismissCompletion = () => {
    setCompletionDismissed(true)
    window.requestAnimationFrame(() =>
      focusCellAt(latestStateRef.current.selectedCell),
    )
  }

  return {
    changeLocale,
    completionDismissed,
    dismissCompletion,
    pauseFrom,
    restartPuzzle,
    resumeFrom,
    resumePuzzle,
    startPuzzle,
  }
}
