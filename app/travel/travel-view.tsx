'use client'

import cn from 'clsx'
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { sceneTrap, useHotkeys } from 'services/hotkeys'
import Shell from 'services/shell'
import { useTheme } from 'services/theme'
import { useRouteTransition } from 'services/transition/context'
import consoleAmbience from './console-ambience.module.css'
import consoleShell from './console-shell.module.css'
import type { CityPinPoint } from './contact-row'
import { CITY_PIN_LANDING_COUNT } from './contact-row'
import {
  DESTINATIONS,
  type Destination,
  HOME,
  REGIONS,
  type Region,
} from './destinations'
import fxq from './fx-quiet.module.css'
import HeadingWing from './heading-wing'
import headingWing from './heading-wing.module.css'
import OverheadPanel from './overhead-panel'
import ScopeControlDeck from './scope-control-deck'
import ScopeStage from './scope-stage'
import ShipLog from './ship-log'
import { disposeRegionSignals, playRegionSignal } from './signals'
import { createTravelAudio } from './travel-audio'
import css from './travel-control.module.css'
import TravelRadio from './travel-radio'
import { useVisitor, visitorNoteFor } from './travel-uplink'
import { useSupernovaLoop } from './use-supernova-loop'
import {
  TRAVEL_ZOOM_MAX,
  TRAVEL_ZOOM_MIN,
  useTravelGlobe,
} from './use-travel-globe'

const SCENE_ZOOM_MAX = TRAVEL_ZOOM_MAX * 2
// 120ms rocker settle + 400ms CRT collapse + a beat of dead screen
const POWER_OFF_EXIT_MS = 850
const ZOOM_KEY_SETTLE_MS = 170

const isMechanicalControl = (
  target: EventTarget | null,
  console: HTMLElement,
): boolean => {
  if (!(target instanceof Element)) return false
  const control = target.closest<HTMLElement>('button:not(:disabled), a[href]')
  return Boolean(
    control &&
      console.contains(control) &&
      control.getAttribute('aria-disabled') !== 'true',
  )
}

const isRotaryControl = (
  target: EventTarget | null,
  console: HTMLElement,
): boolean => {
  if (!(target instanceof Element)) return false
  const control = target.closest<HTMLElement>('[data-travel-sfx="knob"]')
  return Boolean(control && console.contains(control))
}

