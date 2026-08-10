import cn from 'clsx'
import cells from './crossword-cell.module.css'
import clues from './crossword-clue-rail.module.css'
import board from './crossword-grid.module.css'

/* Each module carries its own hash for .game; the root wears them all so
   every module's .game[data-*] rule still matches. */
export const gameScopeClasses = cn(cells.game, clues.game, board.game)
