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
import css from './bazaar.module.css'
import LayoutEditor from './layout-editor'
import scene from './scene.module.css'
import SceneStall from './scene-stall'
import { type StallId, setSoundEnabled, sfx } from './sounds'
import { type Bazaar4StallId, SIM_DIMS } from './stalls-manifest'

const pixelFont = Press_Start_2P({ weight: '400', subsets: ['latin'] })

const STREET = '/images/bazaar4/street'

/* stalls that render one static image instead of r17 layers: none today —
   the console's v2 animated kit shipped 2026-08-01 */
const STATIC_STALLS: Partial<
  Record<Bazaar4StallId, { src: string; w: number; h: number }>
> = {}

/* stall sim dims: SIM_DIMS display contract, static overrides on top */
const DIMS = Object.fromEntries(
  (Object.keys(SIM_DIMS) as Bazaar4StallId[]).map((id) => {
    const stat = STATIC_STALLS[id]
    return [
      id,
      stat
        ? { w: stat.w, h: stat.h }
        : { w: SIM_DIMS[id].dispW, h: SIM_DIMS[id].dispH },
    ]
  }),
) as Record<Bazaar4StallId, { w: number; h: number }>

/* ---------- street floor: the r18 kit, no stage props ---------- */

function StreetFloor({ onDoor }: { onDoor: () => void }) {
  return (
    <section className={scene.floor} data-floor='' data-market-scene=''>
      <img
        src={`${STREET}/bg-tower.png`}
        alt=''
        className={scene.sTower}
        aria-hidden
      />
      <div className={scene.streetBg} />
      <div className={scene.sAlleySigns} aria-hidden>
        <img src={`${STREET}/alley-signs-1.png`} alt='' />
        <img src={`${STREET}/alley-signs-2.png`} alt='' data-alt='' />
      </div>
      <div className={scene.alleyShade} aria-hidden />
      <img src={`${STREET}/building-pad.png`} alt='' className={scene.sPadL} />
      <img src={`${STREET}/building-pad.png`} alt='' className={scene.sPadR} />
      <img src={`${STREET}/building-a.png`} alt='' className={scene.sA} />
      <div className={scene.sCDWrap}>
        <img
          src={`${STREET}/building-cd.png`}
          alt=''
          className={scene.sCDImg}
        />
        <div className={scene.sNeon} aria-hidden>
          <img src={`${STREET}/neon-off.png`} alt='' />
          <div className={scene.sNeonOn}>
            <img src={`${STREET}/neon.png`} alt='Bazaar' />
          </div>
        </div>
        <button
          type='button'
          className={cn(scene.hit, scene.sDoor)}
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
      <div className={scene.alleyGlow} aria-hidden />
      <div className={scene.sFloor} />
      <div className={scene.sCar} aria-hidden>
        <div className={scene.sCarStretch}>
          <div className={scene.sCarSquash}>
            <div className={scene.sCarScale}>
              <SpriteCar engineOn isMoving />
            </div>
          </div>
        </div>
      </div>
      <Link
        url='/'
        className={cn(scene.hit, scene.sBus)}
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

/* ---------- stalls: bazaar4 dialog machinery on bazaar5 boxes ---------- */

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
          scene.dialogDesc,
          links.length === 0 && scene.dialogDescSolo,
        )}
      >
        <span className={scene.srOnly}>{desc}</span>
        <span className={scene.typeMeasure} aria-hidden>
          {desc}
        </span>
        <span className={scene.typeText} aria-hidden>
          {sliceCharacters(desc, descVisibleChars)}
          {descVisibleChars < descLength && (
            <span className={scene.typeCursor}>_</span>
          )}
        </span>
      </p>
      {links.length > 0 && (
        <div className={scene.dialogLinks}>
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
                <span className={scene.linkTypeMeasure} aria-hidden>
                  {link.label}
                </span>
                <span className={scene.linkTypeText} aria-hidden>
                  {sliceCharacters(link.label, linkVisibleChars)}
                  {started && linkVisibleChars < linkLength && (
                    <span className={scene.typeCursor}>_</span>
                  )}
                </span>
              </>
            )
            const className = cn(!started && scene.dialogLinkPending)

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
      className={cn(scene.dialog, pixelFont.className)}
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
      className={cn(scene.gamesDialogs, pixelFont.className)}
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
              scene.dialog,
              scene.gamesDialog,
              turn.speaker === 'sister'
                ? scene.gamesDialogSister
                : scene.gamesDialogBrother,
              !started && scene.gamesDialogPending,
            )}
          >
            <span className={scene.srOnly}>{turn.speaker} says: </span>
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
  const dims = DIMS[id]
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

  const staticStall = STATIC_STALLS[id]
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: coordinates hover and focus state for the child link and its portalled dialog
    <div
      ref={wrapRef}
      className={cn(css.stallWrap, active && scene.dialogOpen)}
      style={
        {
          '--tint': spec.tint,
          '--w': dims.w,
          '--h': dims.h,
          '--ar': dims.w / dims.h,
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
      <Link
        className={scene.stall}
        aria-label={spec.label}
        data-label={spec.label}
        onClick={guardTap}
        onMouseEnter={() => sfx.stall(SFX_ID[id])}
        onKeyDown={focusDialogOnTab}
        url={spec.href}
      >
        {staticStall ? (
          <div className={scene.sceneStack} aria-hidden>
            <img src={staticStall.src} alt='' draggable={false} />
          </div>
        ) : (
          <SceneStall id={id} active={active} />
        )}
        <div className={scene.glowWash} />
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

/* ---------- floors ---------- */

type DesktopFloor = { stalls: Bazaar4StallId[]; stairsRight: boolean }
type MobileFloor = {
  stalls: [Bazaar4StallId, Bazaar4StallId]
  smRight: boolean
}

/* S sides: R, L, R (spec rule 5) */
const DESKTOP_FLOORS: DesktopFloor[] = [
  { stalls: ['uses', 'papers'], stairsRight: true },
  { stalls: ['manual', 'console', 'talks'], stairsRight: false },
  { stalls: ['w98', 'games', 'travel'], stairsRight: true },
]

/* SM sides: R, L, R, L (spec rule 5) */
const MOBILE_FLOORS: MobileFloor[] = [
  { stalls: ['uses', 'papers'], smRight: true },
  { stalls: ['manual', 'talks'], smRight: false },
  { stalls: ['console', 'w98'], smRight: true },
  { stalls: ['games', 'travel'], smRight: false },
]

function MarketFloor({ spec, index }: { spec: DesktopFloor; index: number }) {
  const sum = spec.stalls.reduce((total, id) => total + DIMS[id].w, 0)
  const stairs = <div className={css.stairs} aria-hidden />
  const band = (
    <div className={css.band} data-stage=''>
      {spec.stalls.map((id) => (
        <Stall key={id} id={id} />
      ))}
    </div>
  )
  return (
    <section
      className={cn(css.floor, spec.stairsRight && css.floorR)}
      data-floor=''
      data-market-index={index}
      style={{ '--sum': sum, '--n': spec.stalls.length } as React.CSSProperties}
    >
      {spec.stairsRight ? band : stairs}
      {spec.stairsRight ? stairs : band}
    </section>
  )
}

function MobileMarketFloor({
  spec,
  index,
}: {
  spec: MobileFloor
  index: number
}) {
  const armin = Math.min(...spec.stalls.map((id) => DIMS[id].w / DIMS[id].h))
  const sm = <div className={css.sm} aria-hidden />
  const stack = (
    <div className={css.stack} data-stage=''>
      {spec.stalls.map((id) => (
        <div key={id} className={css.storyRow}>
          <Stall id={id} />
        </div>
      ))}
    </div>
  )
  return (
    <section
      className={cn(css.mfloor, spec.smRight && css.mfloorR)}
      data-floor=''
      data-market-index={index}
      style={{ '--armin': armin } as React.CSSProperties}
    >
      {spec.smRight ? stack : sm}
      {spec.smRight ? sm : stack}
    </section>
  )
}

/* ---------- page ---------- */

export default function BazaarView() {
  const sceneRef = useRef<HTMLDivElement>(null)
  const [sound, setSound] = useState(false)
  const [hitbox, setHitbox] = useState(false)
  const [editor, setEditor] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('bazaar-sound') !== 'on') return
    setSound(true)
    setSoundEnabled(true)
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

  return (
    <main
      className={css.scene}
      ref={sceneRef}
      data-hitbox={hitbox || undefined}
    >
      <div className={scene.hud}>
        <button type='button' className={scene.hudBtn} onClick={toggleSound}>
          {sound ? 'SOUND ON' : 'SOUND OFF'}
        </button>
        <button
          type='button'
          className={scene.hudBtn}
          onClick={() => setHitbox((p) => !p)}
        >
          {hitbox ? 'HITBOX ON' : 'HITBOX OFF'}
        </button>
        <button
          type='button'
          className={scene.hudBtn}
          onClick={() => setEditor((p) => !p)}
        >
          {editor ? 'EDITOR ON' : 'EDITOR OFF'}
        </button>
      </div>
      <LayoutEditor enabled={editor} />

      <div className={css.desktopTree}>
        <div className={cn(scene.scene, css.streetHost)}>
          <StreetFloor onDoor={scrollToMarket} />
        </div>
        {DESKTOP_FLOORS.map((spec, i) => (
          <Fragment key={spec.stalls[0]}>
            <div className={css.sep} data-bz5-sep={i} />
            <MarketFloor spec={spec} index={i} />
          </Fragment>
        ))}
        <div className={css.sep} data-bz5-sep={3} />
        <div className={css.bottomPad} />
      </div>

      <div className={css.mobileTree}>
        <div className={cn(scene.scene, css.streetHost)}>
          <StreetFloor onDoor={scrollToMarket} />
        </div>
        {MOBILE_FLOORS.map((spec, i) => (
          <Fragment key={spec.stalls[0]}>
            <div className={css.sepM} />
            <MobileMarketFloor spec={spec} index={i} />
          </Fragment>
        ))}
        <div className={css.sepM} />
        <div className={css.bottomPad} />
      </div>
    </main>
  )
}
