import cn from 'clsx'
import type { Route } from 'next'
import type React from 'react'
import { useRef } from 'react'
import Link from 'services/link'
import { GAMES } from '../games/catalogue'
import type { AppId } from './desktop.ts'
import type { GuardNav } from './desktop-icons'
import {
  branchOpen,
  type ChromeEvent,
  type ChromeState,
  type MenuTriggerId,
  type StartBranch,
} from './menu-state'
import css from './taskbar.module.css'
import w98 from './w98.module.css'

type GameRecord = (typeof GAMES)[number]

type MenuItem =
  | { kind: 'rule' }
  | { kind: 'route'; label: string; href: Route; icon: string }
  | { kind: 'app'; label: string; app: AppId; icon: string }
  | { kind: 'game'; game: GameRecord }
  | {
      kind: 'folder'
      label: string
      branch: StartBranch
      trigger: MenuTriggerId
      placement: 'down' | 'up'
      items: MenuItem[]
    }

type TriggerNodes = Partial<Record<MenuTriggerId, HTMLButtonElement | null>>

export type MenuTriggers = {
  register: (id: MenuTriggerId) => (node: HTMLButtonElement | null) => void
  focus: (id: MenuTriggerId) => void
}

// one stable ref, not one per trigger: the React Compiler memoizes a
// hook that only assembles an object and its inner useRef calls vanish
export const useMenuTriggers = (): MenuTriggers => {
  const nodes = useRef<TriggerNodes>({})
  return {
    register: (id) => (node) => {
      nodes.current[id] = node
    },
    focus: (id) => nodes.current[id]?.focus(),
  }
}

export type MenuContext = {
  chrome: ChromeState
  chromeDispatch: React.Dispatch<ChromeEvent>
  triggers: MenuTriggers
  startLaunch: (app: AppId) => void
  guardNav: GuardNav
}

const ACCESSORIES: MenuItem[] = [
  { kind: 'route', label: 'Camera', href: '/camera', icon: w98.cameraAppIcon },
  { kind: 'app', label: 'Paint', app: 'paint', icon: w98.paintAppIcon },
]

const ENTERTAINMENT: MenuItem[] = [
  { kind: 'app', label: 'Winamp', app: 'winamp', icon: w98.winampAppIcon },
  {
    kind: 'app',
    label: 'RealPlayer',
    app: 'realplayer',
    icon: w98.realplayerAppIcon,
  },
  {
    kind: 'route',
    label: 'Videoclub',
    href: '/videoclub',
    icon: w98.videoclubAppIcon,
  },
]

const PROGRAMS: MenuItem[] = [
  {
    kind: 'folder',
    label: 'Accessories',
    branch: 'programs/accessories',
    trigger: 'accessories',
    placement: 'down',
    items: ACCESSORIES,
  },
  {
    kind: 'folder',
    label: 'Entertainment',
    branch: 'programs/entertainment',
    trigger: 'entertainment',
    placement: 'down',
    items: ENTERTAINMENT,
  },
  { kind: 'rule' },
  {
    kind: 'route',
    label: 'MS-DOS Prompt',
    href: '/console',
    icon: w98.msdosAppIcon,
  },
  { kind: 'route', label: 'Cims', href: '/cims', icon: w98.cimsAppIcon },
  { kind: 'route', label: 'Travel', href: '/travel', icon: w98.travelAppIcon },
  { kind: 'app', label: 'Minesweeper', app: 'mines', icon: w98.appIcon },
]

const DOCUMENTS: MenuItem[] = [
  { kind: 'route', label: 'Manual', href: '/manual', icon: w98.manualAppIcon },
  { kind: 'route', label: 'Papers', href: '/papers', icon: w98.papersAppIcon },
]

const GAME_ITEMS: MenuItem[] = [
  { kind: 'route', label: 'Games', href: '/games', icon: w98.folderAppIcon },
  { kind: 'rule' },
  ...GAMES.map((game): MenuItem => ({ kind: 'game', game })),
]

const ROOT: MenuItem[] = [
  {
    kind: 'folder',
    label: 'Programs',
    branch: 'programs',
    trigger: 'programs',
    placement: 'down',
    items: PROGRAMS,
  },
  {
    kind: 'folder',
    label: 'Documents',
    branch: 'documents',
    trigger: 'documents',
    placement: 'down',
    items: DOCUMENTS,
  },
  {
    kind: 'folder',
    label: 'Games',
    branch: 'games',
    trigger: 'games',
    placement: 'up',
    items: GAME_ITEMS,
  },
]

