import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { formatTime } from './format'
import css from './music.module.css'
import type { DragPanelProps, MusicTrack } from './types'

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

const variableStyles = (
  values: Record<string, string | number>,
): CSSProperties => values as CSSProperties

type PlayerGauge = 'time' | 'volume'

const PLAYER_GAUGE_CENTER_X = 622.47 / 1254
const PLAYER_GAUGE_CENTER_Y = 619.68 / 1254
const TIME_GAUGE_START = 197.19
const TIME_GAUGE_SWEEP = 94.31
const VOLUME_GAUGE_START = 59.5
const VOLUME_GAUGE_SWEEP = 91.54
const VOLUME_LINEAR_JOIN_PROGRESS = 0.6266764
const VOLUME_LINEAR_GRADIENT_ANGLE = 206.86596
const VOLUME_LINEAR_STOP_START = 4.52994
const VOLUME_LINEAR_STOP_RATE = 84.49333
const VOLUME_LINEAR_ORIGIN_X = 152.08
const VOLUME_LINEAR_ORIGIN_Y = 2.784
const VOLUME_LINEAR_DIRECTION_X = -0.4519048
const VOLUME_LINEAR_DIRECTION_Y = 0.8920662
const VOLUME_LINEAR_DISTANCE = 266.30871
const VOLUME_MASK_WIDTH = 197
const VOLUME_MASK_HEIGHT = 464

const clampProgress = (progress: number): number =>
  Math.min(1, Math.max(0, progress))

const volumeGaugeBackground = (volume: number): string => {
  const progress = clampProgress(volume)

  if (progress <= VOLUME_LINEAR_JOIN_PROGRESS) {
    const stop = VOLUME_LINEAR_STOP_START + progress * VOLUME_LINEAR_STOP_RATE

    return `linear-gradient(${VOLUME_LINEAR_GRADIENT_ANGLE}deg, var(--music-orange) 0 ${stop}%, var(--music-orange-deep) ${stop}%)`
  }

  const angle = progress * VOLUME_GAUGE_SWEEP
  return `conic-gradient(from ${VOLUME_GAUGE_START}deg at -60.67% 35.29%, var(--music-orange) 0 ${angle}deg, var(--music-orange-deep) ${angle}deg)`
}

const gaugeProgressFromPointer = (
  event: ReactPointerEvent<HTMLInputElement>,
  gauge: PlayerGauge,
): number => {
  const panel = event.currentTarget.closest('section')
  if (!panel) return 0

  if (gauge === 'volume') {
    const bounds = event.currentTarget.getBoundingClientRect()
    if (bounds.width === 0 || bounds.height === 0) return 0

    const localX =
      ((event.clientX - bounds.left) / bounds.width) * VOLUME_MASK_WIDTH
    const localY =
      ((event.clientY - bounds.top) / bounds.height) * VOLUME_MASK_HEIGHT
    const linearDistance =
      (localX - VOLUME_LINEAR_ORIGIN_X) * VOLUME_LINEAR_DIRECTION_X +
      (localY - VOLUME_LINEAR_ORIGIN_Y) * VOLUME_LINEAR_DIRECTION_Y

    if (linearDistance <= VOLUME_LINEAR_DISTANCE) {
      return (
        clampProgress(linearDistance / VOLUME_LINEAR_DISTANCE) *
        VOLUME_LINEAR_JOIN_PROGRESS
      )
    }
  }

  const bounds = panel.getBoundingClientRect()
  const centerX = bounds.left + bounds.width * PLAYER_GAUGE_CENTER_X
  const centerY = bounds.top + bounds.height * PLAYER_GAUGE_CENTER_Y
  const radians = Math.atan2(event.clientX - centerX, centerY - event.clientY)
  const angle = ((radians * 180) / Math.PI + 360) % 360
  const progress =
    gauge === 'time'
      ? (TIME_GAUGE_START + TIME_GAUGE_SWEEP - angle) / TIME_GAUGE_SWEEP
      : (angle - VOLUME_GAUGE_START) / VOLUME_GAUGE_SWEEP

  return clampProgress(progress)
}

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
  const title = track?.title ?? ''
  const progress = duration > 0 ? Math.min(position / duration, 1) : 0
  const updateGauge = (
    event: ReactPointerEvent<HTMLInputElement>,
    gauge: PlayerGauge,
  ) => {
    const nextProgress = gaugeProgressFromPointer(event, gauge)
    if (gauge === 'time') {
      onSeek(nextProgress * duration)
    } else {
      onVolumeChange(nextProgress)
    }
  }
  const beginGauge = (
    event: ReactPointerEvent<HTMLInputElement>,
    gauge: PlayerGauge,
  ) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    updateGauge(event, gauge)
    event.preventDefault()
  }
  const moveGauge = (
    event: ReactPointerEvent<HTMLInputElement>,
    gauge: PlayerGauge,
  ) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    updateGauge(event, gauge)
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
      className={`${css.panel} ${css.playerPanel}`}
      data-calibration-id='P01'
      data-calibration-label='Player panel'
      data-calibration-kind='panel'
      {...dragProps}
    >
      <img
        className={css.skin}
        src='/images/music/player.png'
        width='1254'
        height='1254'
        alt=''
        draggable={false}
      />

      <div className={css.playerDisplay}>
        <i
          className={css.timeSector}
          aria-hidden='true'
          style={variableStyles({
            '--gauge-angle': `${(1 - progress) * TIME_GAUGE_SWEEP}deg`,
          })}
        />
        <i
          className={css.volumeSector}
          aria-hidden='true'
          style={{ backgroundImage: volumeGaugeBackground(volume) }}
        />

        <div className={css.trackReadout}>
          <span className={css.marquee}>
            <span>
              {title}
              <i aria-hidden='true'>{title}</i>
            </span>
          </span>
          <time>{formatTime(position)}</time>
        </div>

        <output className={css.playbackStatus}>
          {isPlaying ? 'Playing' : 'Paused'}
        </output>

        <output className={css.durationReadout}>{formatTime(duration)}</output>

        <label
          className={`${css.gaugeInput} ${css.timeGauge}`}
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
            onPointerDown={(event) => beginGauge(event, 'time')}
            onPointerMove={(event) => moveGauge(event, 'time')}
            onPointerUp={endGauge}
          />
        </label>
        <label
          className={`${css.gaugeInput} ${css.volumeGauge}`}
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
            onPointerDown={(event) => beginGauge(event, 'volume')}
            onPointerMove={(event) => moveGauge(event, 'volume')}
            onPointerUp={endGauge}
          />
        </label>
      </div>

      <button
        type='button'
        className={`${css.hotspot} ${css.playerCloseHotspot}`}
        data-calibration-id='H22'
        data-calibration-label='Close player'
        data-calibration-kind='control'
        aria-label='Close player'
        onClick={onClose}
      />
      <button
        type='button'
        className={`${css.hotspot} ${css.previousHotspot}`}
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
        className={`${css.hotspot} ${css.playPauseHotspot}`}
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
        className={`${css.hotspot} ${css.openTracklistHotspot}`}
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
        className={`${css.hotspot} ${css.nextHotspot}`}
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
        className={`${css.hotspot} ${css.openEqualizerHotspot}`}
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
