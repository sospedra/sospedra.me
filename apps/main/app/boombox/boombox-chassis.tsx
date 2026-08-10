import { useEffect, useRef, useState } from 'react'
import type { DailyCountdown } from 'services/daily-countdown'
import css from './boombox-chassis.module.css'
import { CassettePane } from './cassette-bay'
import type { DeckSfx } from './deck-sfx'
import type { BoomboxState, Song } from './engine'
import fnRow from './function-row.module.css'
import { DbMeter, Lcd } from './lcd-rack'
import lcd from './lcd-rack.module.css'
import { DECK_KEY_ORDER, skipSecondsGain, Transport } from './lever-bank'
import lower from './lower-console.module.css'
import speaker from './speaker-panel.module.css'
import { CaseTracklist } from './tracklist-card'
import { Tuner } from './tuner-dial'
import type { ClipAudio } from './use-clip-audio'

const FUNCTIONS = ['tape', 'tuner', 'cd', 'aux']
const EQ_LABELS = ['60', '250', '1K', '4K', '12K']
const FUNCTION_BLINK_MS = 700

const FunctionRow = (props: { onPress: () => void }) => {
  const [blinking, setBlinking] = useState<string | null>(null)
  const blinkTimerRef = useRef(0)

  useEffect(() => () => window.clearTimeout(blinkTimerRef.current), [])

  const press = (name: string) => {
    props.onPress()
    setBlinking(name)
    window.clearTimeout(blinkTimerRef.current)
    blinkTimerRef.current = window.setTimeout(
      () => setBlinking(null),
      FUNCTION_BLINK_MS,
    )
  }

  return (
    <div className={fnRow.functionRow} aria-hidden>
      <span className={fnRow.functionLabel}>function</span>
      {FUNCTIONS.map((name) => (
        <button
          key={name}
          type='button'
          tabIndex={-1}
          className={fnRow.functionKey}
          data-on={name === 'tape'}
          onClick={() => press(name)}
        >
          <span
            className={fnRow.functionLed}
            data-blink={blinking === name}
            data-deny={name !== 'tape'}
          />
          {name}
        </button>
      ))}
    </div>
  )
}

const Speaker = (props: { live: boolean; side: 'left' | 'right' }) => (
  <section
    className={`${speaker.speakerPanel} ${props.side === 'left' ? speaker.speakerLeft : speaker.speakerRight}`}
    data-live={props.live}
  >
    <div className={speaker.tweeterRing}>
      <div className={speaker.wooferCone}>
        <div className={speaker.wooferCap} />
      </div>
    </div>
    <div className={speaker.woofer}>
      <div className={speaker.wooferRing}>
        <div className={speaker.wooferCone}>
          <div className={speaker.wooferCap} />
        </div>
      </div>
    </div>
    <div className={speaker.speakerMicrocopy}>
      <span>2 way speaker system</span>
      <span>6.5 in woofer</span>
    </div>
  </section>
)

const EqBank = (props: {
  gains: number[]
  onGain: (band: number, gainDb: number) => void
}) => (
  <fieldset className={lower.eqBank} aria-label='Five band graphic equalizer'>
    <span className={lower.panelLabel}>5 band graphic equalizer · db</span>
    <div className={lower.eqScaleSide} aria-hidden>
      <span>+8</span>
      <span>0</span>
      <span>-8</span>
    </div>
    <div className={lower.eqGrid}>
      {EQ_LABELS.map((label, band) => (
        <label key={label} className={lower.eqSlider}>
          <input
            type='range'
            className={lower.eqInput}
            min={-8}
            max={8}
            step={1}
            value={props.gains[band] ?? 0}
            aria-label={`${label}Hz gain`}
            onChange={(event) => props.onGain(band, Number(event.target.value))}
          />
          <span className={lower.eqName}>{label}</span>
        </label>
      ))}
    </div>
  </fieldset>
)

const VolumeCell = (props: {
  value: number
  onChange: (value: number) => void
}) => (
  <section className={lower.volumeCell}>
    <span className={lower.panelLabel}>volume</span>
    <div className={lower.volumeTicks} aria-hidden />
    <div className={lower.knobWrap}>
      <input
        type='range'
        className={lower.knobInput}
        min={0}
        max={100}
        value={Math.round(props.value * 100)}
        aria-label='Volume'
        onChange={(event) => props.onChange(Number(event.target.value) / 100)}
      />
      <div
        className={lower.volumeKnob}
        style={
          { '--angle': `${-130 + props.value * 260}deg` } as React.CSSProperties
        }
      />
    </div>
  </section>
)

