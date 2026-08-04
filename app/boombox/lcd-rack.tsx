import { range } from 'es-toolkit'
import { useEffect, useRef } from 'react'
import type { DailyCountdown } from 'services/daily-countdown'
import css from './boombox.module.css'
import {
  type BoomboxState,
  CLIP_SECONDS,
  FULL_UNLOCK,
  type Song,
} from './engine'

const TICKER_STEPS = [0.06, 0.16, 0.26, 0.36, 0.46, 0.56, 0.66, 0.76, 0.86]

type SegmentTone = 'played' | 'unlocked' | 'locked'

const segmentTone = (
  index: number,
  seconds: number,
  limit: number,
): SegmentTone => {
  if (index < seconds) return 'played'
  if (index < limit) return 'unlocked'
  return 'locked'
}

const tickerZone = (at: number) => {
  if (at >= 0.86) return 'red'
  if (at >= 0.62) return 'amber'
  return 'green'
}

const STAGE_TAG = {
  lost: 'END',
  play: 'PLAY',
  won: 'WIN',
} satisfies Record<BoomboxState['stage'], string>

/* db meter: a strip of leds, rAF writes --vu, css decides which burn */
export const DbMeter = (props: {
  analyser: React.RefObject<AnalyserNode | null>
  band: 'low' | 'high'
  isPlaying: boolean
}) => {
  const rowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const row = rowRef.current
    if (!props.isPlaying || !row) return

    let frame = 0
    const bins = new Uint8Array(32)
    const tick = () => {
      const analyser = props.analyser.current
      if (analyser) {
        analyser.getByteFrequencyData(bins)
        const half = bins.length / 2
        const start = props.band === 'low' ? 0 : half
        let sum = 0
        for (let index = start; index < start + half; index++) {
          sum += bins[index] ?? 0
        }
        row.style.setProperty('--vu', (sum / half / 255).toFixed(3))
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      row.style.setProperty('--vu', '0')
    }
  }, [props.isPlaying, props.analyser, props.band])

  return (
    <div className={css.dbMeter} aria-hidden>
      <span className={css.dbTag}>db·{props.band === 'low' ? 'l' : 'r'}</span>
      <div className={css.ledRow} ref={rowRef}>
        {TICKER_STEPS.map((at) => (
          <span
            key={at}
            className={css.meterLed}
            data-zone={tickerZone(at)}
            style={{ '--at': at } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  )
}

const countdownLabel = (countdown: DailyCountdown) => {
  if (countdown.status === 'counting') return countdown.label
  if (countdown.status === 'ready') return '00:00:00'
  return '--:--:--'
}

export const Lcd = (props: {
  countdown: DailyCountdown
  daily: Song
  seconds: number
  limit: number
  state: BoomboxState
}) => {
  const { stage } = props.state
  const playing = stage === 'play'

  const nextTape = `next tape ${countdownLabel(props.countdown)}`
  const verdict = () => {
    if (stage === 'won') return `got it in ${props.state.guesses.length} · `
    if (stage === 'lost') return 'side b next time · '
    return ''
  }
  const yearHint = props.limit >= 4 || !playing ? props.daily.year : '····'
  const genreHint = () => {
    if (playing && props.limit < 7) return '····'
    return props.daily.genre || 'unknown'
  }

  return (
    <div className={css.lcdBezel}>
      <div className={css.lcdScreen}>
        <div className={css.lcdTop}>
          <span>boombox #{props.state.day + 1}</span>
          <span>
            {String(props.seconds).padStart(3, '0')}/
            {playing ? `${props.limit}s` : `${CLIP_SECONDS}s`}
          </span>
        </div>
        <div
          className={css.lcdRuler}
          role='img'
          aria-label={`${props.limit} of ${FULL_UNLOCK} seconds unlocked`}
        >
          {range(FULL_UNLOCK).map((segment) => (
            <span
              key={`seg-${segment}`}
              className={css.lcdSegment}
              data-tone={segmentTone(
                segment,
                props.seconds,
                playing ? props.limit : FULL_UNLOCK,
              )}
            />
          ))}
        </div>
        <div className={css.lcdHint}>
          <span>
            year {yearHint} · genre {genreHint()}
          </span>
        </div>
        <div className={css.lcdStatus}>
          <span>
            {/* only the verdict is live: the countdown ticks every second */}
            <span aria-live='polite'>{verdict()}</span>
            {nextTape}
          </span>
          <span>{STAGE_TAG[stage]}</span>
        </div>
        {!playing && (
          <div
            className={css.lcdNextBar}
            aria-hidden
            style={
              {
                '--remaining':
                  props.countdown.status === 'counting'
                    ? props.countdown.remainingFraction
                    : 0,
              } as React.CSSProperties
            }
          >
            <span />
          </div>
        )}
      </div>
      <div className={css.power}>
        <span className={css.powerLed} data-on={playing} />
        <span>power</span>
      </div>
    </div>
  )
}
