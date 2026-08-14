'use client'

import cn from 'clsx'
import { clamp } from 'es-toolkit'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import ReactDOM from 'react-dom'
import { tapHaptic } from 'services/haptics'
import { isEditableTarget, useGameInput } from 'services/hotkeys'
import Link from 'services/link'
import Shell from 'services/shell'
import { useTheme } from 'services/theme'
import { useRouteTransition } from 'services/transition/context'
import { ARCHIVE_ICONS } from './archive-icons'
import panelCss from './browser-panel.module.css'
import { ARCHIVE } from './catalogue'
import barCss from './control-bar.module.css'
import gridCss from './game-grid.module.css'
import css from './games.module.css'
import { createMenuSfx, type MenuSfx } from './menu-sfx'
import { CloudField, ColumnField } from './scenery'

const BOOT_DURATION_MS = 3450
const MENU_LOAD_DURATION_MS = 2300
const CHIME_RETRY_WINDOW_MS = 8000
const DESKTOP_COLUMNS = 9
const MOBILE_COLUMNS = 3
type ScenePhase = 'boot' | 'loading' | 'ready'

const isPassthroughKey = (event: KeyboardEvent) =>
  event.defaultPrevented ||
  event.metaKey ||
  event.ctrlKey ||
  event.altKey ||
  isEditableTarget(event.target)

type GridMove = (index: number, columns: number) => number

const GRID_MOVES: Record<string, GridMove> = {
  ArrowLeft: (index) => (index - 1 + ARCHIVE.length) % ARCHIVE.length,
  ArrowRight: (index) => (index + 1) % ARCHIVE.length,
  ArrowUp: (index, columns) => Math.max(0, index - columns),
  ArrowDown: (index, columns) => Math.min(ARCHIVE.length - 1, index + columns),
  Home: () => 0,
  End: () => ARCHIVE.length - 1,
}

const nextIndexFor = (key: string, index: number, columns: number) =>
  GRID_MOVES[key]?.(index, columns) ?? null

