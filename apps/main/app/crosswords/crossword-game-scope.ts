import cn from 'clsx'
import cells from './crossword-cell.module.css'
import clues from './crossword-clue-rail.module.css'
import board from './crossword-grid.module.css'
import header from './crossword-masthead.module.css'
import knobs from './crossword-parameter-bank.module.css'
import switches from './crossword-switch-bank.module.css'
import tools from './crossword-toolbar.module.css'

/* Each module carries its own hash for .game; the root wears them all so
   every module's .game[data-*] rule still matches. */
export const gameScopeClasses = cn(
  cells.game,
  clues.game,
  board.game,
  header.game,
  knobs.game,
  switches.game,
  tools.game,
)