export default function TravelView() {
  const [tracked, setTracked] = useState<Destination>(HOME)
  const [activeRegion, setActiveRegion] = useState(HOME.region)
  const [pinLanding, setPinLanding] = useState(0)
  const [pinPoint, setPinPoint] = useState<CityPinPoint | null>(null)
  const { locate: locateVisitor, state: uplink, visitor } = useVisitor()
  const { fxMode } = useTheme()
  const transition = useRouteTransition()
  const [travelAudio] = useState(createTravelAudio)
  const [pressedZoom, setPressedZoom] = useState<'in' | 'out' | null>(null)
  const [poweredOff, setPoweredOff] = useState(false)
  const zoomPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const moonBackSvgRef = useRef<SVGSVGElement>(null)
  const moonBackOrbitRef = useRef<SVGPathElement>(null)
  const moonBackBodyRef = useRef<SVGGElement>(null)
  const moonBackLabelRef = useRef<SVGTextElement>(null)
  const moonFrontSvgRef = useRef<SVGSVGElement>(null)
  const moonFrontOrbitRef = useRef<SVGPathElement>(null)
  const moonFrontBodyRef = useRef<SVGGElement>(null)
  const moonFrontLabelRef = useRef<SVGTextElement>(null)
  const moon = {
    back: {
      svg: moonBackSvgRef,
      orbit: moonBackOrbitRef,
      body: moonBackBodyRef,
      label: moonBackLabelRef,
    },
    front: {
      svg: moonFrontSvgRef,
      orbit: moonFrontOrbitRef,
      body: moonFrontBodyRef,
      label: moonFrontLabelRef,
    },
  }
  const trackDestination = useCallback(
    (spot: Destination, nextPinPoint?: CityPinPoint) => {
      setTracked(spot)
      setActiveRegion(spot.region)
      setPinPoint(nextPinPoint ?? null)
      setPinLanding((current) => {
        const offset =
          1 + Math.floor(Math.random() * (CITY_PIN_LANDING_COUNT - 1))
        return (current + offset) % CITY_PIN_LANDING_COUNT
      })
    },
    [],
  )
  const globe = useTravelGlobe({
    tracked,
    quiet: fxMode === 'quiet',
    visitor,
    onSelect: trackDestination,
    manualZoomMax: SCENE_ZOOM_MAX,
    canvasFit: 'viewport',
    visitorMarkerScale: 1.4,
    colorway: 'signalscope',
    devicePixelRatioCap: 1.35,
    moon,
  })
  const zoomInAtLimit = globe.zoomLevel >= SCENE_ZOOM_MAX
  const zoomOutAtLimit = globe.zoomLevel <= TRAVEL_ZOOM_MIN
  const changeZoom = (direction: 'in' | 'out') => {
    if (direction === 'in') globe.zoomIn()
    else globe.zoomOut()
  }
  const actuateZoom = (direction: 'in' | 'out') => {
    const atLimit = direction === 'in' ? zoomInAtLimit : zoomOutAtLimit
    if (atLimit) return
    setPressedZoom(direction)
    if (zoomPressTimerRef.current !== null) {
      clearTimeout(zoomPressTimerRef.current)
    }
    changeZoom(direction)
    zoomPressTimerRef.current = setTimeout(() => {
      setPressedZoom(null)
      zoomPressTimerRef.current = null
    }, ZOOM_KEY_SETTLE_MS)
  }
  const supernova = useSupernovaLoop({ quiet: fxMode === 'quiet' })
  const activeRegionMeta =
    REGIONS.find((region) => region.id === activeRegion) ?? REGIONS[0]
  const activeRegionSpots = DESTINATIONS.filter(
    (spot) => spot.region === activeRegion,
  )
  const activeRegionIndex = REGIONS.findIndex(
    (region) => region.id === activeRegion,
  )
  const [regionStatus, setRegionStatus] = useState('')
  const announcedRegionRef = useRef(activeRegion)
  useEffect(() => {
    if (announcedRegionRef.current === activeRegion) return
    announcedRegionRef.current = activeRegion
    setRegionStatus(`Region: ${activeRegionMeta.label}`)
  }, [activeRegion, activeRegionMeta.label])
  const visitorNote = visitorNoteFor(uplink)
  const visitorNoteBusy =
    uplink.status === 'idle' || uplink.status === 'locating'
  const armTravelAudio = useCallback(() => {
    if (fxMode !== 'quiet') travelAudio.arm()
  }, [fxMode, travelAudio])

  const playTravelRotaryTick = useCallback(
    (direction: -1 | 1) => {
      if (fxMode !== 'quiet') travelAudio.playRotaryTick(direction)
    },
    [fxMode, travelAudio],
  )

  const playTravelButtonPress = useCallback(() => {
    if (fxMode !== 'quiet') travelAudio.playButtonPress()
  }, [fxMode, travelAudio])

  const handleMechanicalPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (
        event.button === 0 &&
        isRotaryControl(event.target, event.currentTarget)
      ) {
        armTravelAudio()
        playTravelRotaryTick(1)
        return
      }
      if (
        event.button === 0 &&
        isMechanicalControl(event.target, event.currentTarget)
      ) {
        playTravelButtonPress()
      }
    },
    [armTravelAudio, playTravelButtonPress, playTravelRotaryTick],
  )

  const handleMechanicalClick = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      if (
        event.detail === 0 &&
        isMechanicalControl(event.target, event.currentTarget)
      ) {
        playTravelButtonPress()
      }
    },
    [playTravelButtonPress],
  )

  useEffect(() => {
    return () => {
      if (zoomPressTimerRef.current !== null) {
        clearTimeout(zoomPressTimerRef.current)
      }
      travelAudio.dispose()
      disposeRegionSignals()
    }
  }, [travelAudio])

  const turnOff = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    if (poweredOff) return
    setPoweredOff(true)
    transition.navigateLater('/', POWER_OFF_EXIT_MS)
  }

  const tuneTo = (region: Region) => {
    if (region === activeRegion) return
    setActiveRegion(region)
    if (fxMode !== 'quiet') playRegionSignal(region)
  }

  const trackSibling = (direction: -1 | 1) => {
    const index = DESTINATIONS.findIndex((spot) => spot.code === tracked.code)
    const count = DESTINATIONS.length
    trackDestination(DESTINATIONS[(index + direction + count) % count])
  }

  const trackSiblingRegion = (direction: -1 | 1) => {
    const index = REGIONS.findIndex((region) => region.id === activeRegion)
    const count = REGIONS.length
    const next = REGIONS[(index + direction + count) % count]
    const first = DESTINATIONS.find((spot) => spot.region === next.id)
    if (!first) return
    trackDestination(first)
    if (fxMode !== 'quiet') playRegionSignal(next.id)
  }

  const radarTrap = (press: () => void) =>
    sceneTrap(() => {
      playTravelButtonPress()
      press()
    })

  useHotkeys([
    ['[', radarTrap(() => trackSibling(-1))],
    [']', radarTrap(() => trackSibling(1))],
    // tinykeys rejects presses with unlisted modifiers: shifted
    // characters need the Shift declared or they never match
    ['Shift+{', radarTrap(() => trackSiblingRegion(-1))],
    ['Shift+}', radarTrap(() => trackSiblingRegion(1))],
    [['Equal', 'Shift+Equal'], radarTrap(() => changeZoom('in'))],
    ['Minus', radarTrap(() => changeZoom('out'))],
    ['0', radarTrap(() => trackDestination(HOME))],
  ])

  return (
    <Shell className={css.frame} shellClassName={css.travelShell}>
      <section
        className={cn(
          consoleShell.console,
          poweredOff && consoleShell.consoleOff,
        )}
        aria-labelledby='travel-control-title'
        onPointerDownCapture={handleMechanicalPointerDown}
        onClickCapture={handleMechanicalClick}
      >
        <OverheadPanel
          poweredOff={poweredOff}
          visitorNote={visitorNote}
          visitorNoteBusy={visitorNoteBusy}
          turnOff={turnOff}
          locateVisitor={locateVisitor}
        />

        <div className={css.panorama}>
          <HeadingWing
            tracked={tracked}
            compassRef={globe.compassRef}
            compassHeadingRef={globe.compassHeadingRef}
            compassLatitudeRef={globe.compassLatitudeRef}
          />

          <ScopeStage tracked={tracked} globe={globe} moon={moon}>
            <ScopeControlDeck
              tracked={tracked}
              globe={globe}
              supernova={supernova}
              pressedZoom={pressedZoom}
              zoomInAtLimit={zoomInAtLimit}
              zoomOutAtLimit={zoomOutAtLimit}
              actuateZoom={actuateZoom}
              armTravelAudio={armTravelAudio}
              playTravelRotaryTick={playTravelRotaryTick}
            />
          </ScopeStage>

          <aside
            className={cn(
              headingWing.instrumentWing,
              headingWing.starboardWing,
            )}
            aria-labelledby='travel-radio-title'
          >
            <header>
              <span>03</span>
              <strong
                className={headingWing.instrumentLabel}
                id='travel-radio-title'
              >
                Local radio
              </strong>
              <i
                className={cn(headingWing.radioLed, fxq.radioLed)}
                aria-hidden='true'
              />
            </header>
            <p className={headingWing.radioHint}>
              Explore each city&apos;s radio.
            </p>
            <TravelRadio
              destinationCode={tracked.code}
              destinationName={tracked.name}
              travelAudio={travelAudio}
            />
          </aside>
        </div>

        <ShipLog
          tracked={tracked}
          activeRegion={activeRegion}
          activeRegionIndex={activeRegionIndex}
          activeRegionMeta={activeRegionMeta}
          activeRegionSpots={activeRegionSpots}
          pinLanding={pinLanding}
          pinPoint={pinPoint}
          regionStatus={regionStatus}
          tuneTo={tuneTo}
          trackDestination={trackDestination}
        />

        <footer className={css.scopeInstructions} id='scope-instructions'>
          <span>DRAG SKY / TURN DIALS</span>
          <span>WHEEL / PINCH / + − RANGE</span>
          <span>POINT / TAP / PICK A SIGNAL</span>
          <span>KEYS [ ] PLACE / {'{ }'} REGION / 0 HOME</span>
        </footer>

        <div
          className={cn(consoleAmbience.firelight, fxq.firelight)}
          aria-hidden='true'
        />
        {supernova.flashing && (
          <div className={consoleAmbience.supernova} aria-hidden='true' />
        )}
      </section>
    </Shell>
  )
}
