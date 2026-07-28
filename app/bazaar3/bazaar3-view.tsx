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
import styles from './bazaar3.module.css'
import { FloorIntegrationLayers, StallIntegrationLayers } from './components'
import {
  canRenderIntegration,
  type FloorIntegrationId,
  getFloorIntegration,
  getStallIntegration,
  INTEGRATION_PHASES,
} from './integration-manifest'

const pixelFont = Press_Start_2P({ weight: '400', subsets: ['latin'] })

/*
 * Bazaar3 reuses the frozen Bazaar2 street and underground environment plates,
 * while every animated stall family is promoted into its own verified v3
 * asset namespace.
 */
const ASSETS = '/images/bazaar2/assets'
const V3_ASSETS = '/images/bazaar3/assets'
const STREET = '/images/bazaar2/assets/street2'
const src = (file: string) => `${ASSETS}/${file}.png`
const v3Src = (file: string) => `${V3_ASSETS}/${file}.png`
const ARCHITECTURE = '/images/bazaar3/assets/architecture'
const architectureSrc = (file: string) => `${ARCHITECTURE}/${file}.png`
const preferredScrollBehavior = (): ScrollBehavior =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : 'smooth'
const stallFrameSrc = (
  id: Stall3Id,
  frame: 'idle-1' | 'idle-2' | 'hover-1' | 'hover-2' | 'hover-3',
) =>
  v3Src(
    `stalls/${
      id === 'manual'
        ? 'manual-v3'
        : id === 'console' || id === 'projects' || id === 'travel'
          ? `${id}-v2`
          : id
    }/frames/${frame}`,
  )

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
      <div className={styles.streetBg} />
      <img
        src={`${STREET}/bg-tower.png`}
        alt=''
        className={styles.sTower}
        aria-hidden
      />
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
        <img src={`${STREET}/bus.png?v=8`} alt='' />
        <img src={`${STREET}/bus-on.png?v=8`} alt='' data-on='' />
      </Link>
    </section>
  )
}

/* ---------- stalls ---------- */

type Stall3Id =
  | 'uses'
  | 'games'
  | 'travel'
  | 'manual'
  | 'console'
  | 'projects'
  | 'talks'
  | 'papers'

/* sounds.ts still speaks v4 ids */
const SFX_ID: Record<Stall3Id, StallId> = {
  uses: 'uses',
  games: 'games',
  travel: 'travel',
  manual: 'manual',
  console: 'serve',
  projects: 'projects',
  talks: 'talks',
  papers: 'papers',
}

type StallLink = { label: string; href: string; external?: boolean }

