import type React from 'react'
import { REAL_STATIONS, type RealStation } from './stations.ts'
import css from './transport-controls.module.css'
import type { Tuner } from './use-tuner.ts'

export const VolumeRail: React.FC<{
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

export const TransportBar: React.FC<{
  tuner: Tuner
  station: RealStation | undefined
}> = ({ tuner, station }) => {
  const { status } = tuner.state
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
