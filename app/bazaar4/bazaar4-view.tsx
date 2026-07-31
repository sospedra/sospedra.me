'use client'

import cn from 'clsx'
import Link from 'components/Link'
import SpriteCar from 'components/Sprite/Car'
import type { Route } from 'next'
import { Press_Start_2P } from 'next/font/google'
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { type StallId, setSoundEnabled, sfx } from '../bazaar/sounds'
import styles from './bazaar4.module.css'
import {
  GLOW_COLORS,
  type ResolvedItem,
  STAGE_RESOLVED,
  STREET_RESOLVED,
} from './decor-manifest'
import LayoutEditor from './layout-editor'
import SceneStall from './scene-stall'
import { type Bazaar4StallId, SIM_DIMS, STALL_SCENES } from './stalls-manifest'

const pixelFont = Press_Start_2P({ weight: '400', subsets: ['latin'] })

const STREET = '/images/bazaar4/street'
const ARCH_ASSETS = '/images/bazaar4/arch'

/* per-stall tuning from the 2026-07-31 layout-editor session */
const STALL_TUNE: Partial<Record<Bazaar4StallId, number>> = {
  console: 0.86,
  travel: 1.05,
  manual: 1.019,
}

/* sim units for one stall box: r17 rect at the r15 contract scale,
   times the editor-approved tune factor */
const simSize = (id: Bazaar4StallId) => {
  const scene = STALL_SCENES[id]
  const dims = SIM_DIMS[id]
  const scale = (dims.dispH / dims.artH) * (STALL_TUNE[id] ?? 1)
  return {
    w: Math.round(scene.rect.width * scale),
    h: Math.round(scene.rect.height * scale),
  }
}

/* ---------- direction grid: 5vw x 5svh, labels every step ---------- */

const GRID_STEPS = Array.from({ length: 19 }, (_, i) => (i + 1) * 5)

function Grid() {
  return (
    <div className={styles.grid} aria-hidden>
      {GRID_STEPS.map((v) => (
        <span
          key={`v${v}`}
          className={styles.gridLabelV}
          style={{ left: `${v}vw` }}
        >
          {v}
        </span>
      ))}
      {GRID_STEPS.map((v) => (
        <span
          key={`h${v}`}
          className={styles.gridLabelH}
          style={{ top: `${v}svh` }}
        >
          {v}
        </span>
      ))}
    </div>
  )
}

/* ---------- street floor: the gemini extraction kit ---------- */

function StreetFloor({ onDoor }: { onDoor: () => void }) {
  return (
    <section className={styles.floor} data-floor='' data-market-scene=''>
      <img
        src={`${STREET}/bg-tower.png`}
        alt=''
        className={styles.sTower}
        aria-hidden
      />
      <div className={styles.streetBg} />
      <div className={styles.sAlleySigns} aria-hidden>
        <img src={`${STREET}/alley-signs-1.png`} alt='' />
        <img src={`${STREET}/alley-signs-2.png`} alt='' data-alt='' />
      </div>
      <div className={styles.alleyShade} aria-hidden />
      <img src={`${STREET}/building-pad.png`} alt='' className={styles.sPadL} />
      <img src={`${STREET}/building-pad.png`} alt='' className={styles.sPadR} />
      <img src={`${STREET}/building-a.png`} alt='' className={styles.sA} />
      <div className={styles.sCDWrap}>
        <img
          src={`${STREET}/building-cd.png`}
          alt=''
          className={styles.sCDImg}
        />
        <div className={styles.sNeon} aria-hidden>
          <img src={`${STREET}/neon-off.png`} alt='' />
          <div className={styles.sNeonOn}>
            <img src={`${STREET}/neon.png`} alt='Bazaar' />
          </div>
        </div>
        <button
          type='button'
          className={cn(styles.hit, styles.sDoor)}
          data-label='door'
          aria-label='enter the market'
          onMouseEnter={() => sfx.hover()}
          onClick={() => {
            sfx.door()
            setTimeout(onDoor, 350)
          }}
        >
          <img src={`${STREET}/door.png`} alt='' />
          <img src={`${STREET}/door-open-1.png`} alt='' data-frame='1' />
          <img src={`${STREET}/door-open-2.png`} alt='' data-frame='2' />
        </button>
      </div>
      <div className={styles.alleyGlow} aria-hidden />
      <FloorStage items={STREET_RESOLVED} onUp={() => {}} />
      <div className={styles.sFloor} />
      <div className={styles.sCar} aria-hidden>
        <div className={styles.sCarStretch}>
          <div className={styles.sCarSquash}>
            <div className={styles.sCarScale}>
              <SpriteCar engineOn isMoving />
            </div>
          </div>
        </div>
      </div>
      <Link
        url='/'
        className={cn(styles.hit, styles.sBus)}
        data-label='bus'
        aria-label='bus stop: exit to the city'
        onMouseEnter={() => sfx.hover()}
        onClick={() => sfx.bus()}
      >
        <img src={`${STREET}/bus.png`} alt='' />
        <img src={`${STREET}/bus-on.png`} alt='' data-on='' />
      </Link>
    </section>
  )
}

