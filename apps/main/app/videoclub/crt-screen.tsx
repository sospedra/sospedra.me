import type { Ref } from 'react'
import { tapHaptic } from 'services/haptics'
import css from './crt-screen.module.css'
import type { Tape } from './tapes'
import { OSD_STATUS, type TvEvent, type TvState } from './tv-machine'

const VOLUME_BARS = 10

const formatCounter = (seconds: number): string => {
  const total = Math.floor(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export const formatChannel = (tape: number): string =>
  `CH ${String(tape + 1).padStart(2, '0')}`

export const volumeBars = (volume: number): string => {
  const lit = Math.round(volume * VOLUME_BARS)
  return `VOL ${'|'.repeat(lit)}${'.'.repeat(VOLUME_BARS - lit)}`
}

type CrtScreenProps = {
  counterSeconds: number
  osd: { text: string; serial: number } | null
  screenHint: string
  state: TvState
  tape: Tape
  videoRef: Ref<HTMLVideoElement>
  volume: number
  dispatch: (event: TvEvent) => void
  setCounterSeconds: (seconds: number) => void
  toggle: () => void
}

export function CrtScreen({
  counterSeconds,
  osd,
  screenHint,
  state,
  tape,
  videoRef,
  volume,
  dispatch,
  setCounterSeconds,
  toggle,
}: CrtScreenProps) {
  return (
    <div
      className={css.screen}
      data-status={state.status}
      data-burst={state.burst}
    >
      <div className={css.tube}>
        <div className={css.raster}>
          {/* biome-ignore lint/a11y/useMediaCaption: no caption tracks exist for these recordings */}
          <video
            key={tape.id}
            ref={videoRef}
            className={css.film}
            src={tape.src}
            preload='metadata'
            playsInline
            onLoadedMetadata={(event) => {
              event.currentTarget.volume = volume
            }}
            onTimeUpdate={(event) =>
              setCounterSeconds(Math.floor(event.currentTarget.currentTime))
            }
            onEnded={() => dispatch({ type: 'toggle' })}
          />
          <div className={css.noise} aria-hidden='true' />
          <div className={css.bars} aria-hidden='true' />
          <div className={css.bloom} aria-hidden='true' />
          <div className={css.phosphor} aria-hidden='true' />
        </div>
        <div className={css.glass} aria-hidden='true' />
      </div>
      <span className={css.screenBadge} aria-hidden='true'>
        SOSPESONIC
      </span>
      <div className={css.osd} aria-hidden='true'>
        <span className={css.osdStatus}>{OSD_STATUS[state.status]}</span>
        <span className={css.osdChannel}>{formatChannel(state.tape)}</span>
        {osd && (
          <span key={osd.serial} className={css.osdFlash}>
            {osd.text}
          </span>
        )}
        <span className={css.osdCounter}>{formatCounter(counterSeconds)}</span>
      </div>
      <button
        type='button'
        className={css.screenAction}
        onClick={() => {
          tapHaptic()
          toggle()
        }}
        aria-label={screenHint}
      />
    </div>
  )
}
