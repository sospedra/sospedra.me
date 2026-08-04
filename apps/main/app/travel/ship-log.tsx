import cn from 'clsx'
import type { CSSProperties } from 'react'
import ContactRow, { type CityPinPoint } from './contact-row'
import contactRow from './contact-row.module.css'
import {
  DESTINATIONS,
  type Destination,
  REGIONS,
  type Region,
} from './destinations'
import fxq from './fx-quiet.module.css'
import css from './ship-log.module.css'
import signalBand from './signal-band.module.css'
import stationKeys from './station-keys.module.css'

// one squiggle per traveler: harmonica, banjo, drums, flute
const WAVEFORMS: Record<Region, string> = {
  americas:
    'M0 10 Q6 2 12 10 T24 10 T36 10 T48 10 T60 10 T72 10 T84 10 T96 10 T108 10 T120 10',
  europe:
    'M0 10 L14 10 L17 3 L20 16 L23 10 L44 10 L47 4 L50 15 L53 10 L82 10 L85 2 L88 17 L91 10 L120 10',
  africa:
    'M0 10 L12 10 L12 4 L20 4 L20 10 L44 10 L44 3 L54 3 L54 10 L84 10 L84 5 L92 5 L92 10 L120 10',
  asia: 'M0 10 C18 2 34 2 52 10 S94 18 120 10',
}

export default function ShipLog(props: {
  tracked: Destination
  activeRegion: Region
  activeRegionIndex: number
  activeRegionMeta: (typeof REGIONS)[number]
  activeRegionSpots: Destination[]
  pinLanding: number
  pinPoint: CityPinPoint | null
  regionStatus: string
  tuneTo: (region: Region) => void
  trackDestination: (spot: Destination, pinPoint?: CityPinPoint) => void
}) {
  const {
    tracked,
    activeRegion,
    activeRegionIndex,
    activeRegionMeta,
    activeRegionSpots,
    pinLanding,
    pinPoint,
    regionStatus,
    tuneTo,
    trackDestination,
  } = props

  return (
    <section className={css.manifest} aria-labelledby='waypoint-register'>
      <header className={css.manifestHeader}>
        <div>
          <p>VENTURES ARCHIVE / SHIP RS–19911201</p>
          <h2 id='waypoint-register'>Ship log</h2>
        </div>
        <span>{String(DESTINATIONS.length).padStart(2, '0')} PLACES FOUND</span>
      </header>
      <p className={css.manifestMeta}>
        I found every one. Somehow the ship came back, too.
      </p>
      <div className={css.sectorConsole}>
        <fieldset className={css.sectorTabs}>
          <legend className={css.sectorLegend}>Choose a signal region</legend>
          <div className={signalBand.dialBand} aria-hidden='true'>
            <svg
              className={cn(signalBand.waveform, fxq.waveform)}
              viewBox='0 0 120 20'
              preserveAspectRatio='none'
              aria-hidden='true'
            >
              <path d={WAVEFORMS[activeRegion]} />
            </svg>
            <i
              className={cn(signalBand.needle, fxq.needle)}
              style={{ '--station': activeRegionIndex } as CSSProperties}
            />
          </div>
          <div className={stationKeys.stations}>
            {REGIONS.map((region) => (
              <button
                key={region.id}
                id={`travel-sector-${region.id}`}
                type='button'
                aria-pressed={activeRegion === region.id}
                aria-controls='travel-sector-panel'
                data-sector={region.id}
                onClick={() => tuneTo(region.id)}
              >
                <span className={stationKeys.stationTop}>
                  <b>{region.freq}</b>
                  <span className={stationKeys.stationLabel}>
                    {region.label}
                  </span>
                  <i aria-hidden='true' />
                </span>
                <span
                  className={stationKeys.stationBottom}
                  aria-hidden='true'
                />
                <span className={stationKeys.stationBase} aria-hidden='true' />
              </button>
            ))}
          </div>
        </fieldset>
        <span className='sr-only' role='status'>
          {regionStatus}
        </span>
        <section
          id='travel-sector-panel'
          className={cn(css.stripViewport, contactRow.stripViewport)}
          aria-label={`${activeRegionMeta.label} ship-log places`}
          data-sector={activeRegionMeta.id}
        >
          <ol>
            {activeRegionSpots.map((spot) => (
              <ContactRow
                key={spot.code}
                index={DESTINATIONS.indexOf(spot) + 1}
                spot={spot}
                tracked={spot.code === tracked.code}
                pinLanding={pinLanding}
                pinPoint={pinPoint}
                onTrack={trackDestination}
              />
            ))}
          </ol>
        </section>
      </div>
      <footer className={css.manifestFooter}>
        <span>★ HOME</span>
        <span>◆ TUNED SIGNAL</span>
        <span>● PLACE FOUND</span>
      </footer>
    </section>
  )
}
