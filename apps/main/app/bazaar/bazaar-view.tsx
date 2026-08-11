'use client'

import cn from 'clsx'
import { sumBy } from 'es-toolkit'
import dynamic from 'next/dynamic'
import { Fragment, useEffect, useRef, useState } from 'react'
import SpriteCar from 'services/car/car'
import { useStoreSelector } from 'services/external-store'
import Link from 'services/link'
import Shell from 'services/shell'
import { prefersQuietFx } from 'services/theme'
import RainLayer from '../home/rain-layer'
import { DownSign, UpSign } from './arrow-sign'
import { artSrc } from './art-version'
import css from './bazaar.module.css'
import { chromeCss } from './chrome'
import { decorStore } from './decor-store'
import {
  DESKTOP_FLOORS,
  type DesktopFloor,
  MOBILE_FLOORS,
  type MobileFloor,
} from './floors'
import HostDecor from './host-decor'
import Stall from './market-stall'
import scene from './scene.module.css'
import { sfx } from './sounds'
import Stage from './stage'
import { DIMS } from './stall-catalog'
import street from './street-backdrop.module.css'

/* dev-only: the statically-false branch keeps every editor
   chunk out of preview and production builds */
const Editor =
  process.env.NODE_ENV === 'development'
    ? dynamic(() => import('./editor/editor'), { ssr: false })
    : null

const STREET = '/images/bazaar/street'

const DOOR_OPEN_MS = 350

function StreetFloor({ onDoor }: { onDoor: () => void }) {
  // armed on first hover, not on leave: the close must start the same
  // frame :hover drops, and a re-render would land one frame late
  const [doorArmed, setDoorArmed] = useState(false)
  const [carGone, setCarGone] = useState(false)
  return (
    <section className={scene.floor} data-floor='' data-market-scene=''>
      <img
        src={artSrc(`${STREET}/bg-tower.png`)}
        alt=''
        className={street.sTower}
        aria-hidden
        data-edit-id='street:tower'
      />
      <div className={street.streetBg} data-edit-id='street:bg' />
      <div className={street.sBlock} data-edit-id='street:block'>
        <div className={street.sAlleySigns} aria-hidden>
          <img src={artSrc(`${STREET}/alley-signs-1.png`)} alt='' />
          <img src={artSrc(`${STREET}/alley-signs-2.png`)} alt='' data-alt='' />
        </div>
        <div className={street.alleyShade} aria-hidden />
        <img
          src={artSrc(`${STREET}/building-pad.png`)}
          alt=''
          className={street.sPadL}
        />
        <img
          src={artSrc(`${STREET}/building-pad.png`)}
          alt=''
          className={street.sPadR}
        />
        <img
          src={artSrc(`${STREET}/building-pad.png`)}
          alt=''
          className={cn(street.sPadOut, street.sPadL2)}
          data-edit-id='street:padl2'
        />
        <img
          src={artSrc(`${STREET}/building-pad.png`)}
          alt=''
          className={cn(street.sPadOut, street.sPadL3)}
          data-edit-id='street:padl3'
        />
        <img
          src={artSrc(`${STREET}/building-pad.png`)}
          alt=''
          className={cn(street.sPadOut, street.sPadR2)}
          data-edit-id='street:padr2'
        />
        <img
          src={artSrc(`${STREET}/building-pad.png`)}
          alt=''
          className={cn(street.sPadOut, street.sPadR3)}
          data-edit-id='street:padr3'
        />
        <img
          src={artSrc(`${STREET}/building-a.png`)}
          alt=''
          className={street.sA}
        />
        <div className={street.sCDWrap}>
          <img
            src={artSrc(`${STREET}/building-cd.png`)}
            alt=''
            className={street.sCDImg}
          />
          <div className={scene.sNeon} aria-hidden>
            <img src={artSrc(`${STREET}/neon-off.png`)} alt='' />
            <div className={scene.sNeonOn}>
              <img src={artSrc(`${STREET}/neon.png`)} alt='Bazaar' />
            </div>
          </div>
          <button
            type='button'
            className={cn(
              scene.hit,
              scene.sDoor,
              doorArmed && scene.sDoorArmed,
            )}
            data-label='door'
            data-edit-id='street:door'
            aria-label='enter the market'
            onPointerEnter={(event) => {
              if (event.pointerType !== 'mouse') return
              setDoorArmed(true)
              sfx.hover()
            }}
            onClick={() => {
              sfx.door()
              setTimeout(onDoor, DOOR_OPEN_MS)
            }}
          >
            <img src={artSrc(`${STREET}/door.png`)} alt='' />
            <img
              src={artSrc(`${STREET}/door-open-1.png`)}
              alt=''
              data-frame='1'
            />
            <img
              src={artSrc(`${STREET}/door-open-2.png`)}
              alt=''
              data-frame='2'
            />
          </button>
        </div>
        <div className={street.alleyGlow} aria-hidden />
        <div className={street.sFloor} />
      </div>
      {!carGone && (
        <div
          className={scene.sCar}
          aria-hidden
          onAnimationEnd={(event) => {
            // the car sprite's own finite animations bubble up; only carDrive ends on this node
            if (event.target === event.currentTarget) setCarGone(true)
          }}
        >
          <div className={scene.sCarStretch}>
            <div className={scene.sCarSquash}>
              <div className={scene.sCarScale}>
                <SpriteCar engineOn isMoving />
              </div>
            </div>
          </div>
        </div>
      )}
      <Link
        url='/'
        className={cn(scene.hit, scene.sBus)}
        data-label='bus'
        data-edit-id='street:bus'
        aria-label='bus stop: exit to the city'
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') sfx.hover()
        }}
        onClick={() => sfx.bus()}
      >
        <img src={artSrc(`${STREET}/bus.png`)} alt='' />
        <img src={artSrc(`${STREET}/bus-on.png`)} alt='' data-on='' />
        <div className={scene.sBusPost} data-edit-id='street:bus-post'>
          <img src={artSrc(`${STREET}/bus-post.png`)} alt='' />
          <div className={scene.sBusPostOn}>
            <img src={artSrc(`${STREET}/bus-post-on.png`)} alt='' />
          </div>
        </div>
      </Link>
      <HostDecor host='street' />
      <RainLayer />
      <div className={scene.fgLayer} aria-hidden data-bazaar-fg=''>
        <span className={scene.fgL} data-edit-id='street:fg-l' />
        <span className={scene.fgR} data-edit-id='street:fg-r' />
      </div>
    </section>
  )
}

