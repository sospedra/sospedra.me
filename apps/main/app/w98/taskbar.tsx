import type React from 'react'
import type { AppId, DesktopState } from './desktop.ts'
import type { MenuContext } from './start-menu'
import { StartMenu } from './start-menu'
import css from './taskbar.module.css'
import w98 from './w98.module.css'

const TASKBAR_APPS: { id: AppId; label: string; icon: string }[] = [
  { id: 'mines', label: 'Minesweeper', icon: w98.appIcon },
  { id: 'paint', label: 'Paint', icon: w98.paintAppIcon },
  { id: 'winamp', label: 'Winamp', icon: w98.winampAppIcon },
  { id: 'realplayer', label: 'RealPlayer', icon: w98.realplayerAppIcon },
]

export const Taskbar: React.FC<{
  desktop: DesktopState
  menu: MenuContext
  handleTaskButton: (app: AppId) => void
}> = ({ desktop, menu, handleTaskButton }) => {
  const startOpen = menu.chrome.startMenu !== 'closed'
  const closeStart = () =>
    menu.chromeDispatch({ type: 'start', startMenu: 'closed' })

  return (
    <footer className={css.taskbar}>
      {startOpen && (
        <button
          type='button'
          tabIndex={-1}
          className={w98.menuBackdrop}
          aria-label='Close start menu'
          onClick={closeStart}
        />
      )}
      <div className={w98.menuSlot}>
        <button
          ref={menu.triggers.register('start')}
          type='button'
          className={css.startButton}
          aria-haspopup='true'
          aria-expanded={startOpen}
          onClick={() =>
            menu.chromeDispatch({
              type: 'start',
              startMenu: startOpen ? 'closed' : 'root',
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
        {startOpen && <StartMenu ctx={menu} />}
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
}
