import {
  type ActionDispatch,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
} from 'react'
import type { CrosswordEntry } from './crossword-data'
import type { CrosswordAction, CrosswordState } from './crossword-engine'
import { firstOpenCell } from './crossword-entries'
import { MOBILE_LAYOUT_MEDIA } from './crossword-viewport'

export const useCrosswordSelection = ({
  activeEntry,
  dispatch,
  focusGridRef,
  inputRef,
  latestStateRef,
  orderedEntries,
  selectedCell,
  shiftCarriage,
}: {
  activeEntry: CrosswordEntry
  dispatch: ActionDispatch<[action: CrosswordAction]>
  focusGridRef: RefObject<boolean>
  inputRef: RefObject<HTMLInputElement | null>
  latestStateRef: RefObject<CrosswordState>
  orderedEntries: CrosswordEntry[]
  selectedCell: number
  shiftCarriage: () => void
}) => {
  const cellRefs = useRef<Array<HTMLButtonElement | null>>([])
  const acrossListRef = useRef<HTMLDivElement>(null)
  const downListRef = useRef<HTMLDivElement>(null)
  const clueBarRef = useRef<HTMLButtonElement>(null)

  const bringCellIntoView = useCallback((index: number) => {
    cellRefs.current[index]?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
    })
  }, [])

  const focusCellAt = useCallback(
    (index: number) => {
      cellRefs.current[index]?.focus({ preventScroll: true })
      bringCellIntoView(index)
    },
    [bringCellIntoView],
  )

  useEffect(() => {
    bringCellIntoView(selectedCell)
    if (focusGridRef.current) focusCellAt(selectedCell)
  }, [bringCellIntoView, focusCellAt, focusGridRef, selectedCell])

  const centerClueInList = useCallback(
    (
      list: HTMLDivElement | null,
      entryId: string,
      behavior: ScrollBehavior = 'smooth',
    ) => {
      const clue = list?.querySelector<HTMLElement>(
        `[data-clue-id="${entryId}"]`,
      )
      if (!list || !clue) return
      const listBounds = list.getBoundingClientRect()
      const clueBounds = clue.getBoundingClientRect()
      const top =
        list.scrollTop +
        clueBounds.top -
        listBounds.top -
        (list.clientHeight - clueBounds.height) / 2
      const reducedMotion =
        window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        document.documentElement.classList.contains('fx-quiet')

      list.scrollTo({
        top: Math.max(0, Math.min(top, list.scrollHeight - list.clientHeight)),
        behavior: reducedMotion ? 'auto' : behavior,
      })
    },
    [],
  )

  useEffect(() => {
    const list =
      activeEntry.direction === 'across'
        ? acrossListRef.current
        : downListRef.current
    const frame = window.requestAnimationFrame(() => {
      centerClueInList(list, activeEntry.id)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [activeEntry, centerClueInList])

  const focusActiveClue = () => {
    const mobile = window.matchMedia(MOBILE_LAYOUT_MEDIA).matches
    if (mobile) {
      clueBarRef.current?.focus()
      return
    }
    const list =
      activeEntry.direction === 'across'
        ? acrossListRef.current
        : downListRef.current
    const clue = list?.querySelector<HTMLButtonElement>(
      `[data-clue-id="${activeEntry.id}"]`,
    )
    clue?.focus({ preventScroll: true })
    centerClueInList(list, activeEntry.id, 'auto')
  }

  const chooseEntry = (entry: CrosswordEntry, keepNativeKeyboard = false) => {
    const index = firstOpenCell(entry, latestStateRef.current.guesses)
    focusGridRef.current = !keepNativeKeyboard
    dispatch({
      type: 'SELECT',
      index,
      direction: entry.direction,
    })
    window.requestAnimationFrame(() => {
      if (keepNativeKeyboard) {
        bringCellIntoView(index)
        inputRef.current?.focus({ preventScroll: true })
      } else {
        focusCellAt(index)
      }
    })
  }

  const moveToClue = (delta: -1 | 1, keepNativeKeyboard = false) => {
    const found = orderedEntries.findIndex(
      (entry) => entry.id === activeEntry.id,
    )
    const current = found >= 0 ? found : 0
    const next =
      (current + delta + orderedEntries.length) % orderedEntries.length
    shiftCarriage()
    chooseEntry(orderedEntries[next], keepNativeKeyboard)
  }

  return {
    acrossListRef,
    bringCellIntoView,
    cellRefs,
    chooseEntry,
    clueBarRef,
    downListRef,
    focusActiveClue,
    focusCellAt,
    moveToClue,
  }
}
