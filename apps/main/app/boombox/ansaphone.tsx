import cn from 'clsx'
import type { DailyCountdown } from 'services/daily-countdown'
import css from './ansaphone.module.css'
import { Cassette } from './cassette-bay'
import mold from './cassette-shell.module.css'
import label from './cassette-sticker.module.css'
import type { BoomboxState, Song } from './engine'
import pen from './guess-line.module.css'
import { Lcd } from './lcd-rack'
import lcd from './lcd-rack.module.css'
import { skipSecondsGain, TAD_KEY_ORDER, Transport } from './lever-bank'
import { CaseTracklist } from './tracklist-card'
import jcard from './tracklist-card.module.css'
import type { ClipAudio } from './use-clip-audio'

type AnsaphoneProps = {
  copied: boolean
  countdown: DailyCountdown
  daily: Song
  fxOn: boolean
  guessDropdown: (resultsId: string) => React.ReactNode
  guessInput: (resultsId: string) => React.ReactNode
  limit: number
  playing: boolean
  sound: ClipAudio
  state: BoomboxState
  tapeSpan: number
  onRewind: () => void
  onShare: () => void
  onSkip: () => void
  onStop: () => void
  onToggleFx: () => void
  togglePlay: () => void
}

export function Ansaphone({
  copied,
  countdown,
  daily,
  fxOn,
  guessDropdown,
  guessInput,
  limit,
  playing,
  sound,
  state,
  tapeSpan,
  onRewind,
  onShare,
  onSkip,
  onStop,
  onToggleFx,
  togglePlay,
}: AnsaphoneProps) {
  return (
    <div
      className={cn(
        css.ansaphone,
        mold.ansaphone,
        label.ansaphone,
        pen.ansaphone,
        lcd.ansaphone,
        jcard.ansaphone,
      )}
    >
      <section className={css.tadBody} aria-label='Answering machine'>
        <div className={cn(css.tadBay, mold.tadBay, label.tadBay)}>
          <Cassette
            daily={daily}
            isPlaying={sound.isPlaying}
            limit={limit}
            stage={state.stage}
            wound={sound.seconds / tapeSpan}
          />
          <span className={css.tadLid} aria-hidden />
        </div>
        <div className={css.tadLower}>
          <div className={css.tadBrand}>
            <b>somo</b>
            <span>tad-2200 · daily mixtape</span>
          </div>
          <div className={css.tadPanel}>
            <Lcd
              countdown={countdown}
              daily={daily}
              limit={limit}
              seconds={sound.seconds}
              state={state}
            />
            <div className={css.tadStatusRow}>
              <span className={css.tadLed} data-lit='true' />
              <span
                className={css.tadLed}
                data-blink={playing && !sound.isPlaying}
                data-lit={sound.isPlaying}
              />
              <em className={css.tadTag}>
                {playing ? '1 new message' : 'no new messages'}
              </em>
              <a className={css.tadOff} href='/' aria-label='Turn off, exit'>
                off
              </a>
              <em className={cn(css.tadTag, css.tadTagFx)}>
                fx {fxOn ? 'on' : 'off'}
              </em>
              <button
                type='button'
                className={css.tadSwitch}
                data-on={fxOn}
                aria-pressed={fxOn}
                aria-label='Deck sound effects'
                onClick={onToggleFx}
              >
                <i />
              </button>
              <span className={css.tadVol} aria-hidden />
              <span className={css.tadGrille} aria-hidden />
            </div>
            <Transport
              size='tad'
              order={TAD_KEY_ORDER}
              canRewind={sound.seconds > 0 || sound.isPlaying}
              copied={copied}
              playing={playing}
              soundReady={sound.isReady}
              soundPlaying={sound.isPlaying}
              skipGain={skipSecondsGain(state)}
              onPlay={togglePlay}
              onStop={onStop}
              onRewind={onRewind}
              onSkip={onSkip}
              onShare={onShare}
            />
          </div>
          <div className={css.tadLip} aria-hidden />
        </div>
      </section>
      <CaseTracklist
        guesses={state.guesses}
        stage={state.stage}
        input={guessInput('boombox-results-m')}
        dropdown={guessDropdown('boombox-results-m')}
      />
    </div>
  )
}
