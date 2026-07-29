'use client'

import Link from 'components/Link'
import type React from 'react'
import { useEffect, useState } from 'react'
import w98 from '../w98.module.css'
import css from './realplayer.module.css'
import {
  REAL_STATIONS,
  type RealStation,
  STATIONS_VERIFIED_AT,
  stationById,
} from './stations.ts'
import type { TunerState, TunerStatus } from './tuner.ts'
import { type Tuner, useTuner } from './use-tuner.ts'

type MenuId = 'file' | 'help' | 'presets'

type DragHandle = {
  onPointerDown: React.PointerEventHandler<HTMLElement>
  onPointerMove: React.PointerEventHandler<HTMLElement>
  onPointerUp: React.PointerEventHandler<HTMLElement>
  onPointerCancel: React.PointerEventHandler<HTMLElement>
}

export type RealPlayerProps = {
  dragStyle: React.CSSProperties
  dragHandle: DragHandle
  minimize: () => void
  close: () => void
}

const LCD_STATUS = {
  idle: 'Ready',
  connecting: 'Buffering...',
  playing: 'On air',
  paused: 'Held',
  error: 'No signal',
} satisfies Record<TunerStatus, string>

const ANNOUNCEMENT = {
  idle: 'Ready',
  connecting: 'Connecting to',
  playing: 'Now playing',
  paused: 'Held',
  error: 'No signal from',
} satisfies Record<TunerStatus, string>

const lcdLeft = (state: TunerState, station: RealStation | undefined) => {
  if (state.status === 'playing' && station?.bitrateKbps) {
    return `${station.bitrateKbps} Kbps`
  }
  return LCD_STATUS[state.status]
}

const formatElapsed = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const rest = String(seconds % 60).padStart(2, '0')
  if (minutes < 60) return `${String(minutes).padStart(2, '0')}:${rest}`
  const hours = Math.floor(minutes / 60)
  return `${hours}:${String(minutes % 60).padStart(2, '0')}:${rest}`
}

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

const ChannelsPanel: React.FC<{
  tuner: Tuner
  stations: RealStation[]
  query: string
}> = ({ tuner, stations, query }) => {
  const current = tuner.state.stationId
    ? stationById(tuner.state.stationId)
    : undefined
  return (
    <div className={css.channels} id='rp-channels'>
      <span className={css.channelsTab}>Channels</span>
      {stations.length === 0 && (
        <p className={css.channelsEmpty}>No channel matches “{query}”.</p>
      )}
      <ul className={css.channelList}>
        {stations.map((station) => (
          <ChannelRow key={station.id} station={station} tuner={tuner} />
        ))}
      </ul>
      <footer className={css.channelsFoot}>
        <span>Updated {formatUpdated(STATIONS_VERIFIED_AT)}</span>
        <button
          type='button'
          disabled={!current}
          onClick={() => current && tuner.tune(current)}
        >
          Update
        </button>
      </footer>
    </div>
  )
}

const DisplayPanel: React.FC<{ tuner: Tuner }> = ({ tuner }) => {
  const { status } = tuner.state
  const station = tuner.state.stationId
    ? stationById(tuner.state.stationId)
    : undefined

  if (status === 'error') {
    return (
      <div className={css.display} data-phase='error'>
        <span className={css.realMark} aria-hidden='true'>
          real
        </span>
        <p className={css.displayAlert}>
          Cannot open {station?.name ?? 'this channel'}.
          <br />
          Pick another channel or try again.
        </p>
      </div>
    )
  }

  return (
    <div className={css.display} data-phase={status}>
      <span className={css.realMark} aria-hidden='true'>
        real
      </span>
      {status === 'idle' && <p className={css.displayHint}>Pick a channel</p>}
      {status === 'connecting' && (
        <p className={css.displayLive}>Buffering {station?.name}...</p>
      )}
      {status === 'playing' && (
        <p className={css.displayLive}>{station?.name}</p>
      )}
      {status === 'paused' && (
        <p className={css.displayHint}>Stream held. Press play.</p>
      )}
    </div>
  )
}

