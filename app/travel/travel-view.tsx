'use client'

import cn from 'clsx'
import Link, { LinkBack } from 'components/Link'
import Shell from 'components/Shell'
import type { CSSProperties } from 'react'
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { useTheme } from 'service/theme'
import {
  DESTINATIONS,
  type Destination,
  flagOf,
  HOME,
  REGIONS,
  type Visitor,
} from './destinations'
import css from './travel-control.module.css'
import {
  TRAVEL_ZOOM_MAX,
  TRAVEL_ZOOM_MIN,
  useTravelGlobe,
} from './use-travel-globe'

const toRadians = (value: number): number => (value * Math.PI) / 180

const formatCoords = (spot: { lat: number; lon: number }): string => {
  const lat = `${Math.abs(spot.lat).toFixed(2)}°${spot.lat >= 0 ? 'N' : 'S'}`
  const lon = `${Math.abs(spot.lon).toFixed(2)}°${spot.lon >= 0 ? 'E' : 'W'}`
  return `${lat} ${lon}`
}

const EARTH_RADIUS_KM = 6371.0088
const distanceFormatter = new Intl.NumberFormat('en', {
  maximumFractionDigits: 0,
})

const distanceFromHome = (spot: Destination): number => {
  const latDelta = toRadians(spot.lat - HOME.lat)
  const lonDelta = toRadians(spot.lon - HOME.lon)
  const homeLat = toRadians(HOME.lat)
  const spotLat = toRadians(spot.lat)
  const chord =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(homeLat) * Math.cos(spotLat) * Math.sin(lonDelta / 2) ** 2
  return Math.round(
    EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(chord), Math.sqrt(1 - chord)),
  )
}

const formatRange = (spot: Destination): string =>
  spot.home
    ? 'Home · 0 km'
    : `${distanceFormatter.format(distanceFromHome(spot))} km`

const bearingFromHome = (spot: Destination): number => {
  if (spot.home) return 0
  const homeLat = toRadians(HOME.lat)
  const spotLat = toRadians(spot.lat)
  const lonDelta = toRadians(spot.lon - HOME.lon)
  const y = Math.sin(lonDelta) * Math.cos(spotLat)
  const x =
    Math.cos(homeLat) * Math.sin(spotLat) -
    Math.sin(homeLat) * Math.cos(spotLat) * Math.cos(lonDelta)
  return Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360)
}

const formatBearing = (spot: Destination): string =>
  `${String(bearingFromHome(spot)).padStart(3, '0')}°T`

const regionName = (spot: Destination): string =>
  REGIONS.find((region) => region.id === spot.region)?.label ?? spot.region

type UplinkState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'located'; visitor: Visitor }
  | { status: 'unavailable' }

type UplinkStatus = UplinkState['status']

type UplinkEvent =
  | { type: 'locate' }
  | { type: 'located'; visitor: Visitor }
  | { type: 'unavailable' }

const uplinkReducer = (state: UplinkState, event: UplinkEvent): UplinkState => {
  switch (event.type) {
    case 'locate':
      return { status: 'locating' }
    case 'located':
      return state.status === 'locating'
        ? { status: 'located', visitor: event.visitor }
        : state
    case 'unavailable':
      return state.status === 'locating' ? { status: 'unavailable' } : state
  }
}

const fetchVisitor = async (signal: AbortSignal): Promise<Visitor | null> => {
  const response = await fetch('/api/geo', { cache: 'no-store', signal })
  if (!response.ok) return null
  const data = await response.json()
  return data?.located ? data : null
}

const useVisitor = () => {
  const [state, dispatch] = useReducer(uplinkReducer, { status: 'idle' })
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => () => controllerRef.current?.abort(), [])

  const locate = useCallback(async () => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    dispatch({ type: 'locate' })
    try {
      const visitor = await fetchVisitor(controller.signal)
      dispatch(visitor ? { type: 'located', visitor } : { type: 'unavailable' })
    } catch (error) {
      if ((error as Error).name !== 'AbortError')
        dispatch({ type: 'unavailable' })
    }
  }, [])

  const visitor = state.status === 'located' ? state.visitor : null
  return { visitor, status: state.status, locate }
}

