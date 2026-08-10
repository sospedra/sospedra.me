import {
  type ActionDispatch,
  type KeyboardEvent,
  type RefObject,
  useCallback,
  useRef,
} from 'react'
import { pulseHaptic } from 'services/haptics'
import { type Copy, directionLabel } from './crossword-copy'
import {
  type CrosswordDirection,
  type CrosswordEntry,
  type CrosswordLocale,
  type CrosswordPuzzle,
  GRID_LETTERS,
} from './crossword-data'
import type { CrosswordAction, CrosswordState } from './crossword-engine'
import {
  availableDirection,
  type EntryStep,
  entryFor,
  nextCellInEntry,
} from './crossword-entries'
import type { GameSettings } from './crossword-settings'

const normalizeLetter = (value: string) => {
  const preserved = value.toUpperCase().replaceAll('Ñ', '\u0000')
  const normalized = preserved
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replaceAll('\u0000', 'Ñ')
  return [...normalized].findLast((letter) => GRID_LETTERS.has(letter)) ?? ''
}

export const useCrosswordKeyboard = ({
  activeEntry,
  announce,
  boardLocked,
  clickKey,
  copy,
  dispatch,
  focusActiveClue,
  focusGridRef,
  inputRef,
  latestStateRef,
  locale,
  moveToClue,
  openDialog,
  orderedEntries,
  puzzle,
  ringTypewriterBell,
  setWordSweep,
  settings,
  settleBoard,
  sweepRunRef,
  thudDeadKey,
  whiteIndices,
}: {
  activeEntry: CrosswordEntry
  announce: (message: string) => void
  boardLocked: boolean
  clickKey: () => void
  copy: Copy
  dispatch: ActionDispatch<[action: CrosswordAction]>
  focusActiveClue: () => void
  focusGridRef: RefObject<boolean>
  inputRef: RefObject<HTMLInputElement | null>
  latestStateRef: RefObject<CrosswordState>
  locale: CrosswordLocale
  moveToClue: (delta: -1 | 1, keepNativeKeyboard?: boolean) => void
  openDialog: (name: 'help', opener?: HTMLElement) => void
  orderedEntries: CrosswordEntry[]
  puzzle: CrosswordPuzzle
  ringTypewriterBell: () => void
  setWordSweep: (sweep: { entryId: string; run: number } | null) => void
  settings: GameSettings
  settleBoard: (guesses: string[]) => void
  sweepRunRef: RefObject<number>
  thudDeadKey: () => void
  whiteIndices: number[]
}) => {
  const composingRef = useRef(false)

  const advanceWithinEntry = useCallback(
    (
      index: number,
      delta: -1 | 1,
      skipFilled = settings.skipFilled,
      guesses = latestStateRef.current.guesses,
    ): EntryStep =>
      nextCellInEntry({
        activeEntry,
        delta,
        direction: latestStateRef.current.direction,
        guesses,
        index,
        orderedEntries,
        puzzle,
        skipFilled,
      }),
    [activeEntry, latestStateRef, orderedEntries, puzzle, settings.skipFilled],
  )

  const writeLetter = (value: string) => {
    if (boardLocked) return
    const letter = normalizeLetter(value)
    if (!letter) return
    const current = latestStateRef.current
    const index = current.selectedCell
    const currentDirection = current.direction
    const projectedGuesses = [...current.guesses]
    projectedGuesses[index] = letter
    const destination = advanceWithinEntry(
      index,
      1,
      settings.skipFilled,
      projectedGuesses,
    )
    focusGridRef.current = document.activeElement !== inputRef.current
    if (current.revealedCells[index]) {
      dispatch({
        type: 'SELECT',
        index: destination.index,
        direction: destination.direction,
      })
      return
    }
    const solvedEntry = puzzle.cells[index]?.entryIds
      .map((entryId) =>
        puzzle.entries.find((candidate) => candidate.id === entryId),
      )
      .find((entry) => {
        if (!entry) return false
        const wasSolved = entry.cells.every(
          (cellIndex) =>
            current.guesses[cellIndex] === puzzle.cells[cellIndex]?.solution,
        )
        const isSolved = entry.cells.every(
          (cellIndex) =>
            projectedGuesses[cellIndex] === puzzle.cells[cellIndex]?.solution,
        )
        return !wasSolved && isSolved
      })
    const wrongLetter =
      settings.autoCheck && letter !== puzzle.cells[index]?.solution
    if (wrongLetter) thudDeadKey()
    else clickKey()
    dispatch({
      type: 'WRITE',
      index,
      value: letter,
      nextIndex: destination.index,
      checked: settings.autoCheck,
      incorrect: wrongLetter,
      now: Date.now(),
    })
    if (destination.direction !== currentDirection) {
      dispatch({ type: 'SET_DIRECTION', direction: destination.direction })
    }
    if (solvedEntry) {
      sweepRunRef.current += 1
      setWordSweep({
        entryId: solvedEntry.id,
        run: sweepRunRef.current,
      })
      ringTypewriterBell()
      pulseHaptic()
    }
    settleBoard(projectedGuesses)
  }

  const eraseBackward = () => {
    const current = latestStateRef.current
    if (boardLocked) return
    focusGridRef.current = document.activeElement !== inputRef.current

    const erasable = (index: number) =>
      Boolean(current.guesses[index]) && !current.revealedCells[index]

    const selected = current.selectedCell
    const target = erasable(selected)
      ? { index: selected, direction: current.direction }
      : advanceWithinEntry(selected, -1, false)
    if (!erasable(target.index)) {
      dispatch({
        type: 'SELECT',
        index: target.index,
        direction: target.direction,
      })
      return
    }

    clickKey()
    dispatch({
      type: 'CLEAR',
      index: target.index,
      nextIndex: target.index,
      now: Date.now(),
    })
    if (target.direction !== current.direction) {
      dispatch({ type: 'SET_DIRECTION', direction: target.direction })
    }
  }

  const undoMove = () => {
    const previous = latestStateRef.current.undoStack.at(-1)
    dispatch({ type: 'UNDO' })
    if (previous) settleBoard(previous.guesses)
  }

  const redoMove = () => {
    const next = latestStateRef.current.redoStack[0]
    dispatch({ type: 'REDO' })
    if (next) settleBoard(next.guesses)
  }

  const selectCell = (
    index: number,
    nativeKeyboard: boolean,
    reclick: boolean,
  ) => {
    const current = latestStateRef.current
    const cell = puzzle.cells[index]
    if (!cell || cell.solution === null) return
    let direction = availableDirection(puzzle, index, current.direction)

    // Focus fires before click and already moves the selection, so a plain
    // selectedCell comparison would flip direction on every fresh click.
    // Only a click on the cell that was selected at pointerdown toggles.
    if (reclick && index === current.selectedCell && cell.entryIds.length > 1) {
      direction = current.direction === 'across' ? 'down' : 'across'
      announce(copy.directionChanged(directionLabel(direction, locale)))
    }
    focusGridRef.current = !nativeKeyboard
    dispatch({ type: 'SELECT', index, direction })
    if (nativeKeyboard) {
      inputRef.current?.focus({ preventScroll: true })
    }
  }

  const moveGeometrically = (rowDelta: number, columnDelta: number) => {
    const current = latestStateRef.current
    const { width, height } = puzzle
    let row = Math.floor(current.selectedCell / width) + rowDelta
    let column = (current.selectedCell % width) + columnDelta
    while (row >= 0 && row < height && column >= 0 && column < width) {
      const index = row * width + column
      if (puzzle.cells[index]?.solution !== null) {
        const requested: CrosswordDirection =
          columnDelta === 0 ? 'down' : 'across'
        const direction = availableDirection(puzzle, index, requested)
        focusGridRef.current = true
        dispatch({ type: 'SELECT', index, direction })
        return
      }
      row += rowDelta
      column += columnDelta
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.nativeEvent.isComposing || composingRef.current) return
    const current = latestStateRef.current
    const hasCommand = event.metaKey || event.ctrlKey
    const lower = event.key.toLowerCase()

    if (hasCommand && lower === 'z') {
      event.preventDefault()
      if (event.shiftKey) {
        redoMove()
      } else {
        undoMove()
      }
      return
    }
    if (event.altKey || (hasCommand && !['home', 'end'].includes(lower))) {
      return
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      moveGeometrically(0, -1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      moveGeometrically(0, 1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveGeometrically(-1, 0)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveGeometrically(1, 0)
    } else if (event.key === 'Enter') {
      const cell = puzzle.cells[current.selectedCell]
      if (cell && cell.entryIds.length > 1) {
        event.preventDefault()
        const direction = current.direction === 'across' ? 'down' : 'across'
        dispatch({ type: 'SET_DIRECTION', direction })
        announce(copy.directionChanged(directionLabel(direction, locale)))
      }
    } else if (event.key === 'Backspace') {
      event.preventDefault()
      eraseBackward()
    } else if (event.key === 'Delete') {
      event.preventDefault()
      if (boardLocked) return
      if (
        current.guesses[current.selectedCell] &&
        !current.revealedCells[current.selectedCell]
      ) {
        clickKey()
      }
      dispatch({
        type: 'CLEAR',
        index: current.selectedCell,
        nextIndex: current.selectedCell,
        now: Date.now(),
      })
    } else if (event.key === ' ') {
      event.preventDefault()
      if (boardLocked) return
      if (!current.guesses[current.selectedCell]) {
        dispatch({ type: 'TOGGLE_DIRECTION' })
      } else {
        const destination = advanceWithinEntry(current.selectedCell, 1)
        if (!current.revealedCells[current.selectedCell]) clickKey()
        dispatch({
          type: 'CLEAR',
          index: current.selectedCell,
          nextIndex: destination.index,
          now: Date.now(),
        })
        if (destination.direction !== current.direction) {
          dispatch({
            type: 'SET_DIRECTION',
            direction: destination.direction,
          })
        }
      }
    } else if (event.key === 'Tab') {
      event.preventDefault()
      focusGridRef.current = true
      moveToClue(event.shiftKey ? -1 : 1)
    } else if (event.key === '[' || event.key === ']') {
      event.preventDefault()
      focusGridRef.current = true
      moveToClue(event.key === '[' ? -1 : 1)
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      const entry =
        entryFor(puzzle, current.selectedCell, current.direction) ?? activeEntry
      const index = hasCommand
        ? event.key === 'Home'
          ? whiteIndices[0]
          : (whiteIndices.at(-1) ?? current.selectedCell)
        : event.key === 'Home'
          ? entry.cells[0]
          : (entry.cells.at(-1) ?? current.selectedCell)
      focusGridRef.current = true
      dispatch({
        type: 'SELECT',
        index,
        direction: availableDirection(puzzle, index, current.direction),
      })
    } else if (event.key === 'Escape') {
      event.preventDefault()
      focusGridRef.current = false
      focusActiveClue()
    } else if (event.key === '?') {
      event.preventDefault()
      openDialog('help', event.currentTarget)
    } else if (!hasCommand && !event.altKey && event.key.length === 1) {
      // Named keys ('Shift', 'CapsLock', 'Dead', 'F1'…) must never reach
      // the normalizer: it keeps the last A-Z glyph, so SHIFT typed a T.
      const letter = normalizeLetter(event.key)
      if (letter) {
        event.preventDefault()
        writeLetter(letter)
      }
    }
  }

  return {
    composingRef,
    eraseBackward,
    handleKeyDown,
    redoMove,
    selectCell,
    undoMove,
    writeLetter,
  }
}