const VolumeRail: React.FC<{
  tuner: Tuner
  channelsOpen: boolean
  toggleChannels: () => void
}> = ({ tuner, channelsOpen, toggleChannels }) => (
  <div className={css.rail}>
    <button
      type='button'
      className={css.railButton}
      aria-expanded={channelsOpen}
      aria-controls='rp-channels'
      aria-label={
        channelsOpen ? 'Hide the channel list' : 'Show the channel list'
      }
      onClick={toggleChannels}
    >
      <span
        className={css.chevron}
        data-open={channelsOpen}
        aria-hidden='true'
      />
    </button>
    <input
      type='range'
      className={css.volume}
      min={0}
      max={100}
      step={1}
      value={Math.round(tuner.volume * 100)}
      aria-label='Volume'
      aria-orientation='vertical'
      onChange={(event) => tuner.setVolume(Number(event.target.value) / 100)}
    />
    <button
      type='button'
      className={css.railButton}
      aria-pressed={tuner.muted}
      aria-label={tuner.muted ? 'Unmute' : 'Mute'}
      onClick={tuner.toggleMuted}
    >
      <span
        className={css.speaker}
        data-muted={tuner.muted}
        aria-hidden='true'
      />
    </button>
  </div>
)

const TransportBar: React.FC<{ tuner: Tuner }> = ({ tuner }) => {
  const { status } = tuner.state
  const station = tuner.state.stationId
    ? stationById(tuner.state.stationId)
    : undefined
  const canPlay = status === 'idle' || status === 'paused' || status === 'error'
  const canPause = status === 'connecting' || status === 'playing'

  const play = () => tuner.tune(station ?? REAL_STATIONS[0])

  return (
    <div className={css.transport}>
      <button
        type='button'
        className={css.transportButton}
        disabled={!canPlay}
        aria-label='Play'
        onClick={play}
      >
        <span className={css.glyphPlay} aria-hidden='true' />
      </button>
      <button
        type='button'
        className={css.transportButton}
        disabled={!canPause}
        aria-label='Pause'
        onClick={tuner.pause}
      >
        <span className={css.glyphPause} aria-hidden='true' />
      </button>
      <button
        type='button'
        className={css.transportButton}
        disabled={status === 'idle'}
        aria-label='Stop'
        onClick={tuner.stop}
      >
        <span className={css.glyphStop} aria-hidden='true' />
      </button>
      <span
        className={css.seekGroove}
        role='img'
        aria-label='Live stream. Seeking is not available.'
      >
        <i aria-hidden='true' />
      </span>
      <span className={css.clipWell} aria-hidden='true' />
    </div>
  )
}

const DeadMenuItems: React.FC<{ labels: string[] }> = ({ labels }) => (
  <>
    {labels.map((label) => (
      <button
        key={label}
        type='button'
        role='menuitem'
        className={`${w98.menuItem} ${css.menuDisabled}`}
        disabled
      >
        <span>{label}</span>
      </button>
    ))}
  </>
)

