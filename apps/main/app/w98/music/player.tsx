import type { PointerEvent as ReactPointerEvent } from 'react'
import { cssVars } from 'services/css-vars'
import { formatTime } from './format'
import css from './music.module.css'
import playerCss from './player.module.css'
import {
  TIME_GAUGE_SWEEP,
  timeGaugeProgress,
  volumeGaugeBackground,
  volumeGaugeProgress,
} from './player-gauge'
import type { DragPanelProps, MusicTrack } from './types'
import { useTouchHitSlop } from './use-touch-hit-slop'

type PlayerProps = {
  canPlay: boolean
  dragProps: DragPanelProps
  duration: number
  equalizerOpen: boolean
  isPlaying: boolean
  onClose: () => void
  onNext: () => void
  onOpenEqualizer: () => void
  onOpenTracklist: () => void
  onPrevious: () => void
  onSeek: (position: number) => void
  onToggle: () => void
  onVolumeChange: (volume: number) => void
  position: number
  track: MusicTrack | null
  tracklistOpen: boolean
  volume: number
}

type GaugeUpdate = (event: ReactPointerEvent<HTMLInputElement>) => void

export default function Player({
  canPlay,
  dragProps,
  duration,
  equalizerOpen,
  isPlaying,
  onClose,
  onNext,
  onOpenEqualizer,
  onOpenTracklist,
  onPrevious,
  onSeek,
  onToggle,
  onVolumeChange,
  position,
  track,
  tracklistOpen,
  volume,
}: PlayerProps) {
  const touchHitSlop = useTouchHitSlop(`.${css.hotspot}`)
  const title = track?.title ?? ''
  const progress = duration > 0 ? Math.min(position / duration, 1) : 0
  const seekFromPointer = (event: ReactPointerEvent<HTMLInputElement>) => {
    const panel = event.currentTarget.closest('section')
    if (!panel) return
    const point = { x: event.clientX, y: event.clientY }
    onSeek(timeGaugeProgress(panel.getBoundingClientRect(), point) * duration)
  }
  const volumeFromPointer = (event: ReactPointerEvent<HTMLInputElement>) => {
    const panel = event.currentTarget.closest('section')
    if (!panel) return
    const point = { x: event.clientX, y: event.clientY }
    onVolumeChange(
      volumeGaugeProgress(
        panel.getBoundingClientRect(),
        event.currentTarget.getBoundingClientRect(),
        point,
      ),
    )
  }
  const beginGauge = (
    event: ReactPointerEvent<HTMLInputElement>,
    update: GaugeUpdate,
  ) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    update(event)
    event.preventDefault()
  }
  const moveGauge = (
    event: ReactPointerEvent<HTMLInputElement>,
    update: GaugeUpdate,
  ) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    update(event)
    event.preventDefault()
  }
  const endGauge = (event: ReactPointerEvent<HTMLInputElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <section
      id='winamp-player-panel'
      className={`${css.panel} ${playerCss.playerPanel}`}
      data-calibration-id='P01'
      data-calibration-label='Player panel'
      data-calibration-kind='panel'
      {...dragProps}
      {...touchHitSlop}
    >
      <img
        className={css.skin}
        src='/images/music/player.png'
        width='1254'
        height='1254'
        alt=''
        draggable={false}
      />
      <span
        className={`${css.dragHandle} ${playerCss.playerDragHandle}`}
        data-touch-slop-ignore
        aria-hidden='true'
      />

      <div className={playerCss.playerDisplay}>
        <i
          className={playerCss.timeSector}
          aria-hidden='true'
          style={cssVars({
            '--gauge-angle': `${(1 - progress) * TIME_GAUGE_SWEEP}deg`,
          })}
        />
        <i
          className={playerCss.volumeSector}
          aria-hidden='true'
          style={{ backgroundImage: volumeGaugeBackground(volume) }}
        />

        <div className={playerCss.trackReadout}>
          <span className={playerCss.marquee}>
            <span>
              {title}
              <i aria-hidden='true'>{title}</i>
            </span>
          </span>
          <time>{formatTime(position)}</time>
        </div>

        <output className={playerCss.playbackStatus}>
          {isPlaying ? 'Playing' : 'Paused'}
        </output>

        <output className={playerCss.durationReadout}>
          {formatTime(duration)}
        </output>

        <label
          className={`${playerCss.gaugeInput} ${playerCss.timeGauge}`}
          data-touch-slop-ignore
          data-calibration-id='H01'
          data-calibration-label='Time gauge'
          data-calibration-kind='control'
        >
          <span className={css.srOnly}>Current track time</span>
          <input
            type='range'
            min='0'
            max={Math.max(duration, 1)}
            step='250'
            value={Math.min(position, Math.max(duration, 1))}
            disabled={!canPlay}
            aria-orientation='vertical'
            aria-valuetext={`${formatTime(position)} of ${formatTime(duration)}`}
            onChange={(event) => onSeek(Number(event.target.value))}
            onPointerCancel={endGauge}
            onPointerDown={(event) => beginGauge(event, seekFromPointer)}
            onPointerMove={(event) => moveGauge(event, seekFromPointer)}
            onPointerUp={endGauge}
          />
        </label>
        <label
          className={`${playerCss.gaugeInput} ${playerCss.volumeGauge}`}
          data-touch-slop-ignore
          data-calibration-id='H02'
          data-calibration-label='Volume gauge'
          data-calibration-kind='control'
        >
          <span className={css.srOnly}>Volume</span>
          <input
            type='range'
            min='0'
            max='1'
            step='0.01'
            value={volume}
            aria-orientation='vertical'
            aria-valuetext={`${Math.round(volume * 100)} percent`}
            onChange={(event) => onVolumeChange(Number(event.target.value))}
            onPointerCancel={endGauge}
            onPointerDown={(event) => beginGauge(event, volumeFromPointer)}
            onPointerMove={(event) => moveGauge(event, volumeFromPointer)}
            onPointerUp={endGauge}
          />
        </label>
      </div>

      <button
        type='button'
        className={`${css.hotspot} ${playerCss.playerCloseHotspot}`}
        data-calibration-id='H22'
        data-calibration-label='Close player'
        data-calibration-kind='control'
        aria-label='Close player'
        onClick={onClose}
      />
      <button
        type='button'
        className={`${css.hotspot} ${playerCss.previousHotspot}`}
        data-calibration-id='H04'
        data-calibration-label='Previous'
        data-calibration-kind='control'
        data-calibration-rotation='-45'
        disabled={!canPlay}
        aria-label='Previous track'
        onClick={onPrevious}
      />
      <button
        type='button'
        className={`${css.hotspot} ${playerCss.playPauseHotspot}`}
        data-calibration-id='H05'
        data-calibration-label='Play or pause'
        data-calibration-kind='control'
        data-calibration-rotation='-45'
        disabled={!canPlay}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        onClick={onToggle}
      />
      <button
        type='button'
        className={`${css.hotspot} ${playerCss.openTracklistHotspot}`}
        data-calibration-id='H26'
        data-calibration-label='Open tracklist'
        data-calibration-kind='control'
        data-lit={tracklistOpen}
        aria-controls='winamp-tracklist-panel'
        aria-expanded={tracklistOpen}
        aria-label='Open tracklist'
        onClick={onOpenTracklist}
      />
      <button
        type='button'
        className={`${css.hotspot} ${playerCss.nextHotspot}`}
        data-calibration-id='H07'
        data-calibration-label='Next'
        data-calibration-kind='control'
        data-calibration-rotation='-45'
        disabled={!canPlay}
        aria-label='Next track'
        onClick={onNext}
      />
      <button
        type='button'
        className={`${css.hotspot} ${playerCss.openEqualizerHotspot}`}
        data-calibration-id='H25'
        data-calibration-label='Open equalizer'
        data-calibration-kind='control'
        data-lit={equalizerOpen}
        aria-controls='winamp-equalizer-panel'
        aria-expanded={equalizerOpen}
        aria-label='Open equalizer'
        onClick={onOpenEqualizer}
      />
    </section>
  )
}
