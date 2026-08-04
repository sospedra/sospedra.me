import { match } from 'ts-pattern'

export type MinesMenu = 'game' | 'help'
export type StartBranch = 'closed' | 'root' | 'programs' | 'games'

export type ChromeState = {
  menu: MinesMenu | null
  startMenu: StartBranch
  helpOpen: boolean
}

export type ChromeEvent =
  | { type: 'menu'; menu: MinesMenu | null }
  | { type: 'start'; startMenu: StartBranch }
  | { type: 'help'; open: boolean }
  | { type: 'exit-mines' }
  | { type: 'escape' }

export const INITIAL_CHROME: ChromeState = {
  menu: null,
  startMenu: 'closed',
  helpOpen: false,
}

export const reduceChrome = (
  state: ChromeState,
  event: ChromeEvent,
): ChromeState =>
  match(event)
    .with({ type: 'menu' }, ({ menu }) => ({ ...state, menu }))
    .with({ type: 'start' }, ({ startMenu }) => ({ ...state, startMenu }))
    .with({ type: 'help' }, ({ open }) =>
      open
        ? { ...state, helpOpen: true, menu: null }
        : { ...state, helpOpen: false },
    )
    .with({ type: 'exit-mines' }, () => ({
      ...state,
      menu: null,
      helpOpen: false,
    }))
    .with({ type: 'escape' }, () => INITIAL_CHROME)
    .exhaustive()

export type MenuTriggerId = 'game' | 'help' | 'start' | 'programs' | 'games'

// closing a menu unmounts the focused item; hand focus back to its trigger
export const chromeFocusTarget = (
  prev: ChromeState,
  next: ChromeState,
): MenuTriggerId | null => {
  if (!prev.helpOpen && next.helpOpen) return null
  if (prev.helpOpen && !next.helpOpen) return 'help'
  if (prev.menu !== null && next.menu === null) return prev.menu
  if (prev.startMenu === 'programs' && next.startMenu === 'root')
    return 'programs'
  if (prev.startMenu === 'games' && next.startMenu === 'root') return 'games'
  if (prev.startMenu !== 'closed' && next.startMenu === 'closed') return 'start'
  return null
}
