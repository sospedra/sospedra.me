import type React from 'react'
import Link from 'services/link'
import css from './channel-browser.module.css'
import { type RealStation, STATIONS_VERIFIED_AT } from './stations.ts'
import type { Tuner } from './use-tuner.ts'

// "2026-07-28T20:57:00.000Z" -> "7/28/26", deterministic across SSR locales
const formatUpdated = (iso: string): string => {
  const [date] = iso.split('T')
  const [year, month, day] = date.split('-')
  return `${Number(month)}/${Number(day)}/${year.slice(2)}`
}

const StationBadgeMark: React.FC<{ station: RealStation }> = ({ station }) => (
  <span
    className={css.badge}
    style={{ background: station.badge.bg, color: station.badge.fg }}
    aria-hidden='true'
  >
    {station.badge.mark}
  </span>
)

const ChannelRow: React.FC<{
  station: RealStation
  tuner: Tuner
}> = ({ station, tuner }) => {
  const selected = tuner.state.stationId === station.id
  const playing = selected && tuner.state.status === 'playing'
  return (
    <li>
      <button
        type='button'
        className={css.channel}
        data-selected={selected}
        aria-pressed={selected}
        aria-label={`Tune to ${station.name}. ${station.tagline}.`}
        onClick={() => tuner.tune(station)}
      >
        <StationBadgeMark station={station} />
        <span className={css.channelText}>
          <strong>
            {playing && (
              <span className={css.playingMark} aria-hidden='true'>
                ▸
              </span>
            )}
            {station.name}
          </strong>
          <small>{station.tagline}</small>
        </span>
      </button>
    </li>
  )
}

export const ChannelsPanel: React.FC<{
  tuner: Tuner
  station: RealStation | undefined
  stations: RealStation[]
  query: string
}> = ({ tuner, station, stations, query }) => (
  <div className={css.channels} id='rp-channels'>
    <span className={css.channelsTab}>Channels</span>
    {stations.length === 0 && (
      <p className={css.channelsEmpty}>No channel matches “{query}”.</p>
    )}
    <ul className={css.channelList}>
      {stations.map((entry) => (
        <ChannelRow key={entry.id} station={entry} tuner={tuner} />
      ))}
    </ul>
    <footer className={css.channelsFoot}>
      <span>Updated {formatUpdated(STATIONS_VERIFIED_AT)}</span>
      <button
        type='button'
        disabled={!station}
        onClick={() => station && tuner.tune(station)}
      >
        Update
      </button>
    </footer>
  </div>
)

export const GuideBar: React.FC<{
  query: string
  setQuery: (value: string) => void
  matches: RealStation[]
  tuner: Tuner
}> = ({ query, setQuery, matches, tuner }) => {
  const tuneFirstMatch = (event: React.FormEvent) => {
    event.preventDefault()
    const first = matches[0]
    if (first) tuner.tune(first)
  }

  return (
    <search>
      <form className={css.guide} onSubmit={tuneFirstMatch}>
        <span className={css.guideMark} aria-hidden='true'>
          real<b>guide</b>
        </span>
        <input
          type='search'
          className={css.guideInput}
          value={query}
          placeholder=''
          aria-label='Filter channels'
          onChange={(event) => setQuery(event.target.value)}
        />
        <button
          type='submit'
          className={css.guideSearch}
          disabled={matches.length === 0}
          aria-label='Play the first matching channel'
        >
          <span className={css.glyphPlaySmall} aria-hidden='true' />
          Search
        </button>
        <Link url='/travel' className={css.guideLink}>
          real guide
        </Link>
        <span className='sr-only' role='status' aria-live='polite'>
          {matches.length} channels listed
        </span>
      </form>
    </search>
  )
}

export const matchesQuery = (station: RealStation, needle: string) =>
  station.name.toLowerCase().includes(needle) ||
  station.tagline.toLowerCase().includes(needle)