/* ---------- stalls ---------- */

/* sounds.ts still speaks v4 ids */
const SFX_ID: Record<Bazaar4StallId, StallId> = {
  uses: 'uses',
  games: 'games',
  travel: 'travel',
  manual: 'manual',
  console: 'serve',
  w98: 'projects',
  talks: 'talks',
  papers: 'papers',
}

type StallLink = { label: string; href: string; external?: boolean }

type StallSpec = {
  label: string
  href: Route
  external?: boolean
  tint: string
  desc: string
  links: StallLink[]
}

const USES_DIALOG = [
  'Omakase.',
  'Hardware. Software.',
  'Only what survives service',
  'makes the menu.',
].join('\n')
const PAPERS_DIALOG = [
  '[signal stabilizes]',
  'Types. Platforms. Politics.',
  'Epistemics get messy.',
  'Choose a paper.',
].join('\n')
const MANUAL_DIALOG = [
  'Right then, colleague!',
  'Values: sound.',
  'Blind spots: BZZT...',
  'Trust needs servicing.',
].join('\n')
const CONSOLE_DIALOG = [
  'Ooh! A human cursor!',
  'So many tiny doors.',
  'Type HELP.',
].join('\n')
const TALKS_DIALOG = [
  'First rule of Video Club:',
  'pick a tape.',
  'The talks get technical.',
  'Be kind. Rewind.',
].join('\n')
const W98_DIALOG = [
  'Bzzt. Mind the hose.',
  'The plants grew on me.',
  'Booting takes a minute.',
].join('\n')
const TRAVEL_DIALOG = [
  'New friend!',
  'Supernova in twenty-two.',
  'Coming?',
].join('\n')
const GAMES_CONVERSATION = [
  { speaker: 'sister', text: 'NEW CHALLENGER!!!' },
  { speaker: 'brother', text: "We don't know them." },
  { speaker: 'sister', text: 'Best of three?' },
  { speaker: 'brother', text: 'I choose.' },
] as const

const STALLS: Record<Bazaar4StallId, StallSpec> = {
  uses: {
    label: 'uses',
    href: '/uses',
    tint: '#e06080',
    desc: USES_DIALOG,
    links: [{ label: 'browse the gear', href: '/uses' }],
  },
  games: {
    label: 'games',
    href: '/snake',
    tint: '#4a90d9',
    desc: GAMES_CONVERSATION.map((turn) => turn.text).join('\n'),
    links: [
      { label: 'snake', href: '/snake' },
      { label: 'rubiks', href: '/rubiks' },
    ],
  },
  travel: {
    label: 'travel',
    href: '/travel',
    tint: '#7a6fe6',
    desc: TRAVEL_DIALOG,
    links: [{ label: 'see the flight log', href: '/travel' }],
  },
  manual: {
    label: 'manual',
    href: '/manual',
    tint: '#e06080',
    desc: MANUAL_DIALOG,
    links: [{ label: 'read the manual', href: '/manual' }],
  },
  console: {
    label: 'console',
    href: '/console',
    tint: '#a8b04a',
    desc: CONSOLE_DIALOG,
    links: [{ label: 'open the archive', href: '/console' }],
  },
  w98: {
    label: 'w98',
    href: '/w98',
    tint: '#4bd2e1',
    desc: W98_DIALOG,
    links: [{ label: 'boot windows 98', href: '/w98' }],
  },
  talks: {
    label: 'talks',
    href: '/videoclub',
    tint: '#e0a040',
    desc: TALKS_DIALOG,
    links: [{ label: 'play the tapes', href: '/videoclub' }],
  },
  papers: {
    label: 'papers',
    href: '/papers',
    tint: '#7ab0d0',
    desc: PAPERS_DIALOG,
    links: [{ label: 'read the papers', href: '/papers' }],
  },
}