const UPLINK_BUTTON_LABEL: Record<UplinkStatus, string> = {
  idle: 'REPORT POSITION',
  locating: 'ACQUIRING…',
  located: 'REPORT POSITION', // unreachable: the button hides once a signal locks
  unavailable: 'RETRY SIGNAL',
}

function ContactRow(props: {
  index: number
  spot: Destination
  tracked: boolean
  onTrack: (spot: Destination) => void
}) {
  const { index, spot, tracked, onTrack } = props
  return (
    <li>
      <button
        type='button'
        className={css.contact}
        aria-pressed={tracked}
        aria-label={`Acquire ${spot.name}, ${formatCoords(spot)}, bearing ${formatBearing(spot)}, ${formatRange(spot)} from Catalunya`}
        onClick={() => onTrack(spot)}
      >
        <span className={css.contactIndex} aria-hidden='true'>
          {String(index).padStart(2, '0')}
        </span>
        <span className={css.contactIdentity}>
          <span className={css.name}>
            <span aria-hidden='true'>{flagOf(spot.country)}</span>
            {spot.name}
            {spot.home && <em>REF</em>}
          </span>
          <span className={css.coords}>{formatCoords(spot)}</span>
        </span>
        <span className={css.contactRange}>
          <span className={css.code}>{spot.code}</span>
          <span>
            {formatBearing(spot)} · {formatRange(spot)}
          </span>
        </span>
      </button>
    </li>
  )
}

