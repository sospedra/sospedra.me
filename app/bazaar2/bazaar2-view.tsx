'use client'

import cn from 'clsx'
import Link from 'components/Link'
import SpriteCar from 'components/Sprite/Car'
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
import { type StallId, setSoundEnabled, sfx } from '../bazaar/sounds'
import styles from './bazaar2.module.css'

const pixelFont = Press_Start_2P({ weight: '400', subsets: ['latin'] })

const ASSETS = '/images/bazaar2/assets'
const STREET = '/images/bazaar2/assets/street2'
const src = (file: string) => `${ASSETS}/${file}.png`

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
    <section className={styles.floor} data-floor=''>
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

type Stall2Id =
  | 'uses'
  | 'games'
  | 'travel'
  | 'manual'
  | 'console'
  | 'projects'
  | 'talks'
  | 'papers'

/* sounds.ts still speaks v4 ids */
const SFX_ID: Record<Stall2Id, StallId> = {
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
  tint: string
  desktopSize: [number, number]
  desc: string
  links: StallLink[]
}

const STALLS: Record<Stall2Id, StallSpec> = {
  uses: {
    label: 'uses',
    href: '/uses',
    tint: '#e06080',
    desktopSize: [152, 120],
    desc: USES_DESC,
    links: [{ label: 'browse the gear', href: '/uses' }],
  },
  games: {
    label: 'games',
    href: '/g-snake',
    tint: '#4a90d9',
    desktopSize: [86, 96],
    desc: 'Two arcade cabinets, no coins needed.',
    links: [
      { label: 'g-snake', href: '/g-snake' },
      { label: 'g-mines', href: '/g-mines' },
      { label: 'rubiks', href: '/rubiks' },
    ],
  },
  travel: {
    label: 'travel',
    href: '/travel',
    tint: '#7a6fe6',
    desktopSize: [117, 150],
    desc: TRAVEL_DESC,
    links: [{ label: 'see the flight log', href: '/travel' }],
  },
  manual: {
    label: 'manual',
    href: '/manual',
    tint: '#e06080',
    desktopSize: [91, 120],
    desc: MANUAL_DESC,
    links: [{ label: 'read the manual', href: '/manual' }],
  },
  console: {
    label: 'console',
    href: '/serve',
    tint: '#a8b04a',
    desktopSize: [74, 96],
    desc: SERVE_DESC,
    links: [{ label: 'open the archive', href: '/serve' }],
  },
  projects: {
    label: 'projects',
    href: 'https://rfm.sospedra.me' as Route,
    external: true,
    tint: '#4ab06a',
    desktopSize: [94, 150],
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
    href: '/talks',
    tint: '#e0a040',
    desktopSize: [100, 150],
    desc: TALKS_DESC,
    links: [{ label: 'play the tapes', href: '/talks' }],
  },
  papers: {
    label: 'papers',
    href: '/papers',
    tint: '#7ab0d0',
    desktopSize: [97, 120],
    desc: PAPERS_DESC,
    links: [{ label: 'read the papers', href: '/papers' }],
  },
}

/* papers is the hologram: idle frames only, flicker is runtime CSS */
const HOVERLESS: ReadonlySet<Stall2Id> = new Set(['papers'])

/* places delivered as one baked scene render (new pipeline) */
const BAKED: ReadonlySet<Stall2Id> = new Set([
  'uses',
  'travel',
  'console',
  'manual',
  'papers',
  'games',
  'talks',
  'projects',
])

type Bp = 'desktop' | 'mobile'