type StallSpec = {
  label: string
  href: Route
  external?: boolean
  desktopSize: [number, number]
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
const PROJECTS_DIALOG = [
  'Oh! A human.',
  'I grew these.',
  '...want to see?',
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

const STALLS: Record<Stall3Id, StallSpec> = {
  uses: {
    label: 'uses',
    href: '/uses',
    desktopSize: [152, 120],
    desc: USES_DIALOG,
    links: [{ label: 'browse the gear', href: '/uses' }],
  },
  games: {
    label: 'games',
    href: '/g-snake',
    desktopSize: [82, 96],
    desc: GAMES_CONVERSATION.map((turn) => turn.text).join('\n'),
    links: [
      { label: 'g-snake', href: '/g-snake' },
      { label: 'w98', href: '/w98' },
      { label: 'rubiks', href: '/rubiks' },
    ],
  },
  travel: {
    label: 'travel',
    href: '/travel',
    desktopSize: [104, 135],
    desc: TRAVEL_DIALOG,
    links: [{ label: 'see the flight log', href: '/travel' }],
  },
  manual: {
    label: 'manual',
    href: '/manual',
    desktopSize: [90, 120],
    desc: MANUAL_DIALOG,
    links: [{ label: 'read the manual', href: '/manual' }],
  },
  console: {
    label: 'console',
    href: '/serve',
    desktopSize: [74, 96],
    desc: CONSOLE_DIALOG,
    links: [{ label: 'open the archive', href: '/serve' }],
  },
  projects: {
    label: 'projects',
    href: 'https://rfm.sospedra.me' as Route,
    external: true,
    desktopSize: [105, 135],
    desc: PROJECTS_DIALOG,
    links: [
      { label: 'rfm', href: 'https://rfm.sospedra.me', external: true },
      { label: 'spg', href: 'https://spg.sospedra.me', external: true },
      { label: 'reinput', href: 'https://reinput.sospedra.me', external: true },
      {
        label: 'keycodes',
        href: 'https://keycodes.sospedra.me',
        external: true,
      },
    ],
  },
  talks: {
    label: 'talks',
    href: '/videoclub',
    desktopSize: [112, 120],
    desc: TALKS_DIALOG,
    links: [{ label: 'play the tapes', href: '/videoclub' }],
  },
  papers: {
    label: 'papers',
    href: '/papers',
    desktopSize: [97, 120],
    desc: PAPERS_DIALOG,
    links: [{ label: 'read the papers', href: '/papers' }],
  },
}

type Bp = 'desktop' | 'mobile'

function FullStallFrames({ id }: { id: Stall3Id }) {
  return (
    <>
      <div className={styles.fullStallFrames} aria-hidden>
        <img
          src={stallFrameSrc(id, 'idle-1')}
          alt=''
          className={cn(styles.fill, styles.fullStallBase)}
          draggable={false}
        />
        <img
          src={stallFrameSrc(id, 'idle-2')}
          alt=''
          className={cn(styles.fill, styles.fullStallIdleSecond)}
          draggable={false}
          loading='lazy'
        />
        <img
          src={stallFrameSrc(id, 'hover-1')}
          alt=''
          className={cn(
            styles.fill,
            styles.fullStallHoverFrame,
            styles.fullStallHoverFirst,
          )}
          draggable={false}
          loading='lazy'
        />
        <img
          src={stallFrameSrc(id, 'hover-2')}
          alt=''
          className={cn(
            styles.fill,
            styles.fullStallHoverFrame,
            styles.fullStallHoverMiddle,
          )}
          draggable={false}
          loading='lazy'
        />
        <img
          src={stallFrameSrc(id, 'hover-3')}
          alt=''
          className={cn(
            styles.fill,
            styles.fullStallHoverFrame,
            styles.fullStallHoverLast,
          )}
          draggable={false}
          loading='lazy'
        />
      </div>
      <div className={styles.glowWash} />
    </>
  )
}

function StallInner({ id }: { id: Stall3Id; bp: Bp; active: boolean }) {
  return <FullStallFrames id={id} />
}

function StallScene({
  id,
  bp,
  active,
  qaMode,
}: {
  id: Stall3Id
  bp: Bp
  active: boolean
  qaMode: boolean
}) {
  const authoredIntegration = canRenderIntegration(
    getStallIntegration(id).variants[bp].status,
    qaMode,
  )

  return (
    <>
      {!authoredIntegration && (
        <>
          <span className={styles.integrationLight} aria-hidden />
          <span className={styles.integrationRear} aria-hidden />
        </>
      )}
      <div className={styles.stallArt}>
        <StallInner id={id} bp={bp} active={active} />
      </div>
      {!authoredIntegration && (
        <span className={styles.integrationFront} aria-hidden />
      )}
    </>
  )
}

type DialogPosition = { left: number; top: number }

const TYPEWRITER_INTERVAL_MS = 9
const GAMES_TURN_PAUSE_CHARS = 10

function useDialogViewportClamp(
  active: boolean,
  position: DialogPosition | null,
  dialogRef: React.RefObject<HTMLDivElement | null>,
) {
  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!active || !position || !dialog) return

    dialog.style.setProperty('--dialog-shift-x', '0px')
    dialog.style.setProperty('--dialog-shift-y', '0px')

    const rect = dialog.getBoundingClientRect()
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

    dialog.style.setProperty('--dialog-shift-x', `${shiftX}px`)
    dialog.style.setProperty('--dialog-shift-y', `${shiftY}px`)
  }, [active, dialogRef, position])
}

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

  useDialogViewportClamp(active, position, dialogRef)

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

  useDialogViewportClamp(active, position, dialogRef)

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