const RealMenubar: React.FC<{
  tuner: Tuner
  close: () => void
}> = ({ tuner, close }) => {
  const [menu, setMenu] = useState<MenuId | null>(null)

  useEffect(() => {
    if (!menu) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [menu])

  const toggle = (id: MenuId) => setMenu((open) => (open === id ? null : id))
  const pick = (station: RealStation) => {
    tuner.tune(station)
    setMenu(null)
  }

  const trigger = (id: MenuId, label: React.ReactNode) => (
    <button
      type='button'
      className={w98.menuTrigger}
      aria-haspopup='menu'
      aria-expanded={menu === id}
      onClick={() => toggle(id)}
    >
      {label}
    </button>
  )

  return (
    <>
      {menu && (
        <button
          type='button'
          className={w98.menuBackdrop}
          aria-label='Close menu'
          onClick={() => setMenu(null)}
        />
      )}
      <nav className={w98.menubar} aria-label='RealPlayer menus'>
        <div className={w98.menuSlot}>
          {trigger(
            'file',
            <>
              <u>F</u>ile
            </>,
          )}
          {menu === 'file' && (
            <div className={w98.menu} role='menu' aria-label='File menu'>
              <button
                type='button'
                role='menuitem'
                className={w98.menuItem}
                onClick={close}
              >
                <span>Exit</span>
              </button>
            </div>
          )}
        </div>
        <div className={w98.menuSlot}>
          {trigger(
            'presets',
            <>
              <u>P</u>resets
            </>,
          )}
          {menu === 'presets' && (
            <div
              className={`${w98.menu} ${css.presetsMenu}`}
              role='menu'
              aria-label='Presets menu'
            >
              {REAL_STATIONS.map((station) => (
                <button
                  key={station.id}
                  type='button'
                  role='menuitemradio'
                  aria-checked={tuner.state.stationId === station.id}
                  className={w98.menuItem}
                  onClick={() => pick(station)}
                >
                  <span>
                    <span className={w98.check} aria-hidden='true'>
                      {tuner.state.stationId === station.id ? '✓' : ''}
                    </span>
                    {station.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className={w98.menuSlot}>
          {trigger(
            'help',
            <>
              <u>H</u>elp
            </>,
          )}
          {menu === 'help' && (
            <div className={w98.menu} role='menu' aria-label='Help menu'>
              <DeadMenuItems labels={['About RealPlayer G2']} />
            </div>
          )}
        </div>
      </nav>
    </>
  )
}

const GuideBar: React.FC<{
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

const StatusBar: React.FC<{ tuner: Tuner }> = ({ tuner }) => {
  const station = tuner.state.stationId
    ? stationById(tuner.state.stationId)
    : undefined
  const live = tuner.state.status === 'playing'
  return (
    <footer className={css.statusBar}>
      <span className={css.statusWell} aria-hidden='true' />
      <span className={css.lcd}>{lcdLeft(tuner.state, station)}</span>
      <b className={css.g2} aria-hidden='true'>
        G2
      </b>
      <span className={css.beacon} data-live={live} aria-hidden='true' />
      <span className={css.lcd} data-align='right'>
        {formatElapsed(tuner.elapsed)}/LIVE
      </span>
    </footer>
  )
}

const matchesQuery = (station: RealStation, needle: string) =>
  station.name.toLowerCase().includes(needle) ||
  station.tagline.toLowerCase().includes(needle)

export default function RealPlayerWindow({
  dragStyle,
  dragHandle,
  minimize,
  close,
}: RealPlayerProps) {
  const tuner = useTuner()
  const [query, setQuery] = useState('')
  const [channelsOpen, setChannelsOpen] = useState(true)

  const station = tuner.state.stationId
    ? stationById(tuner.state.stationId)
    : undefined
  const needle = query.trim().toLowerCase()
  const visible = needle
    ? REAL_STATIONS.filter((entry) => matchesQuery(entry, needle))
    : REAL_STATIONS

  return (
    <section
      className={css.window}
      style={dragStyle}
      aria-label='RealPlayer radio tuner'
    >
      <header className={w98.titlebar} {...dragHandle}>
        <span className={css.appIcon} aria-hidden='true' />
        <strong>RealPlayer: {station?.name ?? 'Welcome!'}</strong>
        <span className={w98.windowControls}>
          <button
            type='button'
            aria-label='Minimize RealPlayer'
            onClick={minimize}
          >
            _
          </button>
          <span aria-hidden='true'>□</span>
          <button type='button' aria-label='Close RealPlayer' onClick={close}>
            ×
          </button>
        </span>
      </header>

      <RealMenubar tuner={tuner} close={close} />
      <TransportBar tuner={tuner} />

      <div className={css.deck}>
        {channelsOpen && (
          <ChannelsPanel tuner={tuner} stations={visible} query={query} />
        )}
        <VolumeRail
          tuner={tuner}
          channelsOpen={channelsOpen}
          toggleChannels={() => setChannelsOpen((open) => !open)}
        />
        <DisplayPanel tuner={tuner} />
      </div>

      <GuideBar
        query={query}
        setQuery={setQuery}
        matches={visible}
        tuner={tuner}
      />
      <StatusBar tuner={tuner} />

      <span className='sr-only' role='status' aria-live='polite'>
        {ANNOUNCEMENT[tuner.state.status]}
        {station ? ` ${station.name}` : ''}
      </span>
    </section>
  )
}
