import type React from 'react'
import type { Cell, MinesState } from './engine'
import type { Fit, InputMode } from './mines-session'
import css from './minesweeper.module.css'

type CellView = {
  variant: 'hidden' | 'revealed' | 'boom' | 'wrong'
  glyph: string
  label: string
}

const viewCell = (state: MinesState, cell: Cell, index: number): CellView => {
  const wrongFlag = state.status === 'lost' && cell.flagged && !cell.mine
  if (wrongFlag) return { variant: 'wrong', glyph: '✹', label: 'Wrong flag' }
  if (cell.flagged) return { variant: 'hidden', glyph: '⚑', label: 'Flagged' }
  if (!cell.revealed) return { variant: 'hidden', glyph: '', label: 'Hidden' }
  if (cell.mine) {
    const variant = index === state.detonated ? 'boom' : 'revealed'
    return { variant, glyph: '✹', label: 'Mine' }
  }
  if (cell.adjacent === 0)
    return { variant: 'revealed', glyph: '', label: 'Clear' }
  return {
    variant: 'revealed',
    glyph: String(cell.adjacent),
    label: `${cell.adjacent} mines adjacent`,
  }
}

export type Sweep = (index: number) => void
export type Flag = (index: number) => void

const CellButton: React.FC<{
  state: MinesState
  index: number
  inputMode: InputMode
  sweep: Sweep
  flag: Flag
}> = ({ state, index, inputMode, sweep, flag }) => {
  const cell = state.cells[index]
  const view = viewCell(state, cell, index)
  const { cols } = state.level
  const position = `${Math.floor(index / cols) + 1}:${(index % cols) + 1}`
  const act = inputMode === 'flag' ? flag : sweep

  return (
    <button
      type='button'
      className={css.cell}
      data-variant={view.variant}
      data-adjacent={cell.revealed && !cell.mine ? cell.adjacent : undefined}
      aria-label={`Cell ${position}, ${view.label}. ${inputMode === 'flag' ? 'Flag' : 'Sweep'} mode selected.`}
      onClick={() => act(index)}
      onContextMenu={(event) => {
        event.preventDefault()
        flag(index)
      }}
      onKeyDown={(event) => {
        if (event.key.toLowerCase() === 'f') {
          event.preventDefault()
          flag(index)
        }
      }}
    >
      {view.glyph}
    </button>
  )
}

export const MinesBoard: React.FC<{
  state: MinesState
  fit: Fit | null
  live: boolean
  inputMode: InputMode
  setPressing: (pressing: boolean) => void
  sweep: Sweep
  flag: Flag
}> = ({ state, fit, live, inputMode, setPressing, sweep, flag }) => (
  <div className={css.boardScroll}>
    {/* biome-ignore lint/a11y/noStaticElementInteractions: pointer press only animates the smiley */}
    <div
      className={css.board}
      data-status={state.status}
      data-mode={inputMode}
      style={
        {
          '--cols': state.level.cols,
          '--cell': fit ? `${fit.cell}px` : undefined,
        } as React.CSSProperties
      }
      onPointerDown={() => setPressing(live)}
      onPointerUp={() => setPressing(false)}
      onPointerLeave={() => setPressing(false)}
      onPointerCancel={() => setPressing(false)}
      onContextMenu={(event) => event.preventDefault()}
    >
      {state.cells.map((_, index) => (
        <CellButton
          // biome-ignore lint/suspicious/noArrayIndexKey: cells are positional and boards remount via reset
          key={index}
          state={state}
          index={index}
          inputMode={inputMode}
          sweep={sweep}
          flag={flag}
        />
      ))}
    </div>
  </div>
)