function Stall({ id, bp, qaMode }: { id: Stall3Id; bp: Bp; qaMode: boolean }) {
  const spec = STALLS[id]
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const [dialogPosition, setDialogPosition] = useState<DialogPosition | null>(
    null,
  )
  const wrapRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<number | null>(null)
  const active = open || focused
  const authoredIntegration = canRenderIntegration(
    getStallIntegration(id).variants[bp].status,
    qaMode,
  )

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
          '--stall-w': spec.desktopSize[0],
          '--stall-h': spec.desktopSize[1],
        } as React.CSSProperties
      }
      data-stall={id}
      data-active={active || undefined}
      data-authored-integration={authoredIntegration || undefined}
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
      <StallIntegrationLayers
        stallId={id}
        breakpoint={bp}
        active={active}
        qaMode={qaMode}
      />
      {spec.external ? (
        <a {...stallProps} href={spec.href} target='_blank' rel='noreferrer'>
          <StallScene id={id} bp={bp} active={active} qaMode={qaMode} />
        </a>
      ) : (
        <Link {...stallProps} url={spec.href}>
          <StallScene id={id} bp={bp} active={active} qaMode={qaMode} />
        </Link>
      )}
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

function Stairs(props: { id: number; side?: Side; mobile?: boolean }) {
  const { id, side, mobile = false } = props
  return (
    <div
      className={cn(
        styles.stairs,
        side === 'left' && styles.stairsL,
        side === 'right' && styles.stairsR,
      )}
      aria-hidden
    >
      {mobile ? (
        <>
          <div className={styles.mobileMidfloor}>
            <span className={styles.mobileMidfloorDeck} />
            <span className={styles.mobileMidfloorContact} />
            <span className={styles.mobileMidfloorFascia} />
            <span className={styles.mobileMidfloorUnderside} />
          </div>
          <div className={styles.mobileStairsHardware}>
            <img
              src={architectureSrc('mobile-core')}
              alt=''
              className={cn(styles.stairsColumn, styles.mobileStairsCore)}
              draggable={false}
              loading='lazy'
            />
            <img
              src={architectureSrc('mobile-platform')}
              alt=''
              className={styles.mobileStairsPlatform}
              draggable={false}
              loading='lazy'
            />
            <span className={styles.mobileBottomLanding} />
            <span className={styles.mobileBottomLandingLip} />
          </div>
        </>
      ) : (
        <>
          <span className={styles.desktopStairsRear} />
          <span className={styles.desktopStairsLanding} />
          <span className={styles.desktopStairsServiceBridge} />
          <span className={styles.desktopStairsTrenchBridge} />
          <img
            src={architectureSrc(
              id === 2 ? 'desktop-core-2-workshop' : `desktop-core-${id}`,
            )}
            alt=''
            className={cn(styles.stairsColumn, styles.desktopStairsCore)}
            draggable={false}
            loading='lazy'
          />
          <span className={styles.desktopStairsFront} />
        </>
      )}
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
        onMouseEnter={() => sfx.hover()}
        onClick={onUp}
      >
        <img
          src={src('wayfinding/sign-up')}
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
          onMouseEnter={() => sfx.hover()}
          onClick={onDown}
        >
          <img
            src={src('wayfinding/sign-down')}
            alt=''
            draggable={false}
            loading='lazy'
          />
        </button>
      )}
    </div>
  )
}

/* ---------- market floors ---------- */

type MarketSpec = {
  integrationId: FloorIntegrationId
  stalls: Stall3Id[]
  stairs: number
  stairsFirst?: boolean
}

const DESKTOP_MARKETS: MarketSpec[] = [
  {
    integrationId: 'archive-desktop',
    stalls: ['uses', 'papers'],
    stairs: 1,
  },
  {
    integrationId: 'workshop-desktop',
    stalls: ['manual', 'console', 'talks'],
    stairs: 2,
    stairsFirst: true,
  },
  {
    integrationId: 'reclaimed-desktop',
    stalls: ['projects', 'games', 'travel'],
    stairs: 3,
    stairsFirst: true,
  },
]

/* bridge props: sparse clutter tying places to the architecture */
type PropSpec = {
  file: string
  left: string
  bottom?: string
  top?: string
  h: string
  z?: number
  flip?: boolean
}