function RouteItem({
  label,
  href,
  icon,
  ctx,
}: {
  label: string
  href: Route
  icon: string
  ctx: MenuContext
}) {
  return (
    <Link
      url={href}
      className={css.programItem}
      onClick={(event) => ctx.guardNav(event, href)}
    >
      <span className={icon} aria-hidden='true' />
      {label}
    </Link>
  )
}

function AppItem({
  label,
  app,
  icon,
  ctx,
}: {
  label: string
  app: AppId
  icon: string
  ctx: MenuContext
}) {
  return (
    <button
      type='button'
      className={css.programItem}
      onClick={() => ctx.startLaunch(app)}
    >
      <span className={icon} aria-hidden='true' />
      {label}
    </button>
  )
}

function GameItem({ game, ctx }: { game: GameRecord; ctx: MenuContext }) {
  const icon = (
    <span className={w98.gameIcon} data-game={game.id} aria-hidden='true' />
  )
  if (game.id === 'mines') {
    return (
      <button
        type='button'
        className={css.programItem}
        onClick={() => ctx.startLaunch('mines')}
      >
        {icon}
        {game.title}
      </button>
    )
  }
  return (
    <Link
      url={game.href}
      className={css.programItem}
      onClick={(event) => ctx.guardNav(event, game.href)}
    >
      {icon}
      {game.title}
    </Link>
  )
}

const SUBMENU_CLASS = {
  down: css.programsMenu,
  up: css.gamesMenu,
} satisfies Record<'down' | 'up', string>

function MenuFolder({
  folder,
  ctx,
}: {
  folder: Extract<MenuItem, { kind: 'folder' }>
  ctx: MenuContext
}) {
  const open = branchOpen(ctx.chrome.startMenu, folder.branch)
  const openBranch = (startMenu: StartBranch) =>
    ctx.chromeDispatch({ type: 'start', startMenu })

  return (
    <div className={w98.menuSlot}>
      <button
        ref={ctx.triggers.register(folder.trigger)}
        type='button'
        className={cn(w98.menuItem, css.menuItem)}
        aria-haspopup='true'
        aria-expanded={open}
        // W98 opens submenus on hover and never collapses one by clicking
        // its parent; a touch tap has no hover, so click has to open too
        onClick={() => openBranch(folder.branch)}
        onPointerEnter={(event) => {
          if (event.pointerType !== 'mouse') return
          openBranch(folder.branch)
        }}
      >
        <span className={w98.folderAppIcon} aria-hidden='true' />
        {folder.label} <span aria-hidden='true'>▸</span>
      </button>
      {open && (
        <div className={SUBMENU_CLASS[folder.placement]}>
          <MenuList items={folder.items} ctx={ctx} />
        </div>
      )}
    </div>
  )
}

function MenuList({ items, ctx }: { items: MenuItem[]; ctx: MenuContext }) {
  return items.map((item, index) => {
    if (item.kind === 'rule') {
      // biome-ignore lint/suspicious/noArrayIndexKey: rules are positional separators
      return <hr key={`rule-${index}`} />
    }
    if (item.kind === 'folder') {
      return <MenuFolder key={item.branch} folder={item} ctx={ctx} />
    }
    if (item.kind === 'game') {
      return <GameItem key={item.game.id} game={item.game} ctx={ctx} />
    }
    if (item.kind === 'app') {
      return (
        <AppItem
          key={item.app}
          label={item.label}
          app={item.app}
          icon={item.icon}
          ctx={ctx}
        />
      )
    }
    return (
      <RouteItem
        key={item.href}
        label={item.label}
        href={item.href}
        icon={item.icon}
        ctx={ctx}
      />
    )
  })
}

export function StartMenu({ ctx }: { ctx: MenuContext }) {
  return (
    <div className={css.startMenu}>
      <MenuList items={ROOT} ctx={ctx} />
      <hr />
      <Link
        url='/'
        className={css.shutdownItem}
        aria-label='Shut down and return home'
        onClick={(event) => ctx.guardNav(event, '/')}
      >
        Shut Down…
      </Link>
    </div>
  )
}
