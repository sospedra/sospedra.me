import cn from 'clsx'
import type React from 'react'
import Link from 'services/link'
import { GAMES } from '../games/catalogue'
import type { AppId, DesktopState } from './desktop.ts'
import type { GuardNav } from './desktop-icons'
import type { ChromeEvent, ChromeState } from './menu-state'
import css from './taskbar.module.css'
import w98 from './w98.module.css'

const GameMenuItem: React.FC<{
  game: (typeof GAMES)[number]
  startLaunch: (app: AppId) => void
  guardNav: GuardNav
}> = ({ game, startLaunch, guardNav }) => {
  const icon = (
    <span className={w98.gameIcon} data-game={game.id} aria-hidden='true' />
  )
  if (game.id === 'mines') {
    return (
      <button
        type='button'
        className={css.programItem}
        onClick={() => startLaunch('mines')}
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
      onClick={(event) => guardNav(event, game.href)}
    >
      {icon}
      {game.title}
    </Link>
  )
}

const TASKBAR_APPS: { id: AppId; label: string; icon: string }[] = [
  { id: 'mines', label: 'Minesweeper', icon: w98.appIcon },
  { id: 'paint', label: 'Paint', icon: w98.paintAppIcon },
  { id: 'winamp', label: 'Winamp', icon: w98.winampAppIcon },
  { id: 'realplayer', label: 'RealPlayer', icon: w98.realplayerAppIcon },
]

export const Taskbar: React.FC<{
  desktop: DesktopState
  chrome: ChromeState
  chromeDispatch: React.Dispatch<ChromeEvent>
  startTriggerRef: React.RefObject<HTMLButtonElement | null>
  programsTriggerRef: React.RefObject<HTMLButtonElement | null>
  gamesTriggerRef: React.RefObject<HTMLButtonElement | null>
  startLaunch: (app: AppId) => void
  handleTaskButton: (app: AppId) => void
  guardNav: GuardNav
}> = ({
  desktop,
  chrome,
  chromeDispatch,
  startTriggerRef,
  programsTriggerRef,
  gamesTriggerRef,
  startLaunch,
  handleTaskButton,
  guardNav,
}) => (
  <footer className={css.taskbar}>
    {chrome.startMenu !== 'closed' && (
      <button
        type='button'
        tabIndex={-1}
        className={w98.menuBackdrop}
        aria-label='Close start menu'
        onClick={() => chromeDispatch({ type: 'start', startMenu: 'closed' })}
      />
    )}
    <div className={w98.menuSlot}>
      <button
        ref={startTriggerRef}
        type='button'
        className={css.startButton}
        aria-haspopup='true'
        aria-expanded={chrome.startMenu !== 'closed'}
        onClick={() =>
          chromeDispatch({
            type: 'start',
            startMenu: chrome.startMenu === 'closed' ? 'root' : 'closed',
          })
        }
      >
        <span className={css.winMark} aria-hidden='true'>
          <i />
          <i />
          <i />
          <i />
        </span>
        <strong>Start</strong>
      </button>
      {chrome.startMenu !== 'closed' && (
        <div className={css.startMenu}>
          <div className={w98.menuSlot}>
            <button
              ref={programsTriggerRef}
              type='button'
              className={cn(w98.menuItem, css.menuItem)}
              aria-haspopup='true'
              aria-expanded={chrome.startMenu === 'programs'}
              onClick={() =>
                chromeDispatch({
                  type: 'start',
                  startMenu:
                    chrome.startMenu === 'programs' ? 'root' : 'programs',
                })
              }
              onPointerEnter={(event) => {
                // touch fires pointerenter and click in the same tap:
                // hover-open plus click-toggle would shut the menu again
                if (event.pointerType !== 'mouse') return
                chromeDispatch({ type: 'start', startMenu: 'programs' })
              }}
            >
              Programs <span aria-hidden='true'>▸</span>
            </button>
            {chrome.startMenu === 'programs' && (
              <div className={css.programsMenu}>
                <Link
                  url='/console'
                  className={css.programItem}
                  onClick={(event) => guardNav(event, '/console')}
                >
                  <span className={w98.msdosAppIcon} aria-hidden='true' />
                  MS-DOS
                </Link>
                <Link
                  url='/cims'
                  className={css.programItem}
                  onClick={(event) => guardNav(event, '/cims')}
                >
                  <span className={w98.cimsAppIcon} aria-hidden='true' />
                  Cims
                </Link>
                <button
                  type='button'
                  className={css.programItem}
                  onClick={() => startLaunch('mines')}
                >
                  <span className={w98.appIcon} aria-hidden='true' />
                  Minesweeper
                </button>
                <button
                  type='button'
                  className={css.programItem}
                  onClick={() => startLaunch('paint')}
                >
                  <span className={w98.paintAppIcon} aria-hidden='true' />
                  Paint
                </button>
                <button
                  type='button'
                  className={css.programItem}
                  onClick={() => startLaunch('winamp')}
                >
                  <span className={w98.winampAppIcon} aria-hidden='true' />
                  Winamp
                </button>
                <button
                  type='button'
                  className={css.programItem}
                  onClick={() => startLaunch('realplayer')}
                >
                  <span className={w98.realplayerAppIcon} aria-hidden='true' />
                  RealPlayer
                </button>
              </div>
            )}
          </div>
          <div className={w98.menuSlot}>
            <button
              ref={gamesTriggerRef}
              type='button'
              className={cn(w98.menuItem, css.menuItem)}
              aria-haspopup='true'
              aria-expanded={chrome.startMenu === 'games'}
              onClick={() =>
                chromeDispatch({
                  type: 'start',
                  startMenu: chrome.startMenu === 'games' ? 'root' : 'games',
                })
              }
              onPointerEnter={(event) => {
                if (event.pointerType !== 'mouse') return
                chromeDispatch({ type: 'start', startMenu: 'games' })
              }}
            >
              Games <span aria-hidden='true'>▸</span>
            </button>
            {chrome.startMenu === 'games' && (
              <div className={css.gamesMenu}>
                {GAMES.map((game) => (
                  <GameMenuItem
                    key={game.id}
                    game={game}
                    startLaunch={startLaunch}
                    guardNav={guardNav}
                  />
                ))}
              </div>
            )}
          </div>
          <hr />
          <Link
            url='/'
            className={css.shutdownItem}
            aria-label='Shut down and return home'
            onClick={(event) => guardNav(event, '/')}
          >
            Shut Down…
          </Link>
        </div>
      )}
    </div>
    <span className={css.taskDivider} aria-hidden='true' />
    {TASKBAR_APPS.map(({ id, label, icon }) => {
      const appWindow = desktop.apps[id]
      if (!appWindow.open) return null
      const shown = desktop.active === id && !appWindow.minimized
      return (
        <button
          key={id}
          type='button'
          className={css.taskButton}
          data-active={shown}
          aria-pressed={shown}
          onClick={() => handleTaskButton(id)}
        >
          <span className={icon} aria-hidden='true' /> {label}
        </button>
      )
    })}
    <span className={css.taskSpacer} />
    <span className={css.tray} aria-hidden='true'>
      <span>EN</span>
      <time dateTime='1998-06-25T15:10'>3:10 PM</time>
    </span>
  </footer>
)
