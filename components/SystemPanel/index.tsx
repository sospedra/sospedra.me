'use client'

import Link from 'components/Link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'
import { useHotkeys } from 'service/hotkeys'
import { getRouteSignal, ROUTE_SIGNALS } from 'service/routes'
import { ANOMALIES, useSystem } from 'service/system'
import { useTheme } from 'service/theme'
import css from './system-panel.module.css'

const FIREWORKS_PATH = '/papers/scroll-60fps-animation'

export default function SystemPanel() {
  const pathname = usePathname() || '/'
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const { anomalies } = useSystem()
  const { fxMode, osReducedMotion, palette, setFxMode, setPalette } = useTheme()
  const signal = getRouteSignal(pathname)

  const open = useCallback(() => {
    const dialog = dialogRef.current
    if (!dialog || dialog.open) return
    dialog.showModal()
    requestAnimationFrame(() => closeRef.current?.focus())
  }, [])

  const close = useCallback(() => {
    dialogRef.current?.close()
  }, [])

  useHotkeys([
    ['?', open],
    ['Escape', close],
  ])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const onClick = (event: MouseEvent) => {
      if (event.target === dialog) close()
    }
    dialog.addEventListener('click', onClick)
    return () => dialog.removeEventListener('click', onClick)
  }, [close])

  // The user asked for the Fireworks paper to remain entirely undisturbed.
  if (pathname === FIREWORKS_PATH) return null

  return (
    <>
      <button
        type='button'
        className={css.launcher}
        onClick={open}
        aria-haspopup='dialog'
        aria-label='Open Midnight I/O system panel'
      >
        <span aria-hidden='true'>▼</span>
        <span>SYSTEM</span>
        <kbd>?</kbd>
      </button>

      <dialog
        ref={dialogRef}
        className={css.dialog}
        aria-labelledby='system-panel-title'
        onCancel={close}
      >
        <div className={css.window}>
          <header className={css.titlebar}>
            <div>
              <p>MIDNIGHT I/O</p>
              <h2 id='system-panel-title'>System control</h2>
            </div>
            <button
              ref={closeRef}
              type='button'
              onClick={close}
              aria-label='Close system control'
            >
              ×
            </button>
          </header>

          <div className={css.signal}>
            <span>SECTOR {signal.sector}</span>
            <span>{signal.label}</span>
            <span>{signal.status}</span>
          </div>

          <div className={css.grid}>
            <section aria-labelledby='system-route-title'>
              <h3 id='system-route-title'>Route map</h3>
              <nav aria-label='Midnight I/O sectors'>
                <ul className={css.routes}>
                  {ROUTE_SIGNALS.slice(0, 8).map((route) => (
                    <li key={route.href} data-current={route.href === pathname}>
                      <span>{route.sector}</span>
                      <Link url={route.href} onClick={close}>
                        {route.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </section>

            <section aria-labelledby='system-fx-title'>
              <h3 id='system-fx-title'>Display protocol</h3>
              <div className={css.setting}>
                <div>
                  <p>Effects</p>
                  <small>
                    {osReducedMotion
                      ? 'Quiet mode locked by your OS preference.'
                      : 'Ambient motion and transition flourishes.'}
                  </small>
                </div>
                <button
                  type='button'
                  aria-pressed={fxMode === 'quiet'}
                  disabled={osReducedMotion}
                  onClick={() =>
                    setFxMode(fxMode === 'full' ? 'quiet' : 'full')
                  }
                >
                  FX / {fxMode.toUpperCase()}
                </button>
              </div>
              <div className={css.setting}>
                <div>
                  <p>Palette</p>
                  <small>A service-bench phosphor variant.</small>
                </div>
                <button
                  type='button'
                  aria-pressed={palette === 'maintenance'}
                  onClick={() =>
                    setPalette(
                      palette === 'midnight' ? 'maintenance' : 'midnight',
                    )
                  }
                >
                  {palette === 'midnight' ? 'MIDNIGHT' : 'MAINTENANCE'}
                </button>
              </div>
            </section>

            <section aria-labelledby='system-anomaly-title'>
              <h3 id='system-anomaly-title'>Signal anomalies</h3>
              <p className={css.counter}>
                {anomalies.length.toString().padStart(2, '0')} /{' '}
                {Object.keys(ANOMALIES).length.toString().padStart(2, '0')}{' '}
                logged
              </p>
              <ol className={css.anomalies}>
                {Object.entries(ANOMALIES).map(([id, label], index) => (
                  <li key={id}>
                    <span className={css.anomalyIndex}>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {anomalies.includes(id as keyof typeof ANOMALIES)
                      ? label
                      : 'UNRESOLVED TRANSMISSION'}
                  </li>
                ))}
              </ol>
            </section>

            <section aria-labelledby='system-keys-title'>
              <h3 id='system-keys-title'>Keyboard uplink</h3>
              <dl className={css.keys}>
                <div>
                  <dt>
                    <kbd>h</kbd>
                  </dt>
                  <dd>Origin</dd>
                </div>
                <div>
                  <dt>
                    <kbd>p</kbd>
                  </dt>
                  <dd>Papers</dd>
                </div>
                <div>
                  <dt>
                    <kbd>a</kbd>
                  </dt>
                  <dd>About</dd>
                </div>
                <div>
                  <dt>
                    <kbd>b</kbd>
                  </dt>
                  <dd>Back</dd>
                </div>
                <div>
                  <dt>
                    <kbd>j / k</kbd>
                  </dt>
                  <dd>Move cursor</dd>
                </div>
                <div>
                  <dt>
                    <kbd>esc</kbd>
                  </dt>
                  <dd>Close / skip</dd>
                </div>
              </dl>
            </section>
          </div>
        </div>
      </dialog>
    </>
  )
}
