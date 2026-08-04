import type React from 'react'
import { useStoreSelector } from 'services/external-store'
import type { RealStation } from './stations.ts'
import type { TunerState, TunerStatus } from './tuner.ts'
import css from './tuner-display.module.css'
import type { Tuner } from './use-tuner.ts'

const LCD_STATUS = {
  idle: 'Ready',
  connecting: 'Buffering...',
  playing: 'On air',
  paused: 'Held',
  error: 'No signal',
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

export const DisplayPanel: React.FC<{
  tuner: Tuner
  station: RealStation | undefined
}> = ({ tuner, station }) => {
  const { status } = tuner.state

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

const selectElapsedSeconds = (seconds: number) => seconds

export const StatusBar: React.FC<{
  tuner: Tuner
  station: RealStation | undefined
}> = ({ tuner, station }) => {
  const elapsed = useStoreSelector(tuner.elapsedStore, selectElapsedSeconds)
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
        {formatElapsed(elapsed)}/LIVE
      </span>
    </footer>
  )
}