type ChassisProps = {
  copied: boolean
  countdown: DailyCountdown
  daily: Song
  doorOpen: boolean
  eqGains: number[]
  guessDropdown: (resultsId: string) => React.ReactNode
  guessInput: (resultsId: string) => React.ReactNode
  limit: number
  playing: boolean
  sfx: () => DeckSfx
  sound: ClipAudio
  state: BoomboxState
  tapeExpired: boolean
  tapeSpan: number
  volume: number
  onEqGain: (band: number, gainDb: number) => void
  onRewind: () => void
  onShare: () => void
  onSkip: () => void
  onStop: () => void
  onVolume: (value: number) => void
  togglePlay: () => void
}

export function BoomboxChassis({
  copied,
  countdown,
  daily,
  doorOpen,
  eqGains,
  guessDropdown,
  guessInput,
  limit,
  playing,
  sfx,
  sound,
  state,
  tapeExpired,
  tapeSpan,
  volume,
  onEqGain,
  onRewind,
  onShare,
  onSkip,
  onStop,
  onVolume,
  togglePlay,
}: ChassisProps) {
  return (
    <div className={css.machineStage}>
      <div className={css.handle} aria-hidden>
        <span className={css.handlePost} data-side='l' />
        <span className={css.handlePost} data-side='r' />
        <span className={css.handleGrip} />
      </div>

      <a className={css.exitKey} href='/'>
        exit
      </a>

      <div className={css.topRail} aria-hidden>
        <span className={css.topDecoKey}>
          <span className={css.topDecoLed} />
        </span>
        <span className={css.topDecoKey}>
          <span className={css.topDecoLed} />
        </span>
        <span className={css.topDecoKey}>
          <span className={css.topDecoLed} />
        </span>
        <span className={css.topDecoKnob} />
        <span className={css.topDecoKnob} />
      </div>

      <div className={css.boombox}>
        <div className={css.topLip} aria-hidden>
          <span className={css.brandPlate}>
            saiwa · stereo radio cassette recorder · model bv 1991
          </span>
        </div>

        <Tuner
          attempts={state.guesses.length}
          daily={daily}
          isPlaying={sound.isPlaying}
          stage={state.stage}
        />

        <section className={css.mainFace}>
          <Speaker live={sound.isPlaying} side='left' />

          <section className={css.centerDeck}>
            <div className={css.deckBrand}>
              <span className={css.deckLogo}>BOOMBOX</span>
              <span className={css.deckTag}>daily mixtape decoder</span>
            </div>

            <div className={lcd.lcdRack}>
              <Lcd
                countdown={countdown}
                daily={daily}
                limit={limit}
                seconds={sound.seconds}
                state={state}
              />
              <div className={lcd.meterStack}>
                <DbMeter
                  analyser={sound.analyser}
                  band='low'
                  isPlaying={sound.isPlaying}
                />
                <DbMeter
                  analyser={sound.analyser}
                  band='high'
                  isPlaying={sound.isPlaying}
                />
              </div>
            </div>

            <FunctionRow onPress={() => sfx().click()} />

            <CassettePane
              daily={daily}
              doorOpen={doorOpen}
              isPlaying={sound.isPlaying}
              limit={limit}
              stage={state.stage}
              tapeExpired={tapeExpired}
              wound={sound.seconds / tapeSpan}
              onLoadNewTape={() => location.reload()}
            />
          </section>

          <Speaker live={sound.isPlaying} side='right' />

          <CaseTracklist
            guesses={state.guesses}
            stage={state.stage}
            input={guessInput('boombox-results')}
            dropdown={guessDropdown('boombox-results')}
          />
        </section>

        <section className={lower.lowerConsole}>
          <EqBank gains={eqGains} onGain={onEqGain} />
          <Transport
            size='deck'
            order={DECK_KEY_ORDER}
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
          <VolumeCell value={volume} onChange={onVolume} />
        </section>

        <span className={css.screw} data-corner='tl' aria-hidden />
        <span className={css.screw} data-corner='tr' aria-hidden />
        <span className={css.screw} data-corner='bl' aria-hidden />
        <span className={css.screw} data-corner='br' aria-hidden />
      </div>
    </div>
  )
}