export default function TravelView() {
  const [tracked, setTracked] = useState<Destination>(HOME)
  const [activeRegion, setActiveRegion] = useState(HOME.region)
  const uplink = useVisitor()
  const visitor = uplink.visitor
  const { fxMode } = useTheme()
  const trackDestination = useCallback((spot: Destination) => {
    setTracked(spot)
    setActiveRegion(spot.region)
  }, [])
  const globe = useTravelGlobe({
    tracked,
    quiet: fxMode === 'quiet',
    visitor,
    onSelect: trackDestination,
  })
  const activeRegionMeta =
    REGIONS.find((region) => region.id === activeRegion) ?? REGIONS[0]
  const activeRegionSpots = DESTINATIONS.filter(
    (spot) => spot.region === activeRegion,
  )

  return (
    <Shell
      canonical='/travel'
      className={css.frame}
      shellClassName={css.travelShell}
    >
      <section className={css.console} aria-labelledby='travel-control-title'>
        <header className={css.overheadPanel}>
          <nav className={css.utilityRail} aria-label='Travel navigation'>
            <Link url='/' className={css.backLink}>
              <LinkBack>Home</LinkBack>
            </Link>
            <p>SECTOR 05 / ONLINE</p>
          </nav>
          <div className={css.stationIdentity}>
            <p>RS–05 · AIR / SEA NAVIGATION BRIDGE</p>
            <h1 id='travel-control-title'>Travel control</h1>
            <span>Personal radar archive · Barcelona reference station</span>
          </div>
          <dl className={css.missionStats} aria-label='Radar traffic summary'>
            <div>
              <dt>Visited</dt>
              <dd>{String(DESTINATIONS.length).padStart(2, '0')}</dd>
            </div>
            <div>
              <dt>Sectors</dt>
              <dd>{String(REGIONS.length).padStart(2, '0')}</dd>
            </div>
            <div>
              <dt>Reference</dt>
              <dd>CAT</dd>
            </div>
          </dl>
          <div className={css.annunciators}>
            <span data-state='live'>SURVEILLANCE</span>
            <span data-state='live'>PRIMARY</span>
            <span data-state='home'>BCN 05</span>
          </div>
        </header>

        <div className={css.panorama}>
          <aside className={cn(css.instrumentWing, css.portWing)}>
            <header>
              <span>01</span>
              <strong className={css.instrumentLabel}>Heading reference</strong>
            </header>
            <div className={css.compassModule}>
              <div className={css.compassRose} aria-hidden='true'>
                <span className={css.north}>N</span>
                <span className={css.east}>E</span>
                <span className={css.south}>S</span>
                <span className={css.west}>W</span>
                <i
                  style={
                    {
                      '--bearing': `${bearingFromHome(tracked)}deg`,
                    } as CSSProperties
                  }
                />
              </div>
              <p>
                <small className={css.compassMeta}>TRUE BRG</small>
                <strong className={css.bearingValue}>
                  {formatBearing(tracked)}
                </strong>
                <span className={css.compassMeta}>
                  {tracked.code} / {regionName(tracked)}
                </span>
              </p>
            </div>
            <section className={css.contactSolution} aria-live='polite'>
              <header>
                <span>TRACK SOLUTION</span>
                <strong className={css.solutionState}>
                  {tracked.home ? 'REFERENCE' : 'ACQUIRED'}
                </strong>
              </header>
              <div className={css.solutionIdentity}>
                <span aria-hidden='true'>{flagOf(tracked.country)}</span>
                <strong>{tracked.name}</strong>
                <em>{tracked.code}</em>
              </div>
              <dl>
                <div>
                  <dt>Route</dt>
                  <dd>CAT → {tracked.code}</dd>
                </div>
                <div>
                  <dt>Distance</dt>
                  <dd>{formatRange(tracked)}</dd>
                </div>
                <div>
                  <dt>Bearing</dt>
                  <dd>{formatBearing(tracked)}</dd>
                </div>
              </dl>
            </section>
            <dl className={css.modeBank}>
              <div>
                <dt>Mode</dt>
                <dd>AIR / SEA</dd>
              </div>
              <div>
                <dt>Sweep</dt>
                <dd>PRIMARY</dd>
              </div>
              <div>
                <dt>Frame</dt>
                <dd>AUTO FIT</dd>
              </div>
            </dl>
            <div className={css.uplinkPanel} aria-live='polite'>
              <div>
                <strong>Ownship uplink</strong>
                <span>Approximate IP only · no GPS · no storage</span>
              </div>
              {visitor ? (
                <p>SIGNAL · {visitor.city ?? formatCoords(visitor)}</p>
              ) : (
                <button
                  type='button'
                  onClick={uplink.locate}
                  disabled={uplink.status === 'locating'}
                >
                  {UPLINK_BUTTON_LABEL[uplink.status]}
                </button>
              )}
            </div>
          </aside>

          <section
            className={css.stage}
            aria-labelledby='position-display-title'
          >
            <header className={css.scopeHeader}>
              <span>WORLD CONTACT SCOPE</span>
              <div>
                <strong id='position-display-title'>
                  {tracked.code} / {tracked.name}
                </strong>
                <small>
                  CAT → {tracked.code} · {formatRange(tracked)}
                </small>
              </div>
            </header>
            <div className={css.viewport}>
              <canvas
                ref={globe.canvasRef}
                className={css.canvas}
                role='img'
                aria-label='Interactive radar globe. Click or tap a colored contact to acquire it; the flight-strip bay provides the keyboard-accessible controls.'
                aria-describedby='scope-instructions'
                onPointerDown={globe.onPointerDown}
                onPointerMove={globe.onPointerMove}
                onPointerUp={globe.onPointerUp}
                onPointerCancel={globe.onPointerCancel}
                onPointerLeave={globe.onPointerLeave}
              >
                Interactive radar unavailable. Use the flight-strip bay to
                acquire a destination.
              </canvas>
              <div
                className={css.scopeFallback}
                data-visible={globe.status === 'unavailable'}
                role='status'
              >
                <strong>SURVEILLANCE SCOPE UNAVAILABLE</strong>
                <span>The flight-strip bay remains fully operational.</span>
              </div>
            </div>
            <p className={css.readout}>
              <span className={css.readoutKey}>RADAR 05 ▸</span>
              <span>{tracked.name}</span>
              <span className={css.readoutCoords}>{formatCoords(tracked)}</span>
              <span className={css.readoutCoords}>
                BRG {formatBearing(tracked)}
              </span>
              <span className={css.readoutRange}>{formatRange(tracked)}</span>
              <span className={css.blink} aria-hidden='true'>
                ▮
              </span>
            </p>
          </section>

          <aside className={cn(css.instrumentWing, css.starboardWing)}>
            <header>
              <span>02</span>
              <strong className={css.instrumentLabel}>Range telegraph</strong>
            </header>
            <div className={css.telegraph}>
              <span>LOCAL</span>
              <input
                id='travel-range-telegraph'
                type='range'
                min={TRAVEL_ZOOM_MIN}
                max={TRAVEL_ZOOM_MAX}
                step='0.01'
                value={globe.zoomLevel}
                aria-label='Globe radar range'
                onChange={(event) =>
                  globe.setZoom(Number(event.currentTarget.value))
                }
              />
              <span>GLOBAL</span>
              <output htmlFor='travel-range-telegraph'>
                RANGE {globe.zoomLevel.toFixed(2)}×
              </output>
            </div>
            <fieldset className={css.zoomControls}>
              <legend>Fine range</legend>
              <button type='button' aria-label='Zoom in' onClick={globe.zoomIn}>
                +
              </button>
              <button
                type='button'
                aria-label='Zoom out'
                onClick={globe.zoomOut}
              >
                −
              </button>
            </fieldset>
            <div className={css.commModule}>
              <small>VHF / GUARD</small>
              <strong>121.50</strong>
              <span>CH 05 · STANDBY</span>
            </div>
            <div className={css.signalBank}>
              <span>SWEEP</span>
              <span>SYNC</span>
              <span>REF</span>
            </div>
          </aside>
        </div>

        <section className={css.manifest} aria-labelledby='waypoint-register'>
          <header className={css.manifestHeader}>
            <div>
              <p>CONTACT ARCHIVE / RS–19911201</p>
              <h2 id='waypoint-register'>Flight progress bay</h2>
            </div>
            <span>
              {String(DESTINATIONS.length).padStart(2, '0')} STRIPS LOADED
            </span>
          </header>
          <p className={css.manifestMeta}>
            Yes, I&apos;ve actually been to all of them. My passport would like
            a nap.
          </p>
          <div className={css.sectorConsole}>
            <fieldset className={css.sectorTabs}>
              <legend className={css.sectorLegend}>Visited regions</legend>
              {REGIONS.map((region, regionIndex) => {
                const regionCount = DESTINATIONS.filter(
                  (spot) => spot.region === region.id,
                ).length
                return (
                  <button
                    key={region.id}
                    id={`travel-sector-${region.id}`}
                    type='button'
                    aria-pressed={activeRegion === region.id}
                    aria-controls='travel-sector-panel'
                    data-sector={region.id}
                    onClick={() => setActiveRegion(region.id)}
                  >
                    <b>{String.fromCharCode(65 + regionIndex)}</b>
                    <span>{region.label}</span>
                    <small>{String(regionCount).padStart(2, '0')}</small>
                  </button>
                )
              })}
            </fieldset>
            <section
              id='travel-sector-panel'
              className={css.stripViewport}
              aria-label={`${activeRegionMeta.label} visited locations`}
              aria-live='polite'
              data-sector={activeRegionMeta.id}
            >
              <ol>
                {activeRegionSpots.map((spot) => (
                  <ContactRow
                    key={spot.code}
                    index={DESTINATIONS.indexOf(spot) + 1}
                    spot={spot}
                    tracked={spot.code === tracked.code}
                    onTrack={trackDestination}
                  />
                ))}
              </ol>
            </section>
          </div>
          <footer className={css.manifestFooter}>
            <span>★ CAT REFERENCE</span>
            <span>◆ ACTIVE VECTOR</span>
            <span>● LOGGED CONTACT</span>
          </footer>
        </section>

        <footer className={css.scopeInstructions} id='scope-instructions'>
          <span>DRAG / ORBIT</span>
          <span>WHEEL / PINCH / TELEGRAPH RANGE</span>
          <span>POINT / TAP / STRIP TO ACQUIRE</span>
        </footer>
      </section>
    </Shell>
  )
}
