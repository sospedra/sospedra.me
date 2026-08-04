import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import w98 from '../w98.module.css'
import css from './realplayer-menu.module.css'
import { REAL_STATIONS, type RealStation } from './stations.ts'
import type { Tuner } from './use-tuner.ts'

type MenuId = 'file' | 'help' | 'presets'

const DeadMenuItems: React.FC<{ labels: string[] }> = ({ labels }) => (
  <>
    {labels.map((label) => (
      <button
        key={label}
        type='button'
        className={`${w98.menuItem} ${css.menuDisabled}`}
        disabled
      >
        <span>{label}</span>
      </button>
    ))}
  </>
)

export const RealMenubar: React.FC<{
  tuner: Tuner
  close: () => void
}> = ({ tuner, close }) => {
  const [menu, setMenu] = useState<MenuId | null>(null)
  const triggerRefs = useRef<Partial<Record<MenuId, HTMLButtonElement | null>>>(
    {},
  )

  useEffect(() => {
    if (!menu) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMenu(null)
      triggerRefs.current[menu]?.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [menu])

  const toggle = (id: MenuId) => setMenu((open) => (open === id ? null : id))
  const pick = (station: RealStation) => {
    tuner.tune(station)
    setMenu(null)
    triggerRefs.current.presets?.focus()
  }

  const trigger = (id: MenuId, label: React.ReactNode) => (
    <button
      ref={(node) => {
        triggerRefs.current[id] = node
      }}
      type='button'
      className={w98.menuTrigger}
      aria-haspopup='true'
      aria-expanded={menu === id}
      onClick={() => toggle(id)}
    >
      {label}
    </button>
  )

  return (
    <>
      {menu && (
        <button
          type='button'
          className={w98.menuBackdrop}
          aria-label='Close menu'
          onClick={() => setMenu(null)}
        />
      )}
      <nav className={w98.menubar} aria-label='RealPlayer menus'>
        <div className={w98.menuSlot}>
          {trigger(
            'file',
            <>
              <u>F</u>ile
            </>,
          )}
          {menu === 'file' && (
            <div className={w98.menu}>
              <button
                type='button'
                className={w98.menuItem}
                onClick={() => {
                  setMenu(null)
                  triggerRefs.current.file?.focus()
                  close()
                }}
              >
                <span>Exit</span>
              </button>
            </div>
          )}
        </div>
        <div className={w98.menuSlot}>
          {trigger(
            'presets',
            <>
              <u>P</u>resets
            </>,
          )}
          {menu === 'presets' && (
            <div className={`${w98.menu} ${css.presetsMenu}`}>
              {REAL_STATIONS.map((station) => (
                <button
                  key={station.id}
                  type='button'
                  aria-pressed={tuner.state.stationId === station.id}
                  className={w98.menuItem}
                  onClick={() => pick(station)}
                >
                  <span>
                    <span className={w98.check} aria-hidden='true'>
                      {tuner.state.stationId === station.id ? '✓' : ''}
                    </span>
                    {station.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className={w98.menuSlot}>
          {trigger(
            'help',
            <>
              <u>H</u>elp
            </>,
          )}
          {menu === 'help' && (
            <div className={w98.menu}>
              <DeadMenuItems labels={['About RealPlayer G2']} />
            </div>
          )}
        </div>
      </nav>
    </>
  )
}
