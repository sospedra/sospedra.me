'use client'

import type React from 'react'
import { useState } from 'react'
import w98 from '../w98.module.css'
import { ChannelsPanel, GuideBar, matchesQuery } from './channel-browser.tsx'
import css from './realplayer.module.css'
import { RealMenubar } from './realplayer-menu.tsx'
import { REAL_STATIONS, stationById } from './stations.ts'
import { TransportBar, VolumeRail } from './transport-controls.tsx'
import type { TunerStatus } from './tuner.ts'
import { DisplayPanel, StatusBar } from './tuner-display.tsx'
import { useTuner } from './use-tuner.ts'

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

const ANNOUNCEMENT = {
  idle: 'Ready',
  connecting: 'Connecting to',
  playing: 'Now playing',
  paused: 'Held',
  error: 'No signal from',
} satisfies Record<TunerStatus, string>

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
      <TransportBar tuner={tuner} station={station} />

      <div className={css.deck}>
        {channelsOpen && (
          <ChannelsPanel
            tuner={tuner}
            station={station}
            stations={visible}
            query={query}
          />
        )}
        <VolumeRail
          tuner={tuner}
          channelsOpen={channelsOpen}
          toggleChannels={() => setChannelsOpen((open) => !open)}
        />
        <DisplayPanel tuner={tuner} station={station} />
      </div>

      <GuideBar
        query={query}
        setQuery={setQuery}
        matches={visible}
        tuner={tuner}
      />
      <StatusBar tuner={tuner} station={station} />

      <span className='sr-only' role='status' aria-live='polite'>
        {ANNOUNCEMENT[tuner.state.status]}
        {station ? ` ${station.name}` : ''}
      </span>
    </section>
  )
}
