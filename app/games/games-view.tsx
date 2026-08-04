'use client'

import { clamp } from 'es-toolkit'
import { useEffect, useRef, useState } from 'react'
import { isEditableTarget, useGameInput } from 'services/hotkeys'
import Link from 'services/link'
import Shell from 'services/shell'
import { useTheme } from 'services/theme'
import { useRouteTransition } from 'services/transition/context'
import { GAMES } from './catalogue'
import { GAME_ICONS } from './game-icons'
import css from './games.module.css'
import { createMenuSfx, type MenuSfx } from './menu-sfx'
import { CloudField, ColumnField } from './scenery'

const BOOT_DURATION_MS = 3450
const MENU_LOAD_DURATION_MS = 2300
const DESKTOP_COLUMNS = 7
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
  ArrowLeft: (index) => (index - 1 + GAMES.length) % GAMES.length,
  ArrowRight: (index) => (index + 1) % GAMES.length,
  ArrowUp: (index, columns) => Math.max(0, index - columns),
  ArrowDown: (index, columns) => Math.min(GAMES.length - 1, index + columns),
  Home: () => 0,
  End: () => GAMES.length - 1,
}

const nextIndexFor = (key: string, index: number, columns: number) =>
  GRID_MOVES[key]?.(index, columns) ?? null

export default function GamesView() {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [phase, setPhase] = useState<ScenePhase>('boot')
  const links = useRef<Array<HTMLAnchorElement | null>>([])
  const grid = useRef<HTMLElement>(null)
  const transition = useRouteTransition()
  const { fxMode } = useTheme()
  useGameInput()

  const sfx = useRef<MenuSfx | null>(null)
  const lastTicked = useRef(0)
  const revealPlayed = useRef(false)

  const playSfx = (name: keyof MenuSfx) => {
    if (fxMode === 'quiet') return
    sfx.current ??= createMenuSfx()
    sfx.current[name]()
  }

  const ready = phase === 'ready'
  const menuVisible = phase !== 'boot'
  const finishBoot = () => setPhase('ready')

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
    const next = clamp(index, 0, GAMES.length - 1)
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
        if (!ready || onInteractive) return
        if (grid.current?.contains(document.activeElement)) return
        event.preventDefault()
        links.current[selectedIndex]?.click()
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
  }, [focusGame, playSfx, ready, selectedIndex, transition])

  const selected = GAMES[selectedIndex]

  return (
    <Shell className={css.frame} shellClassName={css.shell}>
      <div
        className={css.scene}
        data-phase={phase}
        data-ready={menuVisible ? 'true' : 'false'}
        onPointerDownCapture={finishBoot}
      >
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
          className={css.browserPanel}
          aria-busy={phase === 'loading'}
          aria-labelledby='games-title'
        >
          {phase === 'loading' ? (
            <p className={css.menuLoading} role='status'>
              Now loading...
            </p>
          ) : null}

          <header className={css.browserHeader}>
            <div className={css.archiveLabel}>
              <h1 id='games-title'>Game Archive / 1</h1>
              <p>{GAMES.length.toString().padStart(2, '0')} files online</p>
            </div>

            <div className={css.selectionLabel}>
              <p className={css.selectedTitle} aria-live='polite'>
                {selected.title}
              </p>
              <p className={css.selectedCategory}>
                {selected.code} · {selected.category}
              </p>
              <p className={css.selectedDescription}>{selected.description}</p>
            </div>
          </header>

          <nav ref={grid} className={css.gameGrid} aria-label='Available games'>
            {GAMES.map((game, index) => {
              const active = selectedIndex === index
              const Icon = GAME_ICONS[game.id]
              return (
                <Link
                  key={game.id}
                  ref={(node) => {
                    links.current[index] = node
                  }}
                  url={game.href}
                  className={css.gameLink}
                  data-active={active ? 'true' : 'false'}
                  tabIndex={ready ? 0 : -1}
                  aria-label={`${game.title}. ${game.description} Controls: ${game.controls}.`}
                  onFocus={() => selectGame(index)}
                  onPointerEnter={() => selectGame(index)}
                  onPointerDown={() => selectGame(index)}
                  onClick={() => playSfx('confirm')}
                >
                  <span className={css.iconStage}>
                    <span className={css.iconWrap}>
                      <Icon />
                      <span className={css.cursor} aria-hidden='true' />
                    </span>
                  </span>
                  <span className={css.gameName} aria-hidden='true'>
                    {game.title}
                  </span>
                </Link>
              )
            })}
          </nav>

          <footer className={css.controls}>
            <div className={css.controlGroup}>
              <span className={css.controlLegend}>
                <span className={css.crossKey} aria-hidden='true'>
                  ×
                </span>
                Enter
              </span>
              <Link
                url='/bazaar'
                className={css.controlLink}
                aria-label='Back to the bazaar'
                onClick={() => playSfx('cancel')}
              >
                <span className={css.circleKey} aria-hidden='true'>
                  ○
                </span>
                Back
              </Link>
            </div>
            <p className={css.controlHint}>
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