type DialogPosition = { left: number; top: number }

const TYPEWRITER_INTERVAL_MS = 9
const GAMES_TURN_PAUSE_CHARS = 10

const countCharacters = (value: string) => Array.from(value).length
const sliceCharacters = (value: string, length: number) =>
  Array.from(value).slice(0, length).join('')

function getDialogCharacterCount(desc: string, links: readonly StallLink[]) {
  return (
    countCharacters(desc) +
    links.reduce((total, link) => total + countCharacters(link.label), 0)
  )
}

function getVisibleCharacters(
  timelinePosition: number,
  start: number,
  length: number,
) {
  return Math.min(length, Math.max(0, timelinePosition - start))
}

function useTypewriter(active: boolean, totalCharacters: number) {
  const [visibleChars, setVisibleChars] = useState(0)

  useEffect(() => {
    if (!active) {
      setVisibleChars(0)
      return
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisibleChars(totalCharacters)
      return
    }

    setVisibleChars(0)
    const timer = window.setInterval(() => {
      setVisibleChars((current) => {
        const next = Math.min(current + 1, totalCharacters)
        if (next >= totalCharacters) window.clearInterval(timer)
        return next
      })
    }, TYPEWRITER_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [active, totalCharacters])

  const finish = useCallback(
    () => setVisibleChars(totalCharacters),
    [totalCharacters],
  )

  return { finish, visibleChars }
}

function DialogContent(props: {
  desc: string
  links: readonly StallLink[]
  visibleChars: number
  onLinkFocus: () => void
}) {
  const { desc, links, onLinkFocus, visibleChars } = props
  const descLength = countCharacters(desc)
  const descVisibleChars = Math.min(visibleChars, descLength)
  let linkStart = descLength

  return (
    <>
      <p
        className={cn(
          styles.dialogDesc,
          links.length === 0 && styles.dialogDescSolo,
        )}
      >
        <span className={styles.srOnly}>{desc}</span>
        <span className={styles.typeMeasure} aria-hidden>
          {desc}
        </span>
        <span className={styles.typeText} aria-hidden>
          {sliceCharacters(desc, descVisibleChars)}
          {descVisibleChars < descLength && (
            <span className={styles.typeCursor}>_</span>
          )}
        </span>
      </p>
      {links.length > 0 && (
        <div className={styles.dialogLinks}>
          {links.map((link) => {
            const linkLength = countCharacters(link.label)
            const linkVisibleChars = getVisibleCharacters(
              visibleChars,
              linkStart,
              linkLength,
            )
            const started = visibleChars >= linkStart
            linkStart += linkLength
            const content = (
              <>
                <span className={styles.linkTypeMeasure} aria-hidden>
                  {link.label}
                </span>
                <span className={styles.linkTypeText} aria-hidden>
                  {sliceCharacters(link.label, linkVisibleChars)}
                  {started && linkVisibleChars < linkLength && (
                    <span className={styles.typeCursor}>_</span>
                  )}
                </span>
              </>
            )
            const className = cn(!started && styles.dialogLinkPending)

            return link.external ? (
              <a
                key={link.href}
                href={link.href}
                target='_blank'
                rel='noreferrer'
                aria-label={link.label}
                className={className}
                onClick={() => sfx.click()}
                onFocus={onLinkFocus}
              >
                {content}
              </a>
            ) : (
              <Link
                key={link.href}
                url={link.href as Route}
                aria-label={link.label}
                className={className}
                onClick={() => sfx.click()}
                onFocus={onLinkFocus}
              >
                {content}
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}

function AnimatedDialogContent(props: {
  desc: string
  links: readonly StallLink[]
  active: boolean
}) {
  const { active, desc, links } = props
  const totalCharacters = getDialogCharacterCount(desc, links)
  const { finish, visibleChars } = useTypewriter(active, totalCharacters)

  return (
    <DialogContent
      desc={desc}
      links={links}
      visibleChars={visibleChars}
      onLinkFocus={finish}
    />
  )
}

function Dialog(props: {
  spec: StallSpec
  active: boolean
  position: DialogPosition | null
  dialogRef: React.RefObject<HTMLDivElement | null>
  onMouseEnter: () => void
  onMouseLeave: () => void
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void
}) {
  const {
    spec,
    active,
    position,
    dialogRef,
    onMouseEnter,
    onMouseLeave,
    onKeyDown,
  } = props

  if (!active || !position || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={dialogRef}
      role='dialog'
      aria-label={`${spec.label} stall details`}
      className={cn(styles.dialog, pixelFont.className)}
      style={{ left: position.left, top: position.top }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onKeyDown={onKeyDown}
    >
      <AnimatedDialogContent
        desc={spec.desc}
        links={spec.links}
        active={active}
      />
    </div>,
    document.body,
  )
}

function GamesDialogs(props: {
  spec: StallSpec
  active: boolean
  position: DialogPosition | null
  dialogRef: React.RefObject<HTMLDivElement | null>
  onMouseEnter: () => void
  onMouseLeave: () => void
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void
}) {
  const {
    spec,
    active,
    position,
    dialogRef,
    onMouseEnter,
    onMouseLeave,
    onKeyDown,
  } = props
  const lastTurnIndex = GAMES_CONVERSATION.length - 1
  const turnLengths = GAMES_CONVERSATION.map((turn, index) =>
    getDialogCharacterCount(
      turn.text,
      index === lastTurnIndex ? spec.links : [],
    ),
  )
  const totalCharacters =
    turnLengths.reduce((total, length) => total + length, 0) +
    GAMES_TURN_PAUSE_CHARS * lastTurnIndex
  const { finish, visibleChars } = useTypewriter(active, totalCharacters)

  useLayoutEffect(() => {
    const dialogs = dialogRef.current
    if (!active || !position || !dialogs) return

    dialogs.style.setProperty('--dialog-shift-x', '0px')
    dialogs.style.setProperty('--dialog-shift-y', '0px')

    const rect = dialogs.getBoundingClientRect()
    const gutter = 8
    let shiftX = 0
    let shiftY = 0

    if (rect.left < gutter) shiftX = gutter - rect.left
    else if (rect.right > window.innerWidth - gutter) {
      shiftX = window.innerWidth - gutter - rect.right
    }

    if (rect.top < gutter) shiftY = gutter - rect.top
    else if (rect.bottom > window.innerHeight - gutter) {
      shiftY = window.innerHeight - gutter - rect.bottom
    }

    dialogs.style.setProperty('--dialog-shift-x', `${shiftX}px`)
    dialogs.style.setProperty('--dialog-shift-y', `${shiftY}px`)
  }, [active, dialogRef, position])

  if (!active || !position || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={dialogRef}
      role='dialog'
      aria-label='Games stall conversation'
      className={cn(styles.gamesDialogs, pixelFont.className)}
      style={{ left: position.left, top: position.top }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onKeyDown={onKeyDown}
    >
      {GAMES_CONVERSATION.map((turn, index) => {
        const links = index === lastTurnIndex ? spec.links : []
        const turnStart =
          turnLengths
            .slice(0, index)
            .reduce((total, length) => total + length, 0) +
          GAMES_TURN_PAUSE_CHARS * index
        const started = visibleChars >= turnStart
        const turnVisibleChars = getVisibleCharacters(
          visibleChars,
          turnStart,
          turnLengths[index],
        )

        return (
          <div
            key={`${turn.speaker}-${turn.text}`}
            className={cn(
              styles.dialog,
              styles.gamesDialog,
              turn.speaker === 'sister'
                ? styles.gamesDialogSister
                : styles.gamesDialogBrother,
              !started && styles.gamesDialogPending,
            )}
          >
            <span className={styles.srOnly}>{turn.speaker} says: </span>
            <DialogContent
              desc={turn.text}
              links={links}
              visibleChars={turnVisibleChars}
              onLinkFocus={finish}
            />
          </div>
        )
      })}
    </div>,
    document.body,
  )
}

function Stall({ id }: { id: Bazaar4StallId }) {
  const spec = STALLS[id]
  const scene = STALL_SCENES[id]
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const [dialogPosition, setDialogPosition] = useState<DialogPosition | null>(
    null,
  )
  const wrapRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<number | null>(null)
  const active = open || focused

  const updateDialogPosition = useCallback(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const rect = wrap.getBoundingClientRect()
    const mobile = window.innerWidth <= 700
    const maxWidth = Math.min(
      mobile ? 240 : 300,
      window.innerWidth * (mobile ? 0.62 : 0.76),
    )
    const half = maxWidth / 2
    setDialogPosition({
      left: Math.min(
        window.innerWidth - half - 8,
        Math.max(half + 8, rect.left + rect.width / 2),
      ),
      top: rect.top,
    })
  }, [])

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => {
      const target = e.target as Node
      if (
        !wrapRef.current?.contains(target) &&
        !dialogRef.current?.contains(target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  useEffect(() => {
    if (!active) return
    window.addEventListener('resize', updateDialogPosition)
    window.addEventListener('scroll', updateDialogPosition, true)
    return () => {
      window.removeEventListener('resize', updateDialogPosition)
      window.removeEventListener('scroll', updateDialogPosition, true)
    }
  }, [active, updateDialogPosition])

  useEffect(
    () => () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current)
      }
    },
    [],
  )

  const openOnHover = () => {
    if (!window.matchMedia('(hover: hover)').matches) return
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    updateDialogPosition()
    setOpen(true)
  }

  const closeAfterHover = () => {
    if (!window.matchMedia('(hover: hover)').matches) return
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false)
      closeTimerRef.current = null
    }, 140)
  }

  /* mobile: the first tap opens the dialog instead of navigating */
  const guardTap = (e: React.MouseEvent) => {
    const coarse = window.matchMedia('(hover: none)').matches
    if (coarse && !open) {
      e.preventDefault()
      updateDialogPosition()
      setOpen(true)
      sfx.stall(SFX_ID[id])
      return
    }
    sfx.click()
  }

  const focusDialogOnTab = (event: React.KeyboardEvent<HTMLAnchorElement>) => {
    if (event.key !== 'Tab' || event.shiftKey) return
    const firstLink =
      dialogRef.current?.querySelector<HTMLAnchorElement>('a[href]')
    if (!firstLink) return
    event.preventDefault()
    firstLink.focus()
  }

  const keepDialogInTabOrder = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return
    const links =
      dialogRef.current?.querySelectorAll<HTMLAnchorElement>('a[href]')
    if (!links?.length) return

    if (event.shiftKey && document.activeElement === links[0]) {
      event.preventDefault()
      wrapRef.current?.querySelector<HTMLAnchorElement>('a[href]')?.focus()
      return
    }
    if (event.shiftKey || document.activeElement !== links[links.length - 1]) {
      return
    }

    let sibling = wrapRef.current?.nextElementSibling
    while (sibling) {
      const nextStall = sibling.querySelector<HTMLAnchorElement>('a[href]')
      if (nextStall) {
        event.preventDefault()
        nextStall.focus()
        return
      }
      sibling = sibling.nextElementSibling
    }
  }

  const stallProps = {
    className: styles.stall,
    'aria-label': spec.label,
    'data-label': spec.label,
    onClick: guardTap,
    onMouseEnter: () => sfx.stall(SFX_ID[id]),
    onKeyDown: focusDialogOnTab,
  }
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: coordinates hover and focus state for the child link and its portalled dialog
    <div
      ref={wrapRef}
      className={cn(styles.stallWrap, active && styles.dialogOpen)}
      style={
        {
          '--tint': spec.tint,
          '--ar': scene.rect.width / scene.rect.height,
          '--sw': simSize(id).w,
          '--sh': simSize(id).h,
        } as React.CSSProperties
      }
      data-stall={id}
      data-edit-id={id}
      onMouseEnter={openOnHover}
      onMouseLeave={closeAfterHover}
      onFocusCapture={() => {
        updateDialogPosition()
        setFocused(true)
      }}
      onBlurCapture={(event) => {
        const next = event.relatedTarget as Node | null
        if (
          !event.currentTarget.contains(next) &&
          !dialogRef.current?.contains(next)
        ) {
          setFocused(false)
        }
      }}
    >
      <Link {...stallProps} url={spec.href}>
        <SceneStall id={id} active={active} />
        <div className={styles.glowWash} />
      </Link>
      {id === 'games' ? (
        <GamesDialogs
          spec={spec}
          active={active}
          position={dialogPosition}
          dialogRef={dialogRef}
          onMouseEnter={openOnHover}
          onMouseLeave={closeAfterHover}
          onKeyDown={keepDialogInTabOrder}
        />
      ) : (
        <Dialog
          spec={spec}
          active={active}
          position={dialogPosition}
          dialogRef={dialogRef}
          onMouseEnter={openOnHover}
          onMouseLeave={closeAfterHover}
          onKeyDown={keepDialogInTabOrder}
        />
      )}
    </div>
  )
}

type Side = 'left' | 'right'

function Stairs(props: { side?: Side; mobile?: boolean }) {
  const { side, mobile = false } = props
  if (!mobile) {
    return (
      <div
        className={cn(
          styles.stairsSim,
          side === 'left'
            ? cn(styles.stairsSimL, styles.stairsMirror)
            : styles.stairsSimR,
        )}
        data-edit-id='stairs'
      >
        <img
          src={`${ARCH_ASSETS}/stairs.png`}
          alt=''
          draggable={false}
          loading='lazy'
        />
      </div>
    )
  }
  return (
    <div className={styles.stairs}>
      <div className={styles.mobileFloorSplit} aria-hidden>
        <span className={styles.mobileFloorSplitTile} />
      </div>
      <img
        src={`${STREET}/stairs-mobile.png`}
        alt=''
        className={styles.stairsColumn}
        draggable={false}
        loading='lazy'
      />
    </div>
  )
}

function WayfindingSigns(props: {
  stairsSide: Side
  onUp: () => void
  onDown?: () => void
}) {
  const { stairsSide, onUp, onDown } = props
  const downSide: Side = stairsSide === 'left' ? 'right' : 'left'
  const sideClass = (side: Side) =>
    side === 'left' ? styles.wayfindingLeft : styles.wayfindingRight

  return (
    <div className={styles.wayfindingRail}>
      <button
        type='button'
        aria-label='go up to the previous floor'
        className={cn(styles.wayfindingSign, sideClass(stairsSide))}
        data-edit-id='sign-up'
        onMouseEnter={() => sfx.hover()}
        onClick={onUp}
      >
        <img
          src='/images/bazaar4/deco/up-on.png'
          alt=''
          draggable={false}
          loading='lazy'
        />
      </button>
      {onDown && (
        <button
          type='button'
          aria-label='go down to the next floor'
          className={cn(styles.wayfindingSign, sideClass(downSide))}
          data-edit-id='sign-down'
          onMouseEnter={() => sfx.hover()}
          onClick={onDown}
        >
          <img
            src='/images/bazaar4/deco/down-on.png'
            alt=''
            draggable={false}
            loading='lazy'
          />
        </button>
      )}
    </div>
  )
}

/* ---------- the floor stage: one stacking context, every z works ---------- */

function FloorStage(props: {
  items: ResolvedItem[]
  onUp: () => void
  onDown?: () => void
}) {
  const { items, onUp, onDown } = props
  return (
    <div className={styles.floorStage} data-stage=''>
      {items.map((item, i) => {
        const key = `${item.kind}:${item.id}:${i}`
        const at = {
          left: `calc(var(--su) * ${item.x})`,
          top: `calc(var(--su) * ${item.y})`,
          zIndex: item.z,
        }
        if (item.kind === 'stall') {
          return (
            <div key={key} className={styles.stagePos} style={at}>
              <Stall id={item.id as Bazaar4StallId} />
            </div>
          )
        }
        if (item.kind === 'sign') {
          const action = item.id === 'up' ? onUp : onDown
          if (!action) return null
          return (
            <button
              key={key}
              type='button'
              aria-label={item.id === 'up' ? 'go up' : 'go down'}
              className={styles.stageSign}
              data-edit-id={`sign-${item.id}`}
              style={
                {
                  ...at,
                  height: `calc(var(--su) * ${item.h})`,
                  '--sign-glow':
                    item.id === 'up'
                      ? 'rgb(255 95 170 / 0.5)'
                      : 'rgb(75 210 225 / 0.5)',
                } as React.CSSProperties
              }
              onMouseEnter={() => sfx.hover()}
              onClick={action}
            >
              <img
                src={`/images/bazaar4/deco/${item.id}-off.png`}
                alt=''
                draggable={false}
              />
              <img
                src={`/images/bazaar4/deco/${item.id}-on.png`}
                alt=''
                draggable={false}
                className={styles.signOn}
              />
            </button>
          )
        }
        if (item.kind === 'glow') {
          return (
            <div
              key={key}
              aria-hidden
              data-edit-id={`glow:${item.id}`}
              className={styles.glowSpot}
              style={{
                ...at,
                width: `calc(var(--su) * ${item.w ?? item.h})`,
                height: `calc(var(--su) * ${item.h})`,
                background: `radial-gradient(ellipse, ${GLOW_COLORS[item.id] ?? GLOW_COLORS.amber} 0%, transparent 68%)`,
                mixBlendMode: item.id === 'black' ? 'multiply' : 'screen',
              }}
            />
          )
        }
        return (
          <img
            key={key}
            src={`/images/bazaar4/deco/${item.id}.png`}
            alt=''
            draggable={false}
            loading='lazy'
            data-edit-id={`deco:${item.id}`}
            className={styles.decorItem}
            style={{
              ...at,
              height: `calc(var(--su) * ${item.h})`,
              width: item.w ? `calc(var(--su) * ${item.w})` : undefined,
            }}
          />
        )
      })}
      <div className={styles.stageStrip} aria-hidden />
    </div>
  )
}

/* ---------- market floors ---------- */

type MarketSpec = {
  stalls: Bazaar4StallId[]
  stairs: number
  stairsFirst?: boolean
}

const DESKTOP_MARKETS: MarketSpec[] = [
  { stalls: ['uses', 'papers'], stairs: 1 },
  { stalls: ['manual', 'console', 'talks'], stairs: 2, stairsFirst: true },
  { stalls: ['w98', 'games', 'travel'], stairs: 3 },
]

const MOBILE_MARKETS: MarketSpec[] = [
  { stalls: ['uses', 'papers'], stairs: 1 },
  { stalls: ['manual', 'talks'], stairs: 2, stairsFirst: true },
  { stalls: ['console', 'w98'], stairs: 3 },
  { stalls: ['games', 'travel'], stairs: 1, stairsFirst: true },
]

function MarketFloor(props: {
  spec: MarketSpec
  bp: 'desktop' | 'mobile'
  index: number
  onUp: () => void
  onDown?: () => void
}) {
  const { spec, bp, index, onUp, onDown } = props
  const mobile = bp === 'mobile'
  const stairsSide: Side = spec.stairsFirst ? 'left' : 'right'
  const stairs = (
    <Stairs side={mobile ? undefined : stairsSide} mobile={mobile} />
  )
  return (
    <section
      className={cn(styles.floor, styles.floorMkt)}
      data-floor=''
      data-market-scene=''
      data-breakpoint={bp}
      data-market-index={index}
      data-stairs={mobile ? undefined : stairsSide}
      style={
        {
          '--row-gap': spec.stalls.length === 2 ? 180 : 124,
        } as React.CSSProperties
      }
    >
      {mobile && (
        <WayfindingSigns stairsSide={stairsSide} onUp={onUp} onDown={onDown} />
      )}
      {mobile ? (
        <div className={styles.mktFrame}>
          <span className={styles.motes} aria-hidden />
          <div className={cn(spec.stairsFirst ? styles.mGridL : styles.mGridR)}>
            <Stall id={spec.stalls[0]} />
            {stairs}
            <Stall id={spec.stalls[1]} />
          </div>
        </div>
      ) : (
        <>
          <span className={styles.motes} aria-hidden />
          {stairs}
          <FloorStage
            items={STAGE_RESOLVED[index] ?? []}
            onUp={onUp}
            onDown={onDown}
          />
        </>
      )}
    </section>
  )
}

/* ---------- page ---------- */

export default function Bazaar4View() {
  const sceneRef = useRef<HTMLDivElement>(null)
  const fgRef = useRef<HTMLDivElement>(null)
  const desktopTreeRef = useRef<HTMLDivElement>(null)
  const mobileTreeRef = useRef<HTMLDivElement>(null)
  const [sound, setSound] = useState(false)
  const [hitbox, setHitbox] = useState(false)
  const [grid, setGrid] = useState(false)
  const [editor, setEditor] = useState(false)

  /* foreground tower parallaxes against the floor scroll, home-bridge style */
  useEffect(() => {
    const scene = sceneRef.current
    const fg = fgRef.current
    if (!scene || !fg) return
    const onScroll = () => {
      const st = scene.scrollTop
      fg.style.transform = `translateY(${-st * 0.35}px)`
      /* the fg silhouettes belong to the street: gone by the first market */
      fg.style.opacity = String(
        Math.max(0, 1 - st / (scene.clientHeight * 0.5)),
      )
    }
    scene.addEventListener('scroll', onScroll, { passive: true })
    return () => scene.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (localStorage.getItem('bazaar-sound') !== 'on') return
    setSound(true)
    setSoundEnabled(true)
  }, [])

  useEffect(() => {
    const root = sceneRef.current
    if (!root) return
    const ratios = new Map<Element, number>()
    let armed = false
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target, entry.intersectionRatio)
        }
        let best: Element | null = null
        let bestRatio = 0
        for (const [el, ratio] of ratios) {
          if (ratio > bestRatio) {
            best = el
            bestRatio = ratio
          }
        }
        for (const [el] of ratios) {
          el.classList.toggle(styles.dimmed, el !== best)
        }
        if (armed && entries.some((e) => e.intersectionRatio > 0.6)) sfx.floor()
        armed = true
      },
      { root, threshold: [0, 0.25, 0.5, 0.75, 1] },
    )
    for (const floor of root.querySelectorAll('[data-floor]')) {
      observer.observe(floor)
    }
    return () => observer.disconnect()
  }, [])

  const toggleSound = () => {
    const next = !sound
    setSound(next)
    setSoundEnabled(next)
    localStorage.setItem('bazaar-sound', next ? 'on' : 'off')
    if (next) sfx.click()
  }

  const scrollToMarket = () => {
    sceneRef.current?.scrollTo({
      top: sceneRef.current.clientHeight,
      behavior: 'smooth',
    })
  }

  const scrollToFloor = (tree: HTMLDivElement | null, floorIndex: number) => {
    const floor =
      tree?.querySelectorAll<HTMLElement>('[data-floor]')[floorIndex]
    if (!floor) return
    sfx.click()
    floor.scrollIntoView({
      behavior: 'smooth',
      block: floorIndex === 0 ? 'start' : 'center',
    })
  }

  return (
    <main
      className={styles.scene}
      ref={sceneRef}
      data-hitbox={hitbox || undefined}
    >
      <div className={styles.hud}>
        <button type='button' className={styles.hudBtn} onClick={toggleSound}>
          {sound ? 'SOUND ON' : 'SOUND OFF'}
        </button>
        <button
          type='button'
          className={styles.hudBtn}
          onClick={() => setHitbox((p) => !p)}
        >
          {hitbox ? 'HITBOX ON' : 'HITBOX OFF'}
        </button>
        <button
          type='button'
          className={styles.hudBtn}
          onClick={() => setGrid((p) => !p)}
        >
          {grid ? 'GRID ON' : 'GRID OFF'}
        </button>
        <button
          type='button'
          className={styles.hudBtn}
          onClick={() => setEditor((p) => !p)}
        >
          {editor ? 'EDITOR ON' : 'EDITOR OFF'}
        </button>
      </div>
      <LayoutEditor enabled={editor} />
      {grid && <Grid />}
      <div className={styles.fadeIn} aria-hidden />
      <div ref={fgRef} className={styles.fgLayer} aria-hidden>
        <span className={styles.fgL} />
        <span className={styles.fgR} />
      </div>

      <div ref={desktopTreeRef} className={styles.desktopTree}>
        <StreetFloor onDoor={scrollToMarket} />
        {DESKTOP_MARKETS.map((spec, i) => (
          <Fragment key={spec.stalls[0]}>
            <div className={styles.sep} />
            <MarketFloor
              spec={spec}
              bp='desktop'
              index={i}
              onUp={() => scrollToFloor(desktopTreeRef.current, i)}
              onDown={
                i === DESKTOP_MARKETS.length - 1
                  ? undefined
                  : () => scrollToFloor(desktopTreeRef.current, i + 2)
              }
            />
          </Fragment>
        ))}
        <div className={styles.sep} />
        <div className={styles.bottomPad} />
      </div>

      <div ref={mobileTreeRef} className={styles.mobileTree}>
        <StreetFloor onDoor={scrollToMarket} />
        {MOBILE_MARKETS.map((spec, i) => (
          <Fragment key={spec.stalls[0]}>
            <div className={styles.sep} />
            <MarketFloor
              spec={spec}
              bp='mobile'
              index={i}
              onUp={() => scrollToFloor(mobileTreeRef.current, i)}
              onDown={
                i === MOBILE_MARKETS.length - 1
                  ? undefined
                  : () => scrollToFloor(mobileTreeRef.current, i + 2)
              }
            />
          </Fragment>
        ))}
        <div className={styles.sep} />
        <div className={styles.bottomPad} />
      </div>
    </main>
  )
}
