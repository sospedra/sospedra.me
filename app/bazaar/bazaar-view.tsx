'use client'

import cn from 'clsx'
import Link from 'components/Link'
import Shell from 'components/Shell'
import type { Route } from 'next'
import { Press_Start_2P } from 'next/font/google'
import { Fragment, useEffect, useRef, useState } from 'react'
import {
  MANUAL_DESC,
  PAPERS_DESC,
  SERVE_DESC,
  TALKS_DESC,
  TRAVEL_DESC,
  USES_DESC,
} from 'service/descriptions'
import css from './bazaar.module.css'
import { type StallId, setSoundEnabled, sfx } from './sounds'

const pixelFont = Press_Start_2P({ weight: '400', subsets: ['latin'] })

const ASSETS = '/images/bazaar/assets'

type Breakpoint = 'desktop' | 'mobile'

const src = (file: string) => `${ASSETS}/${file}.png`

function Sprite(props: {
  file: string
  className?: string
  priority?: boolean
}) {
  const { file, className, priority } = props
  return (
    <img
      src={src(file)}
      alt=''
      draggable={false}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      className={cn(css.fill, className)}
    />
  )
}

function Tile({ file, className }: { file: string; className?: string }) {
  return (
    <div
      className={cn(css.tile, className)}
      style={{ backgroundImage: `url(${src(file)})` }}
    />
  )
}

function Frames(props: {
  prefix: string
  count: number
  className?: string
  priority?: boolean
}) {
  const { prefix, count, className, priority } = props
  const frames = Array.from({ length: count }, (_, i) => i + 1)
  return (
    <div className={cn(css.cycle, css[`n${count}`], className)}>
      {frames.map((n) => (
        <img
          key={n}
          src={src(`${prefix}-${n}`)}
          alt=''
          draggable={false}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
        />
      ))}
    </div>
  )
}

/* ---------- stalls ---------- */

type StallLink = { label: string; href: string; external?: boolean }

type StallSpec = {
  label: string
  href: Route
  external?: boolean
  tint: string
  prop?: { name: string; frames: number }
  desktopSize: [number, number]
  desc: string
  links: StallLink[]
}

const STALLS: Record<StallId, StallSpec> = {
  uses: {
    label: 'uses',
    href: '/uses',
    tint: '#3fd8c8',
    desktopSize: [92, 118],
    desc: USES_DESC,
    links: [{ label: 'browse the gear', href: '/uses' }],
  },
  games: {
    label: 'games',
    href: '/games',
    tint: '#4a90d9',
    desktopSize: [88, 120],
    desc: 'Six game files, no coins needed.',
    links: [{ label: 'browse the archive', href: '/games' }],
  },
  travel: {
    label: 'travel',
    href: '/travel',
    tint: '#7a6fe6',
    desktopSize: [84, 112],
    desc: TRAVEL_DESC,
    links: [{ label: 'see the flight log', href: '/travel' }],
  },
  manual: {
    label: 'manual',
    href: '/manual',
    tint: '#e06080',
    desktopSize: [128, 118],
    desc: MANUAL_DESC,
    links: [{ label: 'read the manual', href: '/manual' }],
  },
  serve: {
    label: 'serve',
    href: '/serve',
    tint: '#a8b04a',
    desktopSize: [88, 124],
    desc: SERVE_DESC,
    links: [{ label: 'open the archive', href: '/serve' }],
  },
  projects: {
    label: 'projects',
    href: 'https://rfm.sospedra.me' as Route,
    external: true,
    tint: '#4ab06a',
    desktopSize: [96, 126],
    desc: 'Side quests growing on their own subdomains.',
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
    tint: '#e0a040',
    desktopSize: [86, 110],
    desc: TALKS_DESC,
    links: [{ label: 'play the tapes', href: '/videoclub' }],
  },
  papers: {
    label: 'papers',
    href: '/papers',
    tint: '#7ab0d0',
    desktopSize: [90, 116],
    desc: PAPERS_DESC,
    links: [{ label: 'read the papers', href: '/papers' }],
  },
}

function KeeperFrames(props: {
  id: StallId
  state: 'idle' | 'hover'
  count: number
}) {
  const { id, state, count } = props
  const frames = Array.from({ length: count }, (_, i) => i + 1)
  const stateClass = state === 'idle' ? css.keeperIdle : css.keeperHover
  return (
    <div className={cn(css.keeper, stateClass)}>
      {frames.map((n) => (
        <img
          key={n}
          src={src(`stall-${id}-keeper-${state}-${n}`)}
          alt=''
          draggable={false}
          loading='lazy'
        />
      ))}
    </div>
  )
}