export default function GamesView() {
  ReactDOM.preload('/sounds/startup.webm', {
    as: 'audio',
    fetchPriority: 'high',
  })
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [phase, setPhase] = useState<ScenePhase>('boot')
  const links = useRef<Array<HTMLAnchorElement | null>>([])
  const grid = useRef<HTMLElement>(null)
  const transition = useRouteTransition()
  const { fxMode } = useTheme()
  useGameInput()

  const sfx = useRef<MenuSfx | null>(null)
  const startup = useRef<HTMLAudioElement>(null)
  const chimeBlockedAt = useRef<number | null>(null)
  const lastTicked = useRef(0)
  const revealPlayed = useRef(false)
  const chimePlayed = useRef(false)
  const [revived, setRevived] = useState(false)

  // cache revival re-runs effects while refs survive: a re-run after the
  // reveal latch means a return visit, so pin the menu before the paint.
  // StrictMode re-runs land before the latch and stay on the fresh path
  useLayoutEffect(() => {
    if (revealPlayed.current) setRevived(true)
  }, [])

  const playSfx = (name: keyof MenuSfx) => {
    if (fxMode === 'quiet') return
    sfx.current ??= createMenuSfx()
    sfx.current[name]()
  }

  useEffect(
    () => () => {
      sfx.current?.dispose()
      sfx.current = null
    },
    [],
  )

  useEffect(() => {
    if (fxMode === 'quiet') return
    const chime = startup.current
    if (!chimePlayed.current) {
      chimePlayed.current = true
      // autoplay without a same-page gesture rejects: the first boot
      // gesture replays it via playBlockedChime
      chime?.play().catch(() => {
        chimeBlockedAt.current = performance.now()
      })
    }
    return () => chime?.pause()
  }, [fxMode])

  // iOS grants audio only inside a tap's call stack, so pointerdown,
  // click, and keydown all route here until one attempt sticks
  const playBlockedChime = useCallback(() => {
    const blockedAt = chimeBlockedAt.current
    if (blockedAt === null) return
    if (performance.now() - blockedAt > CHIME_RETRY_WINDOW_MS) return
    void startup.current
      ?.play()
      .then(() => {
        chimeBlockedAt.current = null
      })
      .catch(() => {})
  }, [])

  const ready = phase === 'ready'
  const menuVisible = phase !== 'boot'
  const finishBoot = () => {
    playBlockedChime()
    if (phase !== 'ready') tapHaptic()
    setPhase('ready')
  }

  useEffect(() => {
    if (
      fxMode === 'quiet' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setPhase('ready')
      return
    }

    if (phase !== 'boot') return

    const timer = window.setTimeout(() => setPhase('loading'), BOOT_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [fxMode, phase])

  useEffect(() => {
    if (phase !== 'loading') return

    const timer = window.setTimeout(
      () => setPhase('ready'),
      MENU_LOAD_DURATION_MS,
    )
    return () => window.clearTimeout(timer)
  }, [phase])

  useEffect(() => {
    if (phase !== 'ready' || revealPlayed.current) return
    revealPlayed.current = true
    playSfx('reveal')
  }, [phase, playSfx])

  const selectGame = (index: number) => {
    if (lastTicked.current !== index) {
      lastTicked.current = index
      playSfx('tick')
    }
    setSelectedIndex(index)
  }

  const focusGame = (index: number) => {
    const next = clamp(index, 0, ARCHIVE.length - 1)
    selectGame(next)
    links.current[next]?.focus()
  }

  useEffect(() => {
    const handleEscape = () => {
      if (!ready) {
        setPhase('ready')
        return
      }
      playSfx('cancel')
      transition.navigateLater('/bazaar', 360)
    }

    const handleNavigation = (event: KeyboardEvent) => {
      if (!ready) setPhase('ready')

      if (event.key === 'Enter') {
        // a focused link or button keeps its native Enter (WCAG 2.1.1)
        const onInteractive =
          event.target instanceof Element &&
          event.target.closest('a, button, input, [role="button"]')
        if (!ready || onInteractive || event.repeat) return
        if (grid.current?.contains(document.activeElement)) return
        const link = links.current[selectedIndex]
        // unarmed tiles ignore Enter like they ignore clicks (see link-arm)
        if (!link || getComputedStyle(link).pointerEvents === 'none') return
        event.preventDefault()
        link.click()
        return
      }

      const columns =
        window.innerWidth <= 700 ? MOBILE_COLUMNS : DESKTOP_COLUMNS
      const nextIndex = nextIndexFor(event.key, selectedIndex, columns)
      if (nextIndex === null) return

      event.preventDefault()
      focusGame(nextIndex)
    }

    const handleKeydown = (event: KeyboardEvent) => {
      playBlockedChime()
      if (isPassthroughKey(event)) return

      if (event.key === 'Escape') {
        event.preventDefault()
        handleEscape()
        return
      }

      handleNavigation(event)
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [focusGame, playBlockedChime, playSfx, ready, selectedIndex, transition])

  const selected = ARCHIVE[selectedIndex]

  return (
    <Shell className={css.frame} shellClassName={css.shell}>
      <div
        className={css.scene}
        data-phase={phase}
        data-ready={menuVisible ? 'true' : 'false'}
        data-revived={revived ? 'true' : 'false'}
        onPointerDownCapture={finishBoot}
        onClickCapture={playBlockedChime}
      >
        {/* biome-ignore lint/a11y/useMediaCaption: the startup chime carries no speech */}
        <audio ref={startup} src='/sounds/startup.webm' preload='auto' />

        <CloudField />

        <ColumnField />

        <div className={css.signals} aria-hidden='true'>
          <span className={css.signalPink} />
          <span className={css.signalGreen} />
          <span className={css.signalBlue} />
        </div>

        <p className={css.bootMark} aria-hidden='true'>
          Loading game data
        </p>

        <section
          className={cn(panelCss.browserPanel, css.browserPanel)}
          aria-busy={phase === 'loading'}
          aria-labelledby='games-title'
        >
          {phase === 'loading' ? (
            <p
              className={cn(panelCss.menuLoading, css.menuLoading)}
              role='status'
            >
              Now loading...
            </p>
          ) : null}

          <header className={panelCss.browserHeader}>
            <div className={panelCss.archiveLabel}>
              <h1 id='games-title'>Game Archive / 1</h1>
              <p>{ARCHIVE.length.toString().padStart(2, '0')} files online</p>
            </div>

            <div className={panelCss.selectionLabel}>
              <p className={panelCss.selectedTitle} aria-live='polite'>
                {selected.title}
              </p>
              <p className={panelCss.selectedCategory}>
                {selected.code} · {selected.category}
              </p>
              <p className={panelCss.selectedDescription}>
                {selected.description}
              </p>
            </div>
          </header>

          <nav
            ref={grid}
            className={gridCss.gameGrid}
            aria-label='Available games and toys'
          >
            {ARCHIVE.map((entry, index) => {
              const active = selectedIndex === index
              const Icon = ARCHIVE_ICONS[entry.id]
              return (
                <Link
                  key={entry.id}
                  ref={(node) => {
                    links.current[index] = node
                  }}
                  url={entry.href}
                  className={cn(gridCss.gameLink, css.gameLink)}
                  data-active={active ? 'true' : 'false'}
                  tabIndex={ready ? 0 : -1}
                  aria-label={`${entry.title}. ${entry.description} Controls: ${entry.controls}.`}
                  onFocus={() => selectGame(index)}
                  onPointerEnter={() => selectGame(index)}
                  onPointerDown={() => selectGame(index)}
                  onClick={() => {
                    playSfx('confirm')
                    tapHaptic()
                  }}
                >
                  <span className={cn(gridCss.iconStage, css.iconStage)}>
                    <span className={cn(gridCss.iconWrap, css.iconWrap)}>
                      <Icon />
                      <span className={gridCss.cursor} aria-hidden='true' />
                    </span>
                  </span>
                  <span className={gridCss.gameName} aria-hidden='true'>
                    {entry.title}
                  </span>
                </Link>
              )
            })}
          </nav>

          <footer className={barCss.controls}>
            <div className={barCss.controlGroup}>
              <span className={barCss.controlLegend}>
                <span className={barCss.crossKey} aria-hidden='true'>
                  ×
                </span>
                Enter
              </span>
              <Link
                url='/bazaar'
                className={barCss.controlLink}
                aria-label='Back to the bazaar'
                onClick={() => {
                  playSfx('cancel')
                  tapHaptic()
                }}
              >
                <span className={barCss.circleKey} aria-hidden='true'>
                  ○
                </span>
                Back
              </Link>
            </div>
            <p className={barCss.controlHint}>
              <span aria-hidden='true'>← ↑ ↓ →</span> Choose a game
            </p>
          </footer>
        </section>

        <p className={css.systemMark} aria-hidden='true'>
          MIDNIGHT I/O · GAME DATA
        </p>
      </div>
    </Shell>
  )
}