const FLOOR_PROPS: PropSpec[][] = [
  [
    {
      file: 'power-drop',
      left: '6%',
      top: '0',
      h: 'calc(var(--mkt-m) * 2.4)',
      z: 1,
    },
    {
      file: 'worn-mat',
      left: '16%',
      bottom: 'calc(var(--mkt-m) * 0.32)',
      h: 'calc(var(--mkt-m) * 0.16)',
      z: 1,
    },
    {
      file: 'floor-cable',
      left: '58%',
      bottom: 'calc(var(--mkt-m) * 0.3)',
      h: 'calc(var(--mkt-m) * 0.28)',
      z: 1,
    },
  ],
  [
    {
      file: 'puddle',
      left: '5%',
      bottom: 'calc(var(--mkt-m) * 0.42)',
      h: 'calc(var(--mkt-m) * 0.2)',
      z: 1,
    },
    {
      file: 'bunting',
      left: '30%',
      top: 'calc(var(--mkt-m) * 0.45)',
      h: 'calc(var(--mkt-m) * 0.38)',
      z: 1,
    },
    {
      file: 'trash-drift',
      left: '88%',
      bottom: 'calc(var(--mkt-m) * 0.4)',
      h: 'calc(var(--mkt-m) * 0.45)',
      z: 1,
    },
  ],
  [
    {
      file: 'floor-cable-short',
      left: '42%',
      bottom: 'calc(var(--mkt-m) * 0.3)',
      h: 'calc(var(--mkt-m) * 0.22)',
      z: 1,
    },
    {
      file: 'power-drop',
      left: '92%',
      top: '0',
      h: 'calc(var(--mkt-m) * 2.2)',
      z: 1,
      flip: true,
    },
    {
      file: 'trash-drift',
      left: '3%',
      bottom: 'calc(var(--mkt-m) * 0.45)',
      h: 'calc(var(--mkt-m) * 0.4)',
      z: 1,
      flip: true,
    },
  ],
]

/* one featured element per separator, plain tile everywhere else */
const SLAB_KINDS = ['pipes', 'cables-a', 'cables-b'] as const
/* featured element lands off-center, different spot per separator */
const SLAB_X = ['12%', '68%', '31%'] as const

const MOBILE_MARKETS: MarketSpec[] = [
  {
    integrationId: 'archive-mobile',
    stalls: ['uses', 'papers'],
    stairs: 1,
  },
  {
    integrationId: 'service-media-mobile',
    stalls: ['manual', 'talks'],
    stairs: 2,
    stairsFirst: true,
  },
  {
    integrationId: 'compute-garden-mobile',
    stalls: ['console', 'projects'],
    stairs: 3,
  },
  {
    integrationId: 'play-transit-mobile',
    stalls: ['games', 'travel'],
    stairs: 1,
    stairsFirst: true,
  },
]