/* the fg silhouettes belong to the street: they slide up at 0.35x and
   are gone by half a viewport of scroll */
const useForegroundParallax = (
  sceneRef: React.RefObject<HTMLDivElement | null>,
) => {
  useEffect(() => {
    const sceneRoot = sceneRef.current
    if (!sceneRoot) return
    const layers = sceneRoot.querySelectorAll<HTMLElement>('[data-bazaar-fg]')
    if (layers.length === 0) return
    const onScroll = () => {
      const top = window.scrollY
      const quiet = prefersQuietFx()
      const opacity = String(Math.max(0, 1 - top / (window.innerHeight * 0.5)))
      for (const fg of layers) {
        if (!quiet) fg.style.transform = `translateY(${-top * 0.35}px)`
        fg.style.opacity = opacity
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [sceneRef])
}

function RatLane({ index }: { index: number }) {
  const laneRef = useRef<HTMLDivElement>(null)
  const [run, setRun] = useState(false)
  useEffect(() => {
    const floor = laneRef.current?.closest('[data-floor]')
    if (!floor) return
    const observer = new IntersectionObserver(([entry]) => {
      setRun(entry.isIntersecting)
    })
    observer.observe(floor)
    return () => observer.disconnect()
  }, [])
  return (
    <div
      ref={laneRef}
      className={css.ratLane}
      aria-hidden
      data-edit-id={`rat:${index}`}
      data-run={run ? '' : undefined}
    >
      <div className={css.ratRunner}>
        <div className={css.ratView}>
          <img
            className={css.ratStrip}
            src={artSrc('/images/bazaar/ambient/rat-run.png')}
            alt=''
          />
        </div>
      </div>
    </div>
  )
}

function MarketFloor(props: {
  spec: DesktopFloor
  index: number
  last: boolean
}) {
  const { spec, index, last } = props
  const totalWidth = sumBy(spec.stalls, (id) => DIMS[id].width)
  const stairs = (
    <div className={css.stairs} aria-hidden data-edit-id={`stairs:${index}`}>
      <HostDecor host={`stairs:${index}`} />
    </div>
  )
  const band = (
    <div className={css.band} data-stage='' data-edit-id={`band:${index}`}>
      {spec.stalls.map((id) => (
        <Stall key={id} id={id} eager={index === 0} />
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
      <div
        className={css.wf}
        aria-hidden
        data-wf-wall
        data-edit-id={`wall:${index}`}
      />
      <div
        className={css.wf}
        aria-hidden
        data-wf-floor
        data-edit-id={`wfloor:${index}`}
      />
      {index === 0 && <RatLane index={index} />}
      {spec.stairsRight ? band : stairs}
      {spec.stairsRight ? stairs : band}
      <UpSign side={spec.stairsRight ? 'right' : 'left'} index={index} />
      {!last && (
        <DownSign side={spec.stairsRight ? 'left' : 'right'} index={index} />
      )}
      <HostDecor host={`floor:${index}`} />
    </section>
  )
}

function MobileMarketFloor(props: {
  spec: MobileFloor
  index: number
  last: boolean
}) {
  const { spec, index, last } = props
  const sm = (
    <div className={css.sm} aria-hidden data-sm={index}>
      <HostDecor host={`sm:${index}`} />
    </div>
  )
  const stack = (
    <div className={css.stack} data-stage=''>
      <div className={css.deckM} aria-hidden data-edit-id={`deck:${index}`} />
      {spec.stalls.map((id) => (
        <div key={id} className={css.storyRow}>
          <Stall id={id} eager={index === 0} />
        </div>
      ))}
    </div>
  )
  return (
    <section
      className={cn(css.mfloor, spec.smRight && css.mfloorR)}
      data-floor=''
      data-market-index={index}
      data-mfloor={index}
    >
      <div className={css.mwf} aria-hidden data-edit-id={`mwall:${index}`} />
      {spec.smRight ? stack : sm}
      {spec.smRight ? sm : stack}
      <UpSign side={spec.smRight ? 'right' : 'left'} index={index} m />
      {!last && (
        <DownSign side={spec.smRight ? 'left' : 'right'} index={index} m />
      )}
      <HostDecor host={`mfloor:${index}`} />
    </section>
  )
}

export default function BazaarView() {
  const sceneRef = useRef<HTMLDivElement>(null)
  useForegroundParallax(sceneRef)
  const floors = useStoreSelector(decorStore, (doc) => doc.floors)
  const desktopFloors = floors?.desktop ?? DESKTOP_FLOORS
  const mobileFloors = floors?.mobile ?? MOBILE_FLOORS
  const [editor, setEditor] = useState(false)
  const chrome = useStoreSelector(decorStore, (doc) => doc.chrome)

  const scrollToMarket = () => {
    window.scrollTo({
      top: window.innerHeight,
      behavior: prefersQuietFx() ? 'auto' : 'smooth',
    })
  }

  return (
    <Shell>
      <Stage editing={editor}>
        {chrome && <style>{chromeCss(chrome)}</style>}
        <div className={css.scene} ref={sceneRef} data-bazaar-scene=''>
          <h1 className='sr-only'>Bazaar</h1>
          {Editor && (
            <div className={scene.hud}>
              <button
                type='button'
                className={scene.hudBtn}
                aria-pressed={editor}
                onClick={() => setEditor((previous) => !previous)}
              >
                EDITOR <span aria-hidden='true'>{editor ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          )}

          <div className={css.desktopTree}>
            <div className={cn(scene.scene, css.streetHost)}>
              <StreetFloor onDoor={scrollToMarket} />
            </div>
            {desktopFloors.map((spec, i) => (
              <Fragment key={spec.stalls[0]}>
                <div
                  className={css.sep}
                  data-bazaar-sep={i}
                  data-edit-id={`sep:${i}`}
                >
                  <HostDecor host={`sep:${i}`} />
                </div>
                <MarketFloor
                  spec={spec}
                  index={i}
                  last={i === desktopFloors.length - 1}
                />
              </Fragment>
            ))}
            <div
              className={css.sep}
              data-bazaar-sep={desktopFloors.length}
              data-edit-id={`sep:${desktopFloors.length}`}
            >
              <HostDecor host={`sep:${desktopFloors.length}`} />
            </div>
            <div className={css.bottomPad} />
          </div>

          <div className={css.mobileTree}>
            <div className={cn(scene.scene, css.streetHost)}>
              <StreetFloor onDoor={scrollToMarket} />
            </div>
            {mobileFloors.map((spec, i) => (
              <Fragment key={spec.stalls[0]}>
                <div className={css.sepM} data-edit-id={`msep:${i}`} />
                <MobileMarketFloor
                  spec={spec}
                  index={i}
                  last={i === mobileFloors.length - 1}
                />
              </Fragment>
            ))}
            <div
              className={css.sepM}
              data-edit-id={`msep:${mobileFloors.length}`}
            />
            <div className={css.bottomPad} />
          </div>

          <div
            className={css.dialogLayer}
            data-bazaar-dialog-layer
            aria-hidden
          />
        </div>
        {Editor && editor && <Editor />}
      </Stage>
    </Shell>
  )
}