function KeeperFrames(props: {
  id: Stall2Id
  state: 'idle' | 'hover'
  count: number
}) {
  const { id, state, count } = props
  const frames = Array.from({ length: count }, (_, i) => i + 1)
  const stateClass = state === 'idle' ? styles.keeperIdle : styles.keeperHover
  return (
    <div className={cn(styles.keeper, stateClass)}>
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

function StallInner({ id, bp }: { id: Stall2Id; bp: Bp }) {
  if (BAKED.has(id)) {
    return (
      <>
        <img src={src(`stall-${id}-baked`)} alt='' className={styles.fill} />
        <div className={styles.glowWash} />
      </>
    )
  }
  return (
    <>
      <img
        src={src(`stall-${id}-${bp}-interior`)}
        alt=''
        className={cn(styles.fill, styles.interior)}
      />
      <KeeperFrames id={id} state='idle' count={2} />
      {!HOVERLESS.has(id) && <KeeperFrames id={id} state='hover' count={3} />}
      {id === 'manual' && (
        <div className={cn(styles.customer, styles.cycle2)}>
          <img
            src={src('stall-manual-customer-idle-1')}
            alt=''
            loading='lazy'
          />
          <img
            src={src('stall-manual-customer-idle-2')}
            alt=''
            loading='lazy'
          />
        </div>
      )}
      <img
        src={src(`stall-${id}-${bp}-front`)}
        alt=''
        className={styles.fill}
      />
      <div className={styles.glowWash} />
    </>
  )
}

function Dialog({ spec }: { spec: StallSpec }) {
  return (
    <div className={cn(styles.dialog, pixelFont.className)}>
      <p className={styles.dialogDesc}>{spec.desc}</p>
      <div className={styles.dialogLinks}>
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

function Stall({ id, bp }: { id: Stall2Id; bp: Bp }) {
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
      sfx.stall(SFX_ID[id])
      return
    }
    sfx.click()
  }

  const stallProps = {
    className: styles.stall,
    'aria-label': spec.label,
    'data-label': spec.label,
    onClick: guardTap,
    onMouseEnter: () => sfx.stall(SFX_ID[id]),
  }
  return (
    <div
      ref={wrapRef}
      className={cn(styles.stallWrap, open && styles.dialogOpen)}
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

function Stairs(props: { id: number; side?: 'left' | 'right' }) {
  const { id, side } = props
  return (
    <div
      className={cn(
        styles.stairs,
        side === 'left' && styles.stairsL,
        side === 'right' && styles.stairsR,
      )}
    >
      <img src={src(`stairs-${id}`)} alt='' draggable={false} loading='lazy' />
    </div>
  )
}

/* ---------- market floors ---------- */

type MarketSpec = { stalls: Stall2Id[]; stairs: number; stairsFirst?: boolean }

const DESKTOP_MARKETS: MarketSpec[] = [
  { stalls: ['uses', 'games', 'travel'], stairs: 1 },
  { stalls: ['manual', 'console'], stairs: 2, stairsFirst: true },
  { stalls: ['talks', 'papers', 'projects'], stairs: 3, stairsFirst: true },
]

const MOBILE_MARKETS: MarketSpec[] = [
  { stalls: ['uses', 'games'], stairs: 1 },
  { stalls: ['travel', 'manual'], stairs: 2, stairsFirst: true },
  { stalls: ['console', 'projects'], stairs: 3 },
  { stalls: ['talks', 'papers'], stairs: 1, stairsFirst: true },
]

function MarketFloor(props: { spec: MarketSpec; bp: Bp; index: number }) {
  const { spec, bp, index } = props
  const mobile = bp === 'mobile'
  const stairs = (
    <Stairs
      id={spec.stairs}
      side={mobile ? undefined : spec.stairsFirst ? 'left' : 'right'}
    />
  )
  return (
    <section
      className={cn(styles.floor, styles.floorMkt)}
      data-floor=''
      data-stairs={mobile ? undefined : spec.stairsFirst ? 'left' : 'right'}
    >
      <div
        className={styles.envTile}
        style={{ backgroundImage: `url(${src(`mkt-env-${(index % 3) + 1}`)})` }}
      />
      {!mobile && stairs}
      <div className={styles.mktFrame}>
        {mobile ? (
          <div className={cn(spec.stairsFirst ? styles.mGridL : styles.mGridR)}>
            <Stall id={spec.stalls[0]} bp='mobile' />
            {stairs}
            <Stall id={spec.stalls[1]} bp='mobile' />
          </div>
        ) : (
          <div className={styles.mktRow}>
            {spec.stalls.map((id) => (
              <Stall key={id} id={id} bp='desktop' />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

/* ---------- page ---------- */

export default function Bazaar2View() {
  const sceneRef = useRef<HTMLDivElement>(null)
  const fgRef = useRef<HTMLDivElement>(null)
  const [sound, setSound] = useState(false)
  const [hitbox, setHitbox] = useState(false)
  const [grid, setGrid] = useState(true)

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
      </div>
      {grid && <Grid />}
      <div className={styles.fadeIn} aria-hidden />
      <div ref={fgRef} className={styles.fgLayer} aria-hidden>
        <span className={styles.fgL} />
        <span className={styles.fgR} />
      </div>

      <div className={styles.desktopTree}>
        <StreetFloor onDoor={scrollToMarket} />
        {DESKTOP_MARKETS.map((spec, i) => (
          <Fragment key={spec.stalls[0]}>
            <div
              className={styles.slab}
              style={{
                backgroundImage: `url(/images/bazaar/assets/slab-pipes-${(i % 3) + 1}.png)`,
              }}
            />
            <MarketFloor spec={spec} bp='desktop' index={i} />
          </Fragment>
        ))}
      </div>

      <div className={styles.mobileTree}>
        <StreetFloor onDoor={scrollToMarket} />
        {MOBILE_MARKETS.map((spec, i) => (
          <Fragment key={spec.stalls[0]}>
            <div
              className={styles.slab}
              style={{
                backgroundImage: `url(/images/bazaar/assets/slab-pipes-${(i % 3) + 1}.png)`,
              }}
            />
            <MarketFloor spec={spec} bp='mobile' index={i} />
          </Fragment>
        ))}
      </div>
    </main>
  )
}
