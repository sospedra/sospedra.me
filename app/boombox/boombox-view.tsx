'use client'

import { readLocalJson, writeLocalJson } from 'lib/storage'
import { Caveat, Share_Tech_Mono, VT323 } from 'next/font/google'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type DailyCountdown, useDailyCountdown } from 'service/daily-countdown'
import { useGameInput } from 'service/hotkeys'
import { shareText } from 'service/share'
import css from './boombox.module.css'
import { createDeckSfx, type DeckSfx } from './deck-sfx'
import {
  type BoomboxEvent,
  type BoomboxState,
  CLIP_SECONDS,
  dayNumber,
  type Guess,
  type GuessScore,
  initialState,
  MAX_GUESSES,
  matchesSongQuery,
  nextFlipAt,
  reduce,
  type Song,
  shareCard,
  songForDay,
  UNLOCKS,
  unlockedSeconds,
} from './engine'
import songsJson from './songs.json'
import { EQ_BANDS, useClipAudio } from './use-clip-audio'

const caveat = Caveat({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-hand',
})
const vt323 = VT323({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-lcd',
})
const shareTechMono = Share_Tech_Mono({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-micro',
})

const SONGS = songsJson as Song[]
const BLOB = 'https://2nvntiogo7b5zhfu.public.blob.vercel-storage.com/boombox'
const STORAGE_KEY = '@@boombox/state-v1'
const MAX_RESULTS = 5
/* seven FM stops, one per attempt state 0..6; the needle parks on them */
const FM_STOPS = ['88', '91', '94', '98', '102', '105', '108']
const AM_STOPS = ['530', '700', '900', '1100', '1300', '1600']
const FUNCTIONS = ['tape', 'tuner', 'cd', 'aux']
const EQ_LABELS = ['60', '250', '1K', '4K', '12K']
const TICKER_STEPS = [0.06, 0.16, 0.26, 0.36, 0.46, 0.56, 0.66, 0.76, 0.86]
const FULL_TAPE_SECONDS = 16
const DOOR_CLOSE_DELAY_MS = 1400
const SHELL_SCREWS = ['tl', 'tr', 'bl', 'br']

const clipUrl = (id: string) => `${BLOB}/clips/${id}.mp3`
const coverUrl = (id: string) => `${BLOB}/covers/${id}.jpg`

const SCORE_LABEL = {
  album: 'Right album',
  artist: 'Right artist',
  decade: 'Right decade',
  hit: 'Correct',
  miss: 'No match',
  skip: 'Skipped',
  year: 'Right year',
} satisfies Record<GuessScore, string>

/* pen margin notes; partial matches earn a scribble, not an emoji */
const SCORE_NOTE = {
  album: 'right album!',
  artist: 'right artist!',
  decade: 'close decade',
  hit: '',
  miss: '',
  skip: '',
  year: 'right year!',
} satisfies Record<GuessScore, string>

const loadState = (day: number): BoomboxState => {
  const loaded = readLocalJson(STORAGE_KEY)
  const stored =
    loaded.status === 'ok' ? (loaded.value as BoomboxState | null) : null
  return stored && stored.day === day ? stored : initialState(day)
}

const persistState = (state: BoomboxState) => {
  writeLocalJson(STORAGE_KEY, state)
}

/* the door greets you open, then the mechanism swallows the tape */
const useDoorGreeting = () => {
  const [doorOpen, setDoorOpen] = useState(true)

  useEffect(() => {
    const timeout = setTimeout(() => setDoorOpen(false), DOOR_CLOSE_DELAY_MS)
    return () => clearTimeout(timeout)
  }, [])

  return doorOpen
}

const CHARS = 'aabccddeefghiijklmnnoopqrssttuuvwxyz'
const scribble = (text: string) =>
  text
    .split('')
    .map((char) =>
      char === ' ' ? ' ' : CHARS[Math.floor(Math.random() * CHARS.length)],
    )
    .join('')

const skipSecondsGain = (state: BoomboxState) => {
  const current = UNLOCKS[state.guesses.length] ?? 16
  const next = UNLOCKS[state.guesses.length + 1]
  return next === undefined ? 0 : next - current
}

