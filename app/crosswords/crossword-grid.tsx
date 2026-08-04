import cn from 'clsx'
import { range } from 'es-toolkit'
import {
  type ActionDispatch,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
  useEffect,
  useRef,
} from 'react'
import cellCss from './crossword-cell.module.css'
import { type Copy, directionLabel } from './crossword-copy'
import type {
  CrosswordCell,
  CrosswordEntry,
  CrosswordLocale,
  CrosswordPuzzle,
} from './crossword-data'
import type { CrosswordAction, CrosswordState } from './crossword-engine'
import { availableDirection } from './crossword-entries'
import css from './crossword-grid.module.css'
import sweepCss from './crossword-word-sweep.module.css'
import cw from './crosswords.module.css'

const gridRowKeys = (height: number) =>
  range(height).map((row) => `row-${row + 1}`)

type CellMarks = {
  pencil: boolean
  incorrect: boolean
  checked: boolean
  revealed: boolean
}

const proofNote = (marks: CellMarks, copy: Copy) => {
  if (marks.incorrect) return `${copy.incorrect}.`
  if (marks.checked) return `${copy.checked}.`
  return ''
}

const cellDescription = ({
  cell,
  copy,
  crossingEntry,
  guess,
  locale,
  marks,
}: {
  cell: CrosswordCell
  copy: Copy
  crossingEntry: CrosswordEntry | undefined
  guess: string
  locale: CrosswordLocale
  marks: CellMarks
}) =>
  [
    `${copy.row} ${cell.row + 1}, ${copy.column} ${cell.column + 1}.`,
    cell.number ? `${cell.number}.` : '',
    guess ? `${copy.letter} ${guess}.` : `${copy.blank}.`,
    marks.pencil ? `${copy.pencilled}.` : '',
    proofNote(marks, copy),
    marks.revealed ? `${copy.revealed}.` : '',
    crossingEntry
      ? `${copy.intersection} ${crossingEntry.number} ${directionLabel(crossingEntry.direction, locale)}.`
      : '',
  ]
    .filter(Boolean)
    .join(' ')

const CorrectWordSweep = ({
  entry,
  width,
}: {
  entry: CrosswordEntry
  width: number
}) => {
  const firstCell = entry.cells[0]
  const row = Math.floor(firstCell / width)
  const column = firstCell % width

  return (
    <span
      className={sweepCss.wordSweep}
      data-direction={entry.direction}
      style={
        {
          '--cw-sweep-column': column,
          '--cw-sweep-length': entry.length,
          '--cw-sweep-row': row,
        } as CSSProperties
      }
      aria-hidden='true'
    >
      <span className={cn(sweepCss.sweepRail, cw.sweepRail)} />
      <span className={cn(sweepCss.sweepHead, cw.sweepHead)} />
      <span className={cn(sweepCss.sweepRegister, cw.sweepRegister)} />
    </span>
  )
}

