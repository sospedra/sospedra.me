import type { Route } from 'next'
import type React from 'react'
import { useRef, useState } from 'react'
import Link from 'services/link'
import type { AppId } from './desktop.ts'
import css from './desktop-icons.module.css'

type IconId =
  | 'msdos'
  | 'recycle'
  | 'cims'
  | 'mines'
  | 'paint'
  | 'winamp'
  | 'realplayer'

// W98 icon ritual: a mouse click only selects, the double click opens;
// touch and keyboard activations (click detail 0) open in one go
export const useDesktopShortcuts = () => {
  const [selected, setSelected] = useState<IconId | null>(null)
  const pointerTypeRef = useRef('mouse')

  const press = (icon: IconId, open?: () => void) => ({
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
      pointerTypeRef.current = event.pointerType
      setSelected(icon)
    },
    onClick: (event: React.MouseEvent<HTMLElement>) => {
      const selectOnly =
        pointerTypeRef.current === 'mouse' && event.detail === 1
      if (selectOnly) {
        event.preventDefault()
        return
      }
      open?.()
    },
  })

  const clear = (event: React.PointerEvent<HTMLElement>) => {
    const target = event.target instanceof Element ? event.target : null
    if (target?.closest(`.${css.desktopShortcut}`)) return
    setSelected(null)
  }

  return { selected, press, clear }
}

export type DesktopShortcuts = ReturnType<typeof useDesktopShortcuts>
export type GuardNav = (event: React.MouseEvent, url: Route) => void

const DesktopLink: React.FC<{
  url: Route
  label: string
  ariaLabel: string
  icon: string
  iconId: IconId
  icons: DesktopShortcuts
  guardNav: GuardNav
}> = ({ url, label, ariaLabel, icon, iconId, icons, guardNav }) => {
  const press = icons.press(iconId)
  return (
    <Link
      url={url}
      className={css.desktopShortcut}
      aria-label={ariaLabel}
      data-selected={icons.selected === iconId}
      {...press}
      onClick={(event) => {
        press.onClick(event)
        if (!event.defaultPrevented) guardNav(event, url)
      }}
    >
      <span className={icon} aria-hidden='true' />
      <span>{label}</span>
    </Link>
  )
}

export const DesktopIcons: React.FC<{
  icons: DesktopShortcuts
  guardNav: GuardNav
  launchApp: (app: AppId) => void
  launchWinamp: () => void
}> = ({ icons, guardNav, launchApp, launchWinamp }) => (
  <div className={css.desktopIcons}>
    <DesktopLink
      url='/console'
      label='MS-DOS'
      ariaLabel='MS-DOS, open the console'
      icon={css.msdosIcon}
      iconId='msdos'
      icons={icons}
      guardNav={guardNav}
    />
    <DesktopLink
      url='/recycle-bin'
      label='Recycle Bin'
      ariaLabel='Open the recycle bin'
      icon={css.recycleIcon}
      iconId='recycle'
      icons={icons}
      guardNav={guardNav}
    />
    <DesktopLink
      url='/cims'
      label='Cims'
      ariaLabel='Cims, open the terrain console'
      icon={css.cimsIcon}
      iconId='cims'
      icons={icons}
      guardNav={guardNav}
    />
    <button
      type='button'
      className={css.desktopShortcut}
      aria-label='Open Minesweeper'
      data-selected={icons.selected === 'mines'}
      {...icons.press('mines', () => launchApp('mines'))}
    >
      <span className={css.minesIcon} aria-hidden='true' />
      <span>Minesweeper</span>
    </button>
    <button
      type='button'
      className={css.desktopShortcut}
      aria-label='Open Paint'
      data-selected={icons.selected === 'paint'}
      {...icons.press('paint', () => launchApp('paint'))}
    >
      <span className={css.paintIcon} aria-hidden='true' />
      <span>Paint</span>
    </button>
    <button
      type='button'
      className={css.desktopShortcut}
      aria-label='Open Winamp'
      data-selected={icons.selected === 'winamp'}
      {...icons.press('winamp', launchWinamp)}
    >
      <span className={css.winampIcon} aria-hidden='true' />
      <span>Winamp</span>
    </button>
    <button
      type='button'
      className={css.desktopShortcut}
      aria-label='Open RealPlayer'
      data-selected={icons.selected === 'realplayer'}
      {...icons.press('realplayer', () => launchApp('realplayer'))}
    >
      <span className={css.realplayerIcon} aria-hidden='true' />
      <span>RealPlayer</span>
    </button>
  </div>
)