/* rew steps through the unlock ladder like cd track-back: mid-segment
   jumps to the segment start, a boundary jumps to the one before */
const previousWaypoint = (seconds: number) => {
  const stops = [0, ...UNLOCKS].filter((stop) => stop < seconds)
  return stops[stops.length - 1] ?? 0
}

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

/* the cover sharpens with the unlock ladder, one more hint to earn */
const coverBlurClass = (limit: number, stage: BoomboxState['stage']) => {
  if (stage !== 'play') return css.coverClear
  if (limit >= 11) return css.coverSoft
  if (limit >= 7) return css.coverMid
  return css.coverHeavy
}

const STAGE_TAG = {
  lost: 'END',
  play: 'PLAY',
  won: 'WIN',
} satisfies Record<BoomboxState['stage'], string>

/* db meter: a strip of leds, rAF writes --vu, css decides which burn */
const DbMeter = (props: {
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

/* the tuner: a backlit glass dial. the fm scale is the attempt ladder and
   the needle rides stop centers exactly: (attempt + 0.5) sevenths of rail */
const Tuner = (props: {
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
            <button type='button' tabIndex={-1} aria-hidden />
            <button type='button' tabIndex={-1} aria-hidden />
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

const Lcd = (props: {
  countdown: DailyCountdown
  daily: Song
  seconds: number
  limit: number
  state: BoomboxState
}) => {
  const { stage } = props.state
  const playing = stage === 'play'

  const nextTape = `next tape ${props.countdown.label ?? '--:--:--'}`
  const statusLine = () => {
    if (stage === 'won')
      return `got it in ${props.state.guesses.length} · ${nextTape}`
    if (stage === 'lost') return `side b next time · ${nextTape}`
    return nextTape
  }
  const yearHint = props.limit >= 4 || !playing ? props.daily.year : '····'
  const genreHint = () => {
    if (playing && props.limit < 7) return '····'
    return props.daily.genre || 'unknown'
  }

  return (
    <div className={css.lcdBezel}>
      <div className={css.lcdScreen} aria-live='polite'>
        <div className={css.lcdTop}>
          <span>boombox #{props.state.day + 1}</span>
          <span>
            {String(props.seconds).padStart(3, '0')}/
            {playing ? `${props.limit}s` : '30s'}
          </span>
        </div>
        <div
          className={css.lcdRuler}
          role='img'
          aria-label={`${props.limit} of 16 seconds unlocked`}
        >
          {Array.from({ length: 16 }, (_, index) => (
            <span
              key={`seg-${
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length static ruler
                index
              }`}
              className={css.lcdSegment}
              data-tone={segmentTone(
                index,
                props.seconds,
                playing ? props.limit : 16,
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
          <span>{statusLine()}</span>
          <span>{STAGE_TAG[stage]}</span>
        </div>
        {!playing && (
          <div
            className={css.lcdNextBar}
            aria-hidden
            style={
              {
                '--remaining': props.countdown.remainingFraction ?? 0,
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

/* pressing a source key answers with two led blinks: green home, red deny */
const FunctionRow = (props: { onPress: () => void }) => {
  const [blinking, setBlinking] = useState<string | null>(null)

  const press = (name: string) => {
    props.onPress()
    setBlinking(name)
    setTimeout(() => setBlinking(null), 700)
  }

  return (
    <div className={css.functionRow} aria-hidden>
      <span className={css.functionLabel}>function</span>
      {FUNCTIONS.map((name) => (
        <button
          key={name}
          type='button'
          tabIndex={-1}
          className={css.functionKey}
          data-on={name === 'tape'}
          onClick={() => press(name)}
        >
          <span
            className={css.functionLed}
            data-blink={blinking === name}
            data-deny={name !== 'tape'}
          />
          {name}
        </button>
      ))}
    </div>
  )
}

const Hub = () => (
  <span className={css.hub}>
    <span className={css.teethBox}>
      <span className={css.teeth} />
      <span className={css.teeth} />
      <span className={css.teeth} />
    </span>
  </span>
)

/* the classic D-C90 shell: cream sticker, racing stripe, toothed hubs and
   a window where the tape discs trade mass as --wound moves */
const Cassette = (props: {
  daily: Song
  isPlaying: boolean
  limit: number
  stage: BoomboxState['stage']
  wound: number
}) => {
  const masked = useMemo(
    () => ({
      artist: scribble(props.daily.artist),
      title: scribble(props.daily.title),
    }),
    [props.daily],
  )
  const revealed = props.stage !== 'play'

  return (
    <div
      className={css.cassette}
      data-rolling={props.isPlaying}
      style={{ '--wound': props.wound } as React.CSSProperties}
    >
      <div className={css.shell}>
        {SHELL_SCREWS.map((corner) => (
          <span key={corner} className={css.tapeScrew} data-corner={corner}>
            <span className={css.tapeScrewSlot} />
          </span>
        ))}

        <div className={css.stickerOuter}>
          <div className={css.sticker}>
            <span className={css.aSide}>a</span>
            <div className={css.stickerScript}>
              <span className={css.scriptTitle} data-masked={!revealed}>
                {revealed ? props.daily.title : masked.title}
              </span>
              <span className={css.scriptArtist} data-masked={!revealed}>
                {revealed ? props.daily.artist : masked.artist}
              </span>
            </div>
            {/* the cover is the answer; alt text would spoil it */}
            <img
              src={coverUrl(props.daily.id)}
              className={`${css.albumSticker} ${coverBlurClass(props.limit, props.stage)}`}
              alt=''
              draggable={false}
            />
            <span className={css.stickerStripe} />
            <span className={css.chipTape}>bub-90</span>
            <span className={css.chipLogo}>saiwa®</span>
            <div className={css.hubBand}>
              <Hub />
              <div className={css.tapeWindow}>
                <span className={css.reelSupply} />
                <span className={css.reelTakeup} />
              </div>
              <Hub />
            </div>
          </div>
        </div>

        <div className={css.shellBottom}>
          <span className={css.tapeScrew} data-corner='c'>
            <span className={css.tapeScrewSlot} />
          </span>
          <span className={css.bottomShadow}>
            <span className={`${css.bottomHoles} ${css.holesA}`} />
            <span className={`${css.bottomHoles} ${css.holesB}`} />
            <span className={`${css.bottomHoles} ${css.holesC}`} />
          </span>
          <span className={`${css.shellHole} ${css.holeLeft}`} />
          <span className={`${css.shellHole} ${css.holeRight}`} />
        </div>
      </div>
    </div>
  )
}

/* the mik pane, literal: door and cassette are siblings that tilt with
   different perspectives and pivots. the parallax is the whole trick. */
const CassettePane = (props: {
  daily: Song
  doorOpen: boolean
  isPlaying: boolean
  limit: number
  stage: BoomboxState['stage']
  tapeExpired: boolean
  wound: number
  onLoadNewTape: () => void
}) => (
  <div className={css.pane} data-open={props.doorOpen}>
    <div className={css.doorCase}>
      <div className={css.caseTopLabel}>boombox mixtape player</div>
      <div className={css.caseBottomLabel}>auto reverse</div>
    </div>
    <Cassette
      daily={props.daily}
      isPlaying={props.isPlaying}
      limit={props.limit}
      stage={props.stage}
      wound={props.wound}
    />
    {props.tapeExpired && (
      <button
        type='button'
        className={css.newTapeSlip}
        onClick={props.onLoadNewTape}
      >
        ● new tape ready · press to load
      </button>
    )}
  </div>
)

const NoteEntry = (props: { guess: Guess }) => {
  const circled = props.guess.score === 'hit'
  const note = SCORE_NOTE[props.guess.score]

  return (
    <>
      <span className={circled ? css.circled : css.crossed}>
        {props.guess.label}
        <span className='sr-only'> ({SCORE_LABEL[props.guess.score]})</span>
      </span>
      {note !== '' && <small className={css.marginScribble}>{note}</small>}
    </>
  )
}

type PaperProps = {
  guesses: Guess[]
  stage: BoomboxState['stage']
  input: React.ReactNode
  dropdown: React.ReactNode
}

/* the j-card holds the pen: guesses are tracks on the inner paper, the
   empty tray shell hangs ajar off its right hinge. both builds seat it */
const CaseTracklist = (props: PaperProps) => (
  <aside className={css.caseScene} aria-label='Attempts'>
    <div className={css.caseRig}>
      <div className={css.casePaper}>
        <h2 className={css.caseTitle}>
          tracklist <small>· today's guesses</small>
        </h2>
        <p className={css.caseRule}>side a · type i · c-90</p>
        <ol className={css.trackRows}>
          {Array.from({ length: MAX_GUESSES }, (_, index) => {
            const guess = props.guesses[index]
            const active =
              props.stage === 'play' && index === props.guesses.length
            return (
              <li
                key={`track-${
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed six-line card
                  index
                }`}
                data-long={(guess?.label.length ?? 0) > 22}
                data-active={active}
              >
                {guess && <NoteEntry guess={guess} />}
                {active && props.input}
                {active && props.dropdown}
              </li>
            )
          })}
        </ol>
        <div className={css.caseFoot}>
          <span>dolby off</span>
          <span>rebobina abans, va</span>
        </div>
      </div>
      <span className={css.caseSpine} aria-hidden />
      <div className={css.caseArm} aria-hidden>
        <span className={css.armFloor}>
          <span className={css.armPost} data-post='a' />
          <span className={css.armPost} data-post='b' />
        </span>
        <span className={css.armBack} />
        <span className={css.armWall} data-side='top' />
        <span className={css.armWall} data-side='bottom' />
        <span className={css.armWall} data-side='rim' />
      </div>
    </div>
  </aside>
)

/* the speaker column: a small round tweeter over the big jvc-mesh woofer,
   both wearing the chrome turned-metal rim */
const Speaker = (props: { live: boolean; side: 'left' | 'right' }) => (
  <section
    className={`${css.speakerPanel} ${props.side === 'left' ? css.speakerLeft : css.speakerRight}`}
    data-live={props.live}
  >
    <div className={css.tweeterRing}>
      <div className={css.wooferCone}>
        <div className={css.wooferCap} />
      </div>
    </div>
    <div className={css.woofer}>
      <div className={css.wooferRing}>
        <div className={css.wooferCone}>
          <div className={css.wooferCap} />
        </div>
      </div>
    </div>
    <div className={css.speakerMicrocopy}>
      <span>2 way speaker system</span>
      <span>6.5 in woofer</span>
    </div>
  </section>
)

const EqBank = (props: {
  gains: number[]
  onGain: (band: number, gainDb: number) => void
}) => (
  <fieldset className={css.eqBank} aria-label='Five band graphic equalizer'>
    <span className={css.panelLabel}>5 band graphic equalizer · db</span>
    <div className={css.eqScaleSide} aria-hidden>
      <span>+8</span>
      <span>0</span>
      <span>-8</span>
    </div>
    <div className={css.eqGrid}>
      {EQ_LABELS.map((label, band) => (
        <label key={label} className={css.eqSlider}>
          <input
            type='range'
            className={css.eqInput}
            min={-8}
            max={8}
            step={1}
            value={props.gains[band] ?? 0}
            aria-label={`${label}Hz gain`}
            onChange={(event) => props.onGain(band, Number(event.target.value))}
          />
          <span className={css.eqName}>{label}</span>
        </label>
      ))}
    </div>
  </fieldset>
)

const VolumeCell = (props: {
  value: number
  onChange: (value: number) => void
}) => (
  <section className={css.volumeCell}>
    <span className={css.panelLabel}>volume</span>
    <div className={css.volumeTicks} aria-hidden />
    <div className={css.knobWrap}>
      <input
        type='range'
        className={css.knobInput}
        min={0}
        max={100}
        value={Math.round(props.value * 100)}
        aria-label='Volume'
        onChange={(event) => props.onChange(Number(event.target.value) / 100)}
      />
      <div
        className={css.volumeKnob}
        style={
          { '--angle': `${-130 + props.value * 260}deg` } as React.CSSProperties
        }
      />
    </div>
  </section>
)

type TransportProps = {
  canRewind: boolean
  copied: boolean
  playing: boolean
  soundReady: boolean
  soundPlaying: boolean
  skipGain: number
  onPlay: () => void
  onStop: () => void
  onRewind: () => void
  onSkip: () => void
  onShare: () => void
}

type LeverSpec = {
  glyph: string
  word: string
  on?: boolean
  red?: boolean
  disabled?: boolean
  ariaLabel: string
  onPress: () => void
}

/* latching lever keys: legends silkscreened on the fascia, blank caps
   slide under the slot mouth. latched keys stay down; both decks share it */
const LeverBank = (props: { size: 'deck' | 'tad'; keys: LeverSpec[] }) => (
  <div className={css.leverBank} data-size={props.size}>
    <div className={css.leverLegend} aria-hidden>
      {props.keys.map((key) => (
        <span key={key.ariaLabel} className={css.legendCell}>
          <b>{key.word}</b>
          {key.red ? <i data-dot='true' /> : <i>{key.glyph}</i>}
        </span>
      ))}
    </div>
    <div className={css.leverSlot}>
      {props.keys.map((key) => (
        <button
          key={key.ariaLabel}
          type='button'
          className={css.leverKey}
          data-on={key.on}
          aria-label={key.ariaLabel}
          onClick={key.onPress}
          disabled={key.disabled}
        >
          <span className={css.leverCap} aria-hidden />
        </button>
      ))}
    </div>
  </div>
)

const Transport = (props: TransportProps) => (
  <LeverBank
    size='deck'
    keys={[
      {
        glyph: '▶',
        word: 'play',
        on: props.soundPlaying,
        ariaLabel: 'Play',
        onPress: props.onPlay,
        disabled: !props.soundReady,
      },
      { glyph: '◼', word: 'stop', ariaLabel: 'Stop', onPress: props.onStop },
      {
        glyph: '◀◀',
        word: 'rew',
        ariaLabel: 'Rewind to the previous waypoint',
        onPress: props.onRewind,
        disabled: !props.canRewind,
      },
      {
        glyph: '▶▶',
        word: props.skipGain > 0 ? `skip +${props.skipGain}s` : 'skip',
        ariaLabel: 'Skip attempt',
        onPress: props.onSkip,
        disabled: !props.playing,
      },
      {
        glyph: '●',
        word: props.copied ? 'copied.' : 'rec·share',
        on: props.copied,
        red: true,
        ariaLabel: 'Share result',
        onPress: props.onShare,
        disabled: props.playing,
      },
    ]}
  />
)

export default function BoomboxView() {
  const [state, setState] = useState<BoomboxState | null>(null)
  const [tapeExpired, setTapeExpired] = useState(false)
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const [copied, setCopied] = useState(false)
  const [eqGains, setEqGains] = useState<number[]>(() =>
    Array(EQ_BANDS.length).fill(0),
  )
  const [volume, setVolume] = useState(0.65)
  const sfxRef = useRef<DeckSfx | null>(null)
  /* the site's dailies count to utc midnight; this tape flips at 02:00 on
     spain's wall clock, so the lcd counts to the engine's own flip instant */
  const countdown = useDailyCountdown(nextFlipAt)
  const doorOpen = useDoorGreeting()

  useGameInput()

  useEffect(() => {
    setState(loadState(dayNumber(new Date())))
  }, [])

  const daily = useMemo(
    () => (state ? songForDay(SONGS, state.day) : null),
    [state],
  )
  const limit = state ? unlockedSeconds(state) : 1
  const playing = state?.stage === 'play'
  const tapeSpan = playing ? FULL_TAPE_SECONDS : CLIP_SECONDS

  const sfx = useCallback(() => {
    sfxRef.current ??= createDeckSfx()
    return sfxRef.current
  }, [])

  const sound = useClipAudio(daily ? clipUrl(daily.id) : '', {
    limit,
    onLimit: () => sfx().clunk(),
  })

  /* the graph exists only after the first play; re-apply settings then */
  // biome-ignore lint/correctness/useExhaustiveDependencies: isPlaying re-applies onto the just-born graph
  useEffect(() => {
    for (const [band, gain] of eqGains.entries()) {
      sound.setBand(band, gain)
    }
    sound.setVolume(volume)
  }, [eqGains, volume, sound.setBand, sound.setVolume, sound.isPlaying])

  useEffect(() => {
    if (!sound.isPlaying) return
    sfx().motorOn()
    return () => sfxRef.current?.motorOff()
  }, [sound.isPlaying, sfx])

  /* the tape flips at 02:00 spain time; playing past it earns a door slip */
  useEffect(() => {
    if (!state) return
    const check = () => setTapeExpired(dayNumber(new Date()) !== state.day)
    const interval = setInterval(check, 30_000)
    document.addEventListener('visibilitychange', check)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', check)
    }
  }, [state])

  const results = useMemo(() => {
    if (!state || query.trim().length < 2) return []
    const guessedIds = state.guesses.map((guess) => guess.songId)
    return SONGS.filter(
      (song) => matchesSongQuery(song, query) && !guessedIds.includes(song.id),
    ).slice(0, MAX_RESULTS)
  }, [query, state])

  const dispatch = (event: BoomboxEvent) => {
    if (!state || !daily) return
    const next = reduce(state, event, daily)
    persistState(next)
    setState(next)
    if (next.stage !== 'play') sound.stop()
  }

  const onGuess = (candidate: Song | undefined) => {
    if (!candidate) return
    sfx().click()
    sound.stop()
    setQuery('')
    setCursor(0)
    dispatch({ type: 'guess', candidate })
  }

  const onSkip = () => {
    sfx().zip()
    sound.stop()
    dispatch({ type: 'skip' })
  }

  const onRewind = () => {
    sfx().zip()
    sound.seek(previousWaypoint(sound.seconds))
  }

  const togglePlay = () => {
    sfx().click()
    if (sound.isPlaying) {
      sound.pause()
      return
    }
    sound.play()
  }

  const onStop = () => {
    sfx().clunk()
    sound.stop()
  }

  const onShare = async () => {
    if (!state) return
    sfx().click()
    const card = shareCard(state)
    if ((await shareText({ text: card })) !== 'unsupported') return
    await navigator.clipboard.writeText(card).catch(() => undefined)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  /* state only; the settings effect pushes every change into the graph */
  const onEqGain = (band: number, gainDb: number) => {
    setEqGains((gains) => gains.with(band, gainDb))
  }

  const onSearchKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setCursor((position) => Math.min(position + 1, results.length - 1))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setCursor((position) => Math.max(position - 1, 0))
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      onGuess(results[cursor])
      return
    }
    if (event.key === 'Escape') setQuery('')
  }

  const fontVariables = `${caveat.variable} ${vt323.variable} ${shareTechMono.variable}`

  if (!state || !daily) {
    return (
      <main className={`${css.room} ${fontVariables}`}>
        <p className={css.loading}>Rewinding today's tape…</p>
      </main>
    )
  }

  /* desk and ansaphone each mount one pen and one results slip; unique
     ids keep the combobox wiring valid while css shows a single surface.
     only the desk pen autofocuses: on touch screens a focused pen means
     the keyboard is up and the machine folds, so the tap must be real */
  const guessInput = (resultsId: string, autoFocus: boolean) => (
    <input
      className={css.noteInput}
      type='text'
      value={query}
      // biome-ignore lint/a11y/noAutofocus: the pen waits on the note line
      autoFocus={autoFocus}
      placeholder='artist or title…'
      aria-label='Guess the song'
      aria-expanded={results.length > 0}
      role='combobox'
      aria-controls={resultsId}
      autoComplete='off'
      spellCheck={false}
      onChange={(event) => {
        setQuery(event.target.value)
        setCursor(0)
      }}
      onKeyDown={onSearchKeyDown}
    />
  )

  const guessDropdown = (resultsId: string) =>
    results.length > 0 && (
      <div
        className={css.searchDropdown}
        id={resultsId}
        role='listbox'
        /* picking a result must not blur the pen: blur would drop the
           machine mid-tap and move the row under the finger */
        onMouseDown={(event) => event.preventDefault()}
      >
        {results.map((song, index) => (
          <button
            key={song.id}
            type='button'
            role='option'
            aria-selected={index === cursor}
            className={css.songRow}
            data-cursor={index === cursor}
            onMouseEnter={() => setCursor(index)}
            onClick={() => onGuess(song)}
          >
            {song.title} · {song.artist}
          </button>
        ))}
      </div>
    )

  return (
    <main className={`${css.room} ${fontVariables}`}>
      <h1 className='sr-only'>Boombox, the daily mixtape guessing game</h1>

      <div className={css.machineStage}>
        <div className={css.handle} aria-hidden>
          <span className={css.handlePost} data-side='l' />
          <span className={css.handlePost} data-side='r' />
          <span className={css.handleGrip} />
        </div>

        <a className={css.exitKey} href='/'>
          exit
        </a>

        {/* molded top furniture: blank cap stubs and knurled knobs */}
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

              <div className={css.lcdRack}>
                <Lcd
                  countdown={countdown}
                  daily={daily}
                  limit={limit}
                  seconds={sound.seconds}
                  state={state}
                />
                <div className={css.meterStack}>
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
              input={guessInput('boombox-results', true)}
              dropdown={guessDropdown('boombox-results')}
            />
          </section>

          <section className={css.lowerConsole}>
            <EqBank gains={eqGains} onGain={onEqGain} />
            <Transport
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
            <VolumeCell value={volume} onChange={setVolume} />
          </section>

          <span className={css.screw} data-corner='tl' aria-hidden />
          <span className={css.screw} data-corner='tr' aria-hidden />
          <span className={css.screw} data-corner='bl' aria-hidden />
          <span className={css.screw} data-corner='br' aria-hidden />
        </div>
      </div>

      {/* the narrow-room build: a tad-2200 answering machine in front
          elevation. it answers with the mystery tape; you guess who
          called. the machine never folds: when the keyboard rises the
          browser scrolls it up intact */}
      <div className={css.ansaphone}>
        <section className={css.tadBody} aria-label='Answering machine'>
          <div className={css.tadBay}>
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
                <span className={css.tadSwitch} aria-hidden>
                  <i />
                </span>
                <em className={css.tadTag}>answer on</em>
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
                <span className={css.tadVol} aria-hidden />
                <span className={css.tadGrille} aria-hidden />
              </div>
              <LeverBank
                size='tad'
                keys={[
                  {
                    glyph: '◀◀',
                    word: 'rew',
                    ariaLabel: 'Rewind to the previous waypoint',
                    onPress: onRewind,
                    disabled: !(sound.seconds > 0 || sound.isPlaying),
                  },
                  {
                    glyph: '▶',
                    word: 'play',
                    on: sound.isPlaying,
                    ariaLabel: 'Play',
                    onPress: togglePlay,
                    disabled: !sound.isReady,
                  },
                  {
                    glyph: '▶▶',
                    word:
                      skipSecondsGain(state) > 0
                        ? `skip +${skipSecondsGain(state)}s`
                        : 'skip',
                    ariaLabel: 'Skip attempt',
                    onPress: onSkip,
                    disabled: !playing,
                  },
                  {
                    glyph: '◼',
                    word: 'stop',
                    ariaLabel: 'Stop',
                    onPress: onStop,
                  },
                  {
                    glyph: '●',
                    word: copied ? 'copied.' : 'rec·share',
                    on: copied,
                    red: true,
                    ariaLabel: 'Share result',
                    onPress: onShare,
                    disabled: playing,
                  },
                ]}
              />
            </div>
            <div className={css.tadLip} aria-hidden />
          </div>
        </section>
        <CaseTracklist
          guesses={state.guesses}
          stage={state.stage}
          input={guessInput('boombox-results-m', false)}
          dropdown={guessDropdown('boombox-results-m')}
        />
      </div>
    </main>
  )
}
