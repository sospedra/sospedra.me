'use client'

import cn from 'clsx'
import type React from 'react'
import { useEffect, useMemo, useReducer, useRef } from 'react'
import AreaPicker from './area-picker.tsx'
import shadow from './data/shadow.json'
import {
  countryByCode,
  type EclipseSite,
  nearestRefuge,
} from './eclipse-countries.ts'
import chrome from './figure.module.css'
import HorizonView from './horizon-view.tsx'
import css from './local-eclipse.module.css'
import {
  formatClock,
  formatObscuration,
  greatCircleKm,
  zoneAbbreviation,
} from './local-format.ts'
import LocalPanel from './local-panel.tsx'
import { initialPlayback, playbackReducer } from './local-state.ts'
import {
  pickLocation,
  resolveFromIp,
  useEclipseLocation,
} from './location-store.ts'
import { createShadowEngine } from './shadow-engine.ts'
import { centerLine, nearestBandPoint } from './umbra-field.ts'
import WorldMap, { type WorldSite } from './world-map.tsx'
import { WORLD_SITES } from './world-sites.ts'

const engine = createShadowEngine(shadow.b64)
const line = centerLine(engine, 30)
const SCRUB_STEPS = 1000
const PLAYBACK_SECONDS = 26

const sitesWithTotality = (): WorldSite[] =>
  WORLD_SITES.map((site) => ({
    ...site,
    total: Boolean(
      engine.circumstances(site.latitude, site.longitude).totality,
    ),
  }))

const LocalEclipseFigure: React.FC = () => {
  const location = useEclipseLocation()
  const [playback, dispatch] = useReducer(playbackReducer, initialPlayback)
  const frameRef = useRef(0)

  useEffect(() => {
    resolveFromIp()
  }, [])

  const locationKey = `${location.latitude},${location.longitude}`
  // biome-ignore lint/correctness/useExhaustiveDependencies: the scrub resets when the place changes, not when playback does
  useEffect(() => {
    dispatch({ type: 'reset' })
  }, [locationKey])

  const sites = useMemo(sitesWithTotality, [])
  const circumstances = useMemo(
    () => engine.circumstances(location.latitude, location.longitude),
    [location.latitude, location.longitude],
  )
  const drive = useMemo(
    () => nearestBandPoint(engine, line, location.latitude, location.longitude),
    [location.latitude, location.longitude],
  )
  const refuge = useMemo(() => {
    if (!drive) return null
    const found = nearestRefuge(
      location.latitude,
      location.longitude,
      greatCircleKm,
    )
    if (found.km < 25 || found.site.name === location.label) return null
    return { name: found.site.name, country: found.site.country, km: found.km }
  }, [drive, location.label, location.latitude, location.longitude])

  const timeline = circumstances.timeline
  const now = playback.now ?? timeline?.maximum ?? engine.startSeconds
  const zone = location.zone

  useEffect(() => {
    if (!playback.playing || !timeline) return
    const span = timeline.lastContact - timeline.firstContact
    let last = performance.now()
    const step = (stamp: number) => {
      const delta = (stamp - last) / 1000
      last = stamp
      dispatch({
        type: 'tick',
        seconds: now + (delta * span) / PLAYBACK_SECONDS,
        until: timeline.lastContact,
      })
      frameRef.current = requestAnimationFrame(step)
    }
    frameRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameRef.current)
  }, [playback.playing, timeline, now])

  const scrubValue = timeline
    ? Math.round(
        (SCRUB_STEPS * (now - timeline.firstContact)) /
          (timeline.lastContact - timeline.firstContact),
      )
    : 0
  const nowMoment = engine.instantAt(circumstances.site, now)
  const country = countryByCode(location.country)

  const pickSite = (site: EclipseSite) =>
    pickLocation(site.latitude, site.longitude, site.name)

  return (
    <section className={cn(chrome.figure, chrome.bleed)}>
      <div className={chrome.card}>
        <div className={chrome.head}>
          <span className={chrome.label}>
            fig 04 · the shadow on the map, point by point
          </span>
          <AreaPicker />
        </div>

        <div className={chrome.body}>
          <p className={chrome.brief}>
            The whole shadow on one draggable map. The yellow band is totality,
            the dashed lines are maximum obscuration outside it, and the dots
            along the center line tick every twenty minutes of UT. Drag to move,
            pinch or use the buttons to zoom, and tap any point to read it:
            contact times, duration, and how high the sun sits.{' '}
            <strong>A 99 percent eclipse is a 100 percent miss.</strong>
          </p>

          <div className={css.split}>
            <WorldMap
              driveTo={drive}
              line={line}
              marker={location}
              onPick={(latitude, longitude) =>
                pickLocation(latitude, longitude, null)
              }
              onPickSite={pickSite}
              sites={sites}
            />

            <LocalPanel
              circumstances={circumstances}
              country={country}
              drive={drive}
              refuge={refuge}
              site={{
                name: location.label,
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              zone={zone}
            >
              {timeline ? (
                <div className={css.player}>
                  <HorizonView
                    centerAzimuth={timeline.sunAzimuth}
                    engine={engine}
                    seconds={now}
                    site={circumstances.site}
                    topAltitude={Math.max(
                      8,
                      Math.ceil(timeline.sunAltitude + 8),
                    )}
                  />
                  <div className={css.scrub}>
                    <button
                      aria-label={
                        playback.playing
                          ? 'Pause the eclipse'
                          : 'Play the eclipse'
                      }
                      className={css.play}
                      onClick={() =>
                        dispatch(
                          playback.playing
                            ? { type: 'pause' }
                            : {
                                type: 'play',
                                from:
                                  now >= timeline.lastContact - 1
                                    ? timeline.firstContact
                                    : now,
                              },
                        )
                      }
                      type='button'
                    >
                      {playback.playing ? '❚❚' : '▶'}
                    </button>
                    <input
                      aria-label='Moment inside the eclipse'
                      className={css.range}
                      max={SCRUB_STEPS}
                      min={0}
                      onChange={(event) =>
                        dispatch({
                          type: 'scrub',
                          seconds:
                            timeline.firstContact +
                            ((timeline.lastContact - timeline.firstContact) *
                              Number(event.target.value)) /
                              SCRUB_STEPS,
                        })
                      }
                      type='range'
                      value={scrubValue}
                    />
                  </div>
                  <p className={css.nowLine}>
                    <span>{`${formatClock(now, zone)} ${zoneAbbreviation(zone)}`}</span>
                    <span>{`covered ${formatObscuration(nowMoment.obscuration)}`}</span>
                  </p>
                </div>
              ) : null}
            </LocalPanel>
          </div>
        </div>
      </div>
    </section>
  )
}

export default LocalEclipseFigure
