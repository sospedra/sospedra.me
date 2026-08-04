import { type BoomboxState, MAX_GUESSES, type Song } from './engine'
import css from './tuner-dial.module.css'

/* seven FM stops, one per attempt state 0..6; the needle parks on them */
const FM_STOPS = ['88', '91', '94', '98', '102', '105', '108']
const AM_STOPS = ['530', '700', '900', '1100', '1300', '1600']

export const Tuner = (props: {
  attempts: number
  daily: Song
  isPlaying: boolean
  stage: BoomboxState['stage']
}) => {
  const nowPlaying =
    props.stage === 'play'
      ? `DFM: signal encrypted · guess the tape · take ${props.attempts}/${MAX_GUESSES}`
      : `DFM: ${props.daily.artist} · ${props.daily.title}`

  return (
    <section className={css.tuner}>
      <div className={css.tunerCluster}>
        <div className={css.indicatorLabel}>
          fm stereo
          <span className={css.ledBorder}>
            <span
              className={`${css.tunerLed} ${css.tunerLedRed}`}
              data-on={props.isPlaying}
            />
          </span>
        </div>
        <div className={css.radioTuning}>
          <span>tuning</span>
          <div className={css.wheel} data-live={props.isPlaying}>
            <span aria-hidden />
            <span aria-hidden />
          </div>
        </div>
      </div>

      <div
        className={css.dialGlass}
        data-live={props.isPlaying}
        role='img'
        aria-label={`Attempt ${Math.min(props.attempts + 1, MAX_GUESSES)} of ${MAX_GUESSES}`}
      >
        <div className={`${css.dialRow} ${css.dialFm}`}>
          <span className={css.dialCap}>fm·mhz</span>
          <span className={css.dialStops}>
            {FM_STOPS.map((stop) => (
              <i key={stop}>{stop}</i>
            ))}
          </span>
        </div>
        <div className={`${css.dialRow} ${css.dialAm}`}>
          <span className={css.dialCap}>am·khz</span>
          <span className={css.dialStops}>
            {AM_STOPS.map((stop) => (
              <i key={stop}>{stop}</i>
            ))}
          </span>
        </div>
        <div className={css.nowStrip}>{nowPlaying}</div>
        <span
          className={css.dialNeedle}
          style={{ '--dial': props.attempts } as React.CSSProperties}
        />
      </div>
    </section>
  )
}