function StallInner({ id, bp }: { id: StallId; bp: Breakpoint }) {
  const spec = STALLS[id]
  return (
    <>
      <Sprite file={`stall-${id}-interior-${bp}`} className={css.interior} />
      <KeeperFrames id={id} state='idle' count={2} />
      {id !== 'serve' && <KeeperFrames id={id} state='hover' count={3} />}
      {id === 'manual' && (
        <Frames
          prefix='stall-manual-customer-idle'
          count={2}
          className={css.customer}
        />
      )}
      {spec.prop && (
        <Frames
          prefix={`stall-${id}-prop-${spec.prop.name}`}
          count={spec.prop.frames}
          className={css.stallProp}
        />
      )}
      <Sprite file={`stall-${id}-front-${bp}`} />
      <div className={css.glowWash} />
    </>
  )
}

function Dialog({ spec }: { spec: StallSpec }) {
  return (
    <div className={cn(css.dialog, pixelFont.className)}>
      <p className={css.dialogDesc}>{spec.desc}</p>
      <div className={css.dialogLinks}>
        {spec.links.map((link) =>
          link.external ? (
            <a
              key={link.href}
              href={link.href}
              target='_blank'
              rel='noreferrer'
              onClick={() => sfx.click()}
            >
              {link.label}
            </a>
          ) : (
            <Link
              key={link.href}
              url={link.href as Route}
              onClick={() => sfx.click()}
            >
              {link.label}
            </Link>
          ),
        )}
      </div>
    </div>
  )
}

function Stall({ id, bp }: { id: StallId; bp: Breakpoint }) {
  const spec = STALLS[id]
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  /* mobile: the first tap opens the dialog instead of navigating */
  const guardTap = (e: React.MouseEvent) => {
    const coarse = window.matchMedia('(hover: none)').matches
    if (coarse && !open) {
      e.preventDefault()
      setOpen(true)
      sfx.stall(id)
      return
    }
    sfx.click()
  }

  const stallProps = {
    className: css.stall,
    'aria-label': spec.label,
    onClick: guardTap,
    onMouseEnter: () => sfx.stall(id),
  }
  return (
    <div
      ref={wrapRef}
      className={cn(css.stallWrap, open && css.dialogOpen)}
      style={
        {
          '--tint': spec.tint,
          '--stall-w': spec.desktopSize[0],
          '--stall-h': spec.desktopSize[1],
        } as React.CSSProperties
      }
      data-stall={id}
    >
      {spec.external ? (
        <a {...stallProps} href={spec.href} target='_blank' rel='noreferrer'>
          <StallInner id={id} bp={bp} />
        </a>
      ) : (
        <Link {...stallProps} url={spec.href}>
          <StallInner id={id} bp={bp} />
        </Link>
      )}
      <Dialog spec={spec} />
    </div>
  )
}

function Stairs(props: {
  id: string
  bp: Breakpoint
  side?: 'left' | 'right'
}) {
  const { id, bp, side } = props
  return (
    <div
      className={cn(
        css.stairs,
        side === 'left' && css.stairsL,
        side === 'right' && css.stairsR,
      )}
    >
      <img
        src={src(`stairs-${id}-${bp}`)}
        alt=''
        draggable={false}
        loading='lazy'
      />
    </div>
  )
}

/* ---------- floor 1: the street ---------- */

function StreetFloor(props: { bp: Breakpoint; onDoor: () => void }) {
  const { bp, onDoor } = props
  return (
    <section className={css.floor} data-floor=''>
      <Tile file='p1-bg-full' />
      <Frames priority prefix='live-glitch' count={2} className={css.pGlitch} />
      <Frames
        priority
        prefix='live-sky-blink'
        count={2}
        className={css.pBlink}
      />
      <div
        className={css.bgBand}
        style={{ backgroundImage: `url(${src('p1-bg-band')})` }}
      />
      <div className={css.carLane}>
        <div className={css.car}>
          <Frames priority prefix='car' count={3} />
        </div>
        <div className={cn(css.car, css.carBack)}>
          <Frames priority prefix='car' count={3} />
        </div>
      </div>
      <div
        className={css.ground}
        style={{ backgroundImage: `url(${src('p1-street')})` }}
      />
      <Frames priority prefix='live-puddle' count={2} className={css.pPuddle} />
      <div className={css.rat}>
        <Frames priority prefix='live-rat' count={2} />
      </div>
      <div className={css.streetScene} data-bp={bp}>
        <img
          src={src(`p1-street-scene-${bp}`)}
          alt=''
          draggable={false}
          loading='eager'
          fetchPriority='high'
        />
        <Frames
          priority
          prefix='live-lamp'
          count={2}
          className={cn(css.propImg, css.pLamp)}
        />
        <Frames
          priority
          prefix='live-crow'
          count={2}
          className={cn(css.propImg, css.pCrow)}
        />
        <Link
          url='/'
          aria-label='bus stop: exit to the city'
          className={css.busLink}
          onMouseEnter={() => sfx.bus()}
          onClick={() => sfx.click()}
        >
          <span aria-hidden='true' />
        </Link>
        <button
          type='button'
          className={css.door}
          aria-label='enter the market'
          onMouseEnter={() => sfx.door()}
          onClick={onDoor}
        >
          {['closed', 'mid', 'ajar'].map((state) => (
            <img
              key={state}
              src={src(`p1-door-${state}`)}
              alt=''
              draggable={false}
              loading='eager'
              fetchPriority='high'
              className={css.doorFrame}
            />
          ))}
        </button>
      </div>
      <Frames priority prefix='live-vent' count={3} className={css.pVent} />
    </section>
  )
}

