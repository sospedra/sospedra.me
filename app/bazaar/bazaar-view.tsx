'use client'

import cn from 'clsx'
import { sumBy } from 'es-toolkit'
import { Fragment, useRef, useState, useSyncExternalStore } from 'react'
import SpriteCar from 'services/car/car'
import Link from 'services/link'
import Shell from 'services/shell'
import { prefersQuietFx } from 'services/theme'
import css from './bazaar.module.css'
import LayoutEditor from './layout-editor'
import Stall from './market-stall'
import scene from './scene.module.css'
import { sfx, soundPreference } from './sounds'
import { DIMS } from './stall-catalog'
import type { BazaarStallId } from './stalls-manifest'
import street from './street-backdrop.module.css'

const STREET = '/images/bazaar/street'

const DOOR_OPEN_MS = 350

function StreetFloor({ onDoor }: { onDoor: () => void }) {
  return (
    <section className={scene.floor} data-floor='' data-market-scene=''>
      <img
        src={`${STREET}/bg-tower.png`}
        alt=''
        className={street.sTower}
        aria-hidden
      />
      <div className={street.streetBg} />
      <div className={street.sAlleySigns} aria-hidden>
        <img src={`${STREET}/alley-signs-1.png`} alt='' />
        <img src={`${STREET}/alley-signs-2.png`} alt='' data-alt='' />
      </div>
      <div className={street.alleyShade} aria-hidden />
      <img src={`${STREET}/building-pad.png`} alt='' className={street.sPadL} />
      <img src={`${STREET}/building-pad.png`} alt='' className={street.sPadR} />
      <img src={`${STREET}/building-a.png`} alt='' className={street.sA} />
      <div className={street.sCDWrap}>
        <img
          src={`${STREET}/building-cd.png`}
          alt=''
          className={street.sCDImg}
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
            setTimeout(onDoor, DOOR_OPEN_MS)
          }}
        >
          <img src={`${STREET}/door.png`} alt='' />
          <img src={`${STREET}/door-open-1.png`} alt='' data-frame='1' />
          <img src={`${STREET}/door-open-2.png`} alt='' data-frame='2' />
        </button>
      </div>
      <div className={street.alleyGlow} aria-hidden />
      <div className={street.sFloor} />
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

type DesktopFloor = { stalls: BazaarStallId[]; stairsRight: boolean }
type MobileFloor = {
  stalls: [BazaarStallId, BazaarStallId]
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
  const totalWidth = sumBy(spec.stalls, (id) => DIMS[id].width)
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
      style={
        {
          '--sum': totalWidth,
          '--n': spec.stalls.length,
        } as React.CSSProperties
      }
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
  const minAspectRatio = Math.min(
    ...spec.stalls.map((id) => DIMS[id].width / DIMS[id].height),
  )
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
      style={{ '--armin': minAspectRatio } as React.CSSProperties}
    >
      {spec.smRight ? stack : sm}
      {spec.smRight ? sm : stack}
    </section>
  )
}

const serverSoundOff = () => false

export default function BazaarView() {
  const sceneRef = useRef<HTMLDivElement>(null)
  const sound = useSyncExternalStore(
    soundPreference.subscribe,
    soundPreference.isEnabled,
    serverSoundOff,
  )
  const [hitbox, setHitbox] = useState(false)
  const [editor, setEditor] = useState(false)

  const toggleSound = () => {
    const next = !sound
    soundPreference.setEnabled(next)
    if (next) sfx.click()
  }

  const scrollToMarket = () => {
    sceneRef.current?.scrollTo({
      top: sceneRef.current.clientHeight,
      behavior: prefersQuietFx() ? 'auto' : 'smooth',
    })
  }

  return (
    <Shell>
      <div
        className={css.scene}
        ref={sceneRef}
        data-hitbox={hitbox || undefined}
      >
        <h1 className='sr-only'>Bazaar</h1>
        <div className={scene.hud}>
          <button
            type='button'
            className={scene.hudBtn}
            aria-pressed={sound}
            onClick={toggleSound}
          >
            SOUND <span aria-hidden='true'>{sound ? 'ON' : 'OFF'}</span>
          </button>
          <button
            type='button'
            className={scene.hudBtn}
            aria-pressed={hitbox}
            onClick={() => setHitbox((previous) => !previous)}
          >
            HITBOX <span aria-hidden='true'>{hitbox ? 'ON' : 'OFF'}</span>
          </button>
          <button
            type='button'
            className={scene.hudBtn}
            aria-pressed={editor}
            onClick={() => setEditor((previous) => !previous)}
          >
            EDITOR <span aria-hidden='true'>{editor ? 'ON' : 'OFF'}</span>
          </button>
        </div>
        <LayoutEditor enabled={editor} />

        <div className={css.desktopTree}>
          <div className={cn(scene.scene, css.streetHost)}>
            <StreetFloor onDoor={scrollToMarket} />
          </div>
          {DESKTOP_FLOORS.map((spec, i) => (
            <Fragment key={spec.stalls[0]}>
              <div className={css.sep} data-bazaar-sep={i} />
              <MarketFloor spec={spec} index={i} />
            </Fragment>
          ))}
          <div className={css.sep} data-bazaar-sep={3} />
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
      </div>
    </Shell>
  )
}