function MarketFloor(props: {
  spec: MarketSpec
  bp: Bp
  index: number
  qaMode: boolean
  onUp: () => void
  onDown?: () => void
}) {
  const { spec, bp, index, qaMode, onUp, onDown } = props
  const mobile = bp === 'mobile'
  const authoredFloor = canRenderIntegration(
    getFloorIntegration(spec.integrationId).status,
    qaMode,
  )
  const stairsSide: Side = spec.stairsFirst ? 'left' : 'right'
  const stairs = (
    <Stairs
      id={spec.stairs}
      side={mobile ? undefined : stairsSide}
      mobile={mobile}
    />
  )
  return (
    <section
      className={cn(styles.floor, styles.floorMkt)}
      data-floor=''
      data-market-scene=''
      data-breakpoint={bp}
      data-market-index={index}
      data-integration-floor={spec.integrationId}
      data-authored-integration={authoredFloor || undefined}
      data-stairs={mobile ? undefined : stairsSide}
    >
      <WayfindingSigns stairsSide={stairsSide} onUp={onUp} onDown={onDown} />
      <div
        className={styles.envTile}
        style={{ backgroundImage: `url(${src(`mkt-env-${(index % 3) + 1}`)})` }}
      />
      {!mobile && stairs}
      <div className={styles.mktGroundShade} aria-hidden />
      <div className={styles.mktFrame}>
        {!authoredFloor && (
          <>
            <span className={styles.marketCeilingBeam} aria-hidden />
            <span className={styles.marketFloorRail} aria-hidden />
            <span className={styles.motes} aria-hidden />
            {FLOOR_PROPS[index % 3].map((p) => (
              <img
                key={p.file}
                src={src(`props/${p.file}`)}
                alt=''
                className={styles.prop}
                style={{
                  left: p.left,
                  bottom: p.bottom,
                  top: p.top,
                  height: p.h,
                  zIndex: p.z,
                  transform: p.flip ? 'scaleX(-1)' : undefined,
                }}
              />
            ))}
          </>
        )}
        {mobile ? (
          <div
            className={cn(spec.stairsFirst ? styles.mGridL : styles.mGridR)}
            data-market-stalls=''
          >
            {INTEGRATION_PHASES.map((phase) => (
              <FloorIntegrationLayers
                key={phase}
                floorId={spec.integrationId}
                phase={phase}
                qaMode={qaMode}
              />
            ))}
            <Stall id={spec.stalls[0]} bp='mobile' qaMode={qaMode} />
            {stairs}
            <Stall id={spec.stalls[1]} bp='mobile' qaMode={qaMode} />
          </div>
        ) : (
          <>
            {INTEGRATION_PHASES.map((phase) => (
              <FloorIntegrationLayers
                key={phase}
                floorId={spec.integrationId}
                phase={phase}
                qaMode={qaMode}
              />
            ))}
            <div className={styles.mktRow} data-market-stalls=''>
              {spec.stalls.map((id, stallIndex) => (
                <Fragment key={id}>
                  {stallIndex > 0 && (
                    <span className={styles.stallBayBeam} aria-hidden />
                  )}
                  <Stall id={id} bp='desktop' qaMode={qaMode} />
                </Fragment>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

/* ---------- page ---------- */

export default function Bazaar3View() {
  const sceneRef = useRef<HTMLDivElement>(null)
  const fgRef = useRef<HTMLDivElement>(null)
  const desktopTreeRef = useRef<HTMLDivElement>(null)
  const mobileTreeRef = useRef<HTMLDivElement>(null)
  const [sound, setSound] = useState(false)
  const [hitbox, setHitbox] = useState(false)
  const [grid, setGrid] = useState(false)
  const [qaMode, setQaMode] = useState(false)

  useEffect(() => {
    const qa = new URLSearchParams(window.location.search).get('qa') === '1'
    if (!qa) return
    setQaMode(true)
    setHitbox(true)
    setGrid(true)
  }, [])

  /* foreground tower parallaxes against the floor scroll, home-bridge style */
  useEffect(() => {
    const scene = sceneRef.current
    const fg = fgRef.current
    if (!scene || !fg) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
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
      behavior: preferredScrollBehavior(),
    })
  }

  const scrollToFloor = (tree: HTMLDivElement | null, floorIndex: number) => {
    const floor =
      tree?.querySelectorAll<HTMLElement>('[data-floor]')[floorIndex]
    if (!floor) return
    sfx.click()
    floor.scrollIntoView({
      behavior: preferredScrollBehavior(),
      block: floorIndex === 0 ? 'start' : 'center',
    })
  }

  return (
    <main
      className={styles.scene}
      ref={sceneRef}
      data-hitbox={hitbox || undefined}
    >
      {qaMode && (
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
        </div>
      )}
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
            <div
              className={styles.slab}
              style={{
                backgroundImage: `url(${ASSETS}/slabs/slab-${SLAB_KINDS[i % 3]}.png), url(${ASSETS}/slabs/slab-${SLAB_KINDS[i % 3]}-bg.png)`,
                backgroundPosition: `${SLAB_X[i % 3]} bottom, left bottom`,
              }}
            />
            <MarketFloor
              spec={spec}
              bp='desktop'
              index={i}
              qaMode={qaMode}
              onUp={() => scrollToFloor(desktopTreeRef.current, i)}
              onDown={
                i === DESKTOP_MARKETS.length - 1
                  ? undefined
                  : () => scrollToFloor(desktopTreeRef.current, i + 2)
              }
            />
          </Fragment>
        ))}
      </div>

      <div ref={mobileTreeRef} className={styles.mobileTree}>
        <StreetFloor onDoor={scrollToMarket} />
        {MOBILE_MARKETS.map((spec, i) => (
          <Fragment key={spec.stalls[0]}>
            <div
              className={styles.slab}
              style={{
                backgroundImage: `url(${ASSETS}/slabs/slab-${SLAB_KINDS[i % 3]}.png), url(${ASSETS}/slabs/slab-${SLAB_KINDS[i % 3]}-bg.png)`,
                backgroundPosition: `${SLAB_X[i % 3]} bottom, left bottom`,
              }}
            />
            <MarketFloor
              spec={spec}
              bp='mobile'
              index={i}
              qaMode={qaMode}
              onUp={() => scrollToFloor(mobileTreeRef.current, i)}
              onDown={
                i === MOBILE_MARKETS.length - 1
                  ? undefined
                  : () => scrollToFloor(mobileTreeRef.current, i + 2)
              }
            />
          </Fragment>
        ))}
      </div>
    </main>
  )
}