/* ---------- market floors ---------- */

type MarketSpec = { stalls: StallId[]; stairs: string; stairsFirst?: boolean }

const DESKTOP_MARKETS: MarketSpec[] = [
  { stalls: ['uses', 'games', 'travel'], stairs: 'h' },
  { stalls: ['manual', 'serve'], stairs: 'i', stairsFirst: true },
  {
    stalls: ['talks', 'papers', 'projects'],
    stairs: 'o',
    stairsFirst: true,
  },
]

const MOBILE_MARKETS: MarketSpec[] = [
  { stalls: ['uses', 'games'], stairs: 'h' },
  { stalls: ['travel', 'manual'], stairs: 'i', stairsFirst: true },
  { stalls: ['serve', 'projects'], stairs: 'c' },
  { stalls: ['talks', 'papers'], stairs: 'o', stairsFirst: true },
]

function MarketFloor(props: {
  spec: MarketSpec
  bp: Breakpoint
  index: number
}) {
  const { spec, bp, index } = props
  const mobile = bp === 'mobile'
  const stairs = (
    <Stairs
      id={spec.stairs}
      bp={bp}
      side={mobile ? undefined : spec.stairsFirst ? 'left' : 'right'}
    />
  )
  return (
    <section className={cn(css.floor, css.floorMkt)} data-floor=''>
      <Tile file={`mkt-wall-${(index % 3) + 1}`} />
      <Tile file='mkt-depth' />
      <div
        className={cn(css.ground, css.mktGround)}
        style={{ backgroundImage: `url(${src('mkt-floor')})` }}
      />
      {mobile && (
        <div
          className={css.ledge}
          style={{ backgroundImage: `url(${src('mkt-ledge')})` }}
        />
      )}
      {mobile ? (
        <div className={cn(spec.stairsFirst ? css.mGridL : css.mGridR)}>
          <Stall id={spec.stalls[0]} bp='mobile' />
          {stairs}
          <Stall id={spec.stalls[1]} bp='mobile' />
        </div>
      ) : (
        <>
          {stairs}
          <div className={css.mktRow}>
            {spec.stalls.map((id) => (
              <Stall key={id} id={id} bp='desktop' />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

/* ---------- page ---------- */

export default function BazaarView() {
  const sceneRef = useRef<HTMLDivElement>(null)
  const [sound, setSound] = useState(false)

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
          el.classList.toggle(css.dimmed, el !== best)
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

  useEffect(() => {
    if (!sound) return
    const timer = setInterval(() => sfx.sign(), 9000)
    return () => clearInterval(timer)
  }, [sound])

  const toggleSound = () => {
    const next = !sound
    setSound(next)
    setSoundEnabled(next)
    localStorage.setItem('bazaar-sound', next ? 'on' : 'off')
    if (next) sfx.click()
  }

  const scrollToMarket = () => {
    sfx.click()
    sceneRef.current?.scrollTo({
      top: sceneRef.current.clientHeight,
      behavior: 'smooth',
    })
  }

  return (
    <Shell canonical='/bazaar'>
      <div className={css.scene} ref={sceneRef}>
        <div className={css.hud}>
          <button type='button' className={css.hudBtn} onClick={toggleSound}>
            sound: {sound ? 'on' : 'off'}
          </button>
        </div>

        <div className={css.desktopTree}>
          <StreetFloor bp='desktop' onDoor={scrollToMarket} />
          {DESKTOP_MARKETS.map((spec, i) => (
            <Fragment key={spec.stairs}>
              <div
                className={css.slab}
                style={{
                  backgroundImage: `url(${src(`slab-pipes-${(i % 3) + 1}`)})`,
                }}
              />
              <MarketFloor spec={spec} bp='desktop' index={i} />
            </Fragment>
          ))}
        </div>

        <div className={css.mobileTree}>
          <StreetFloor bp='mobile' onDoor={scrollToMarket} />
          {MOBILE_MARKETS.map((spec, i) => (
            <Fragment key={spec.stairs}>
              <div
                className={css.slab}
                style={{
                  backgroundImage: `url(${src(`slab-pipes-${(i % 3) + 1}`)})`,
                }}
              />
              <MarketFloor spec={spec} bp='mobile' index={i} />
            </Fragment>
          ))}
        </div>
      </div>
    </Shell>
  )
}
