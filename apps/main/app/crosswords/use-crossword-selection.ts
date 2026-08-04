import {
  type ActionDispatch,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import type {
  CrosswordDirection,
  CrosswordEntry,
  CrosswordPuzzle,
} from './crossword-data'
import type { CrosswordAction, CrosswordState } from './crossword-engine'
import { entryFor, firstOpenCell } from './crossword-entries'

export const MOBILE_LAYOUT_MEDIA =
  '(max-width: 52rem), (max-width: 64rem) and (max-height: 36rem)'
const SHORT_VIEWPORT_HEIGHT_PX = 480

export const useCrosswordSelection = ({
  acrossEntries,
  activeEntry,
  dispatch,
  downEntries,
  focusGridRef,
  inputRef,
  latestStateRef,
  orderedEntries,
  puzzle,
  selectedCell,
  shiftCarriage,
}: {
  acrossEntries: CrosswordEntry[]
  activeEntry: CrosswordEntry
  dispatch: ActionDispatch<[action: CrosswordAction]>
  downEntries: CrosswordEntry[]
  focusGridRef: RefObject<boolean>
  inputRef: RefObject<HTMLInputElement | null>
  latestStateRef: RefObject<CrosswordState>
  orderedEntries: CrosswordEntry[]
  puzzle: CrosswordPuzzle
  selectedCell: number
  shiftCarriage: () => void
}) => {
  const [shortViewport, setShortViewport] = useState(false)
  const cellRefs = useRef<Array<HTMLButtonElement | null>>([])
  const acrossListRef = useRef<HTMLDivElement>(null)
  const downListRef = useRef<HTMLDivElement>(null)
  const mobileListRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mobileLayout = window.matchMedia(MOBILE_LAYOUT_MEDIA)
    const viewport = window.visualViewport
    let frame = 0
    const update = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        const height = viewport?.height ?? window.innerHeight
        setShortViewport(
          mobileLayout.matches && height <= SHORT_VIEWPORT_HEIGHT_PX,
        )
      })
    }

    update()
    mobileLayout.addEventListener('change', update)
    viewport?.addEventListener('resize', update)
    window.addEventListener('resize', update)
    return () => {
      window.cancelAnimationFrame(frame)
      mobileLayout.removeEventListener('change', update)
      viewport?.removeEventListener('resize', update)
      window.removeEventListener('resize', update)
    }
  }, [])

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
    if (!shortViewport) return
    const frame = window.requestAnimationFrame(() => {
      bringCellIntoView(latestStateRef.current.selectedCell)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [bringCellIntoView, latestStateRef, shortViewport])

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
      centerClueInList(mobileListRef.current, activeEntry.id)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [activeEntry, centerClueInList])

  useEffect(() => {
    const mobileLayout = window.matchMedia(MOBILE_LAYOUT_MEDIA)
    const viewport = window.visualViewport
    let frame = 0
    const recenterMobileClue = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        if (mobileLayout.matches) {
          bringCellIntoView(latestStateRef.current.selectedCell)
          centerClueInList(mobileListRef.current, activeEntry.id, 'auto')
        }
      })
    }

    recenterMobileClue()
    mobileLayout.addEventListener('change', recenterMobileClue)
    viewport?.addEventListener('resize', recenterMobileClue)
    viewport?.addEventListener('scroll', recenterMobileClue)
    window.addEventListener('resize', recenterMobileClue)
    return () => {
      window.cancelAnimationFrame(frame)
      mobileLayout.removeEventListener('change', recenterMobileClue)
      viewport?.removeEventListener('resize', recenterMobileClue)
      viewport?.removeEventListener('scroll', recenterMobileClue)
      window.removeEventListener('resize', recenterMobileClue)
    }
  }, [activeEntry.id, bringCellIntoView, centerClueInList, latestStateRef])

  const focusActiveClue = () => {
    const mobile = window.matchMedia(MOBILE_LAYOUT_MEDIA).matches
    const list = mobile
      ? mobileListRef.current
      : activeEntry.direction === 'across'
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

  const chooseMobileDirection = (direction: CrosswordDirection) => {
    const current = latestStateRef.current
    const entries = direction === 'across' ? acrossEntries : downEntries
    const entry =
      entryFor(puzzle, current.selectedCell, direction) ??
      entries.find((candidate) =>
        candidate.cells.some((index) => !current.guesses[index]),
      ) ??
      entries[0]
    if (!entry) return
    chooseEntry(entry, true)
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
    chooseMobileDirection,
    downListRef,
    focusActiveClue,
    focusCellAt,
    mobileListRef,
    moveToClue,
    shortViewport,
  }
}