export const CrosswordGrid = ({
  activeEntry,
  cellRefs,
  copy,
  dispatch,
  gridSizeLabel,
  latestStateRef,
  letterFontClassName,
  locale,
  onKeyDown,
  paused,
  publicationDate,
  puzzle,
  resumePuzzle,
  selectCell,
  showStart,
  startPuzzle,
  state,
  sweepEntry,
  wordSweep,
}: {
  activeEntry: CrosswordEntry
  cellRefs: RefObject<Array<HTMLButtonElement | null>>
  copy: Copy
  dispatch: ActionDispatch<[action: CrosswordAction]>
  gridSizeLabel: string
  latestStateRef: RefObject<CrosswordState>
  letterFontClassName: string
  locale: CrosswordLocale
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
  paused: boolean
  publicationDate: string
  puzzle: CrosswordPuzzle
  resumePuzzle: () => void
  selectCell: (index: number, nativeKeyboard: boolean, reclick: boolean) => void
  showStart: boolean
  startPuzzle: () => void
  state: CrosswordState
  sweepEntry: CrosswordEntry | undefined
  wordSweep: { entryId: string; run: number } | null
}) => {
  const touchHandledRef = useRef(false)
  const pointerDownCellRef = useRef<number | null>(null)
  const selectedEntryCells = new Set(activeEntry.cells)

  useEffect(() => {
    if (showStart) {
      document.getElementById('crossword-start-key')?.focus()
    }
  }, [showStart])

  return (
    <article className={css.leadStory} aria-label={copy.dailyCrossword}>
      <section
        className={css.gridRegion}
        aria-label={copy.gridLabel(publicationDate, gridSizeLabel)}
      >
        <p id='crossword-grid-instructions' className={cw.srOnly}>
          {copy.gridInstructions}
        </p>
        <div className={css.gridPan}>
          <div className={css.gridSurface}>
            <table
              className={css.grid}
              // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: the WAI-ARIA grid pattern intentionally upgrades this semantic table to a composite grid
              role='grid'
              aria-label={copy.gridLabel(publicationDate, gridSizeLabel)}
              aria-rowcount={puzzle.height}
              aria-colcount={puzzle.width}
              aria-describedby='crossword-grid-instructions'
              inert={paused || showStart}
            >
              <tbody>
                {gridRowKeys(puzzle.height).map((rowKey, row) => (
                  <tr className={cn(css.gridRow, cellCss.gridRow)} key={rowKey}>
                    {puzzle.cells
                      .slice(row * puzzle.width, (row + 1) * puzzle.width)
                      .map((cell) => {
                        if (cell.solution === null) {
                          return (
                            <td
                              key={cell.index}
                              aria-label={`${copy.row} ${cell.row + 1}, ${copy.column} ${cell.column + 1}`}
                              className={cellCss.block}
                            />
                          )
                        }
                        const selected = state.selectedCell === cell.index
                        const inEntry = selectedEntryCells.has(cell.index)
                        const sweepStep =
                          sweepEntry?.cells.indexOf(cell.index) ?? -1
                        const guess = state.guesses[cell.index]
                        const crossingEntry = cell.entryIds
                          .map((id) =>
                            puzzle.entries.find((entry) => entry.id === id),
                          )
                          .find((entry) => entry?.id !== activeEntry.id)
                        const cellName = cellDescription({
                          cell,
                          copy,
                          crossingEntry,
                          guess,
                          locale,
                          marks: {
                            pencil: Boolean(state.pencilCells[cell.index]),
                            incorrect: Boolean(
                              state.incorrectCells[cell.index],
                            ),
                            checked: Boolean(state.checkedCells[cell.index]),
                            revealed: Boolean(state.revealedCells[cell.index]),
                          },
                        })

                        return (
                          <td key={cell.index} className={cellCss.cellShell}>
                            <button
                              ref={(element) => {
                                cellRefs.current[cell.index] = element
                              }}
                              type='button'
                              className={cn(cellCss.cell, cw.cell)}
                              tabIndex={selected ? 0 : -1}
                              aria-current={selected ? 'true' : undefined}
                              aria-label={cellName}
                              aria-describedby={
                                selected
                                  ? 'crossword-active-clue-text'
                                  : undefined
                              }
                              data-selected={selected}
                              data-entry={inEntry}
                              data-sweep={sweepStep >= 0}
                              data-pencil={state.pencilCells[cell.index]}
                              data-incorrect={state.incorrectCells[cell.index]}
                              data-revealed={state.revealedCells[cell.index]}
                              data-checked={
                                state.checkedCells[cell.index] &&
                                !state.incorrectCells[cell.index]
                              }
                              style={
                                sweepStep >= 0
                                  ? ({
                                      '--cw-sweep-step': sweepStep,
                                    } as CSSProperties)
                                  : undefined
                              }
                              onPointerDown={(event: PointerEvent) => {
                                touchHandledRef.current =
                                  event.pointerType !== 'mouse'
                                pointerDownCellRef.current =
                                  latestStateRef.current.selectedCell
                              }}
                              onPointerCancel={() => {
                                touchHandledRef.current = false
                                pointerDownCellRef.current = null
                              }}
                              onClick={() => {
                                const nativeKeyboard = touchHandledRef.current
                                touchHandledRef.current = false
                                const reclick =
                                  pointerDownCellRef.current === cell.index
                                pointerDownCellRef.current = null
                                selectCell(cell.index, nativeKeyboard, reclick)
                              }}
                              onFocus={() => {
                                if (state.selectedCell !== cell.index) {
                                  dispatch({
                                    type: 'SELECT',
                                    index: cell.index,
                                    direction: availableDirection(
                                      puzzle,
                                      cell.index,
                                      state.direction,
                                    ),
                                  })
                                }
                              }}
                              onKeyDown={onKeyDown}
                            >
                              {cell.number && (
                                <span className={cellCss.cellNumber}>
                                  {cell.number}
                                </span>
                              )}
                              <span
                                className={cn(
                                  cellCss.cellLetter,
                                  letterFontClassName,
                                )}
                              >
                                {guess}
                              </span>
                              {state.revealedCells[cell.index] && (
                                <span
                                  className={cellCss.revealMark}
                                  aria-hidden='true'
                                >
                                  •
                                </span>
                              )}
                            </button>
                          </td>
                        )
                      })}
                  </tr>
                ))}
              </tbody>
            </table>
            {sweepEntry && wordSweep && (
              <CorrectWordSweep
                key={`${sweepEntry.id}-${wordSweep.run}`}
                entry={sweepEntry}
                width={puzzle.width}
              />
            )}
          </div>
        </div>
        {paused && (
          <div className={css.pauseCurtain}>
            <span aria-hidden='true'>Ⅱ</span>
            <strong>{copy.paused}</strong>
            <p>{copy.pausedNote}</p>
            <button type='button' onClick={resumePuzzle}>
              {copy.resume}
            </button>
          </div>
        )}
        {showStart && (
          <div className={css.pauseCurtain}>
            <span aria-hidden='true'>
              <svg viewBox='0 0 16 16' aria-hidden='true'>
                <path d='M6 3.9v8.2l6.5-4.1L6 3.9Z' />
              </svg>
            </span>
            <strong>{copy.brand}</strong>
            <button
              id='crossword-start-key'
              type='button'
              onClick={startPuzzle}
            >
              {copy.begin}
            </button>
            <p>{copy.startHint}</p>
          </div>
        )}
      </section>
    </article>
  )
}
