import { match } from 'ts-pattern'

export type MinesMenu = 'game' | 'help'

export type StartBranch =
  | 'closed'
  | 'root'
  | 'programs'
  | 'programs/accessories'
  | 'programs/entertainment'
  | 'documents'
  | 'games'

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

export type MenuTriggerId =
  | 'game'
  | 'help'
  | 'start'
  | 'programs'
  | 'accessories'
  | 'entertainment'
  | 'documents'
  | 'games'

const BRANCH_PARENT = {
  closed: 'closed',
  root: 'closed',
  programs: 'root',
  'programs/accessories': 'programs',
  'programs/entertainment': 'programs',
  documents: 'root',
  games: 'root',
} satisfies Record<StartBranch, StartBranch>

const BRANCH_TRIGGER: Partial<Record<StartBranch, MenuTriggerId>> = {
  programs: 'programs',
  'programs/accessories': 'accessories',
  'programs/entertainment': 'entertainment',
  documents: 'documents',
  games: 'games',
}

// the tree is two deep, so one parent hop covers every open ancestor
export const branchOpen = (branch: StartBranch, path: StartBranch) =>
  branch === path || BRANCH_PARENT[branch] === path

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

const startFocusTarget = (
  prev: StartBranch,
  next: StartBranch,
): MenuTriggerId | null => {
  if (prev === next) return null
  if (next === 'closed') return 'start'
  if (next !== BRANCH_PARENT[prev]) return null
  return BRANCH_TRIGGER[prev] ?? null
}

// closing a menu unmounts the focused item; hand focus back to its trigger
export const chromeFocusTarget = (
  prev: ChromeState,
  next: ChromeState,
): MenuTriggerId | null => {
  if (!prev.helpOpen && next.helpOpen) return null
  if (prev.helpOpen && !next.helpOpen) return 'help'
  if (prev.menu !== null && next.menu === null) return prev.menu
  return startFocusTarget(prev.startMenu, next.startMenu)
}
