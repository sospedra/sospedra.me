'use client'

import { range } from 'es-toolkit'
import { Caveat, Share_Tech_Mono, VT323 } from 'next/font/google'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  type DailyCountdown,
  useDailyCountdown,
} from 'services/daily-countdown'
import { useGameInput } from 'services/hotkeys'
import { shareHandled, shareText } from 'services/share'
import { readLocalJson, writeLocalJson } from 'services/storage'
import * as z from 'zod/mini'
import css from './boombox.module.css'
import { createDeckSfx, type DeckSfx } from './deck-sfx'
import {
  type BoomboxEvent,
  type BoomboxState,
  CLIP_SECONDS,
  dayNumber,
  FULL_UNLOCK,
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

const FONT_VARIABLES = `${caveat.variable} ${vt323.variable} ${shareTechMono.variable}`

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
const DOOR_CLOSE_DELAY_MS = 1400
const FUNCTION_BLINK_MS = 700
const COPIED_RESET_MS = 2000
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

const SCORE_NOTE = {
  album: 'right album!',
  artist: 'right artist!',
  decade: 'close decade',
  hit: '',
  miss: '',
  skip: '',
  year: 'right year!',
} satisfies Record<GuessScore, string>

const savedGuessSchema = z.object({
  label: z.string(),
  score: z.enum(['album', 'artist', 'decade', 'hit', 'miss', 'skip', 'year']),
  songId: z.nullable(z.string()),
})

const savedStateSchema = z.object({
  day: z.number(),
  guesses: z.array(savedGuessSchema).check(z.maxLength(MAX_GUESSES)),
  stage: z.enum(['lost', 'play', 'won']),
})

const restoreBoomboxState = (
  value: unknown,
  day: number,
): BoomboxState | null => {
  const parsed = savedStateSchema.safeParse(value)
  if (!parsed.success || parsed.data.day !== day) return null
  return parsed.data
}

const loadState = (day: number): BoomboxState => {
  const loaded = readLocalJson(STORAGE_KEY)
  const restored =
    loaded.status === 'ok' ? restoreBoomboxState(loaded.value, day) : null
  return restored ?? initialState(day)
}

const persistState = (state: BoomboxState) => {
  writeLocalJson(STORAGE_KEY, state)
}

const useDoorGreeting = () => {
  const [doorOpen, setDoorOpen] = useState(true)

  useEffect(() => {
    const timeout = setTimeout(() => setDoorOpen(false), DOOR_CLOSE_DELAY_MS)
    return () => clearTimeout(timeout)
  }, [])

  return doorOpen
}

const CHARS = 'aabccddeefghiijklmnnoopqrssttuuvwxyz'
/* deterministic index-hash: every render and hydration agrees on the mask */
const scribble = (text: string) =>
  [...text]
    .map((char, index) =>
      char === ' '
        ? ' '
        : CHARS.charAt(
            ((char.codePointAt(0) ?? 0) + index * 31) % CHARS.length,
          ),
    )
    .join('')

const skipSecondsGain = (state: BoomboxState) => {
  const current = UNLOCKS[state.guesses.length] ?? FULL_UNLOCK
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

const countdownLabel = (countdown: DailyCountdown) => {
  if (countdown.status === 'counting') return countdown.label
  if (countdown.status === 'ready') return '00:00:00'
  return '--:--:--'
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

  const nextTape = `next tape ${countdownLabel(props.countdown)}`
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
          <span>{statusLine()}</span>
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

const Cassette = (props: {
  daily: Song
  isPlaying: boolean
  limit: number
  stage: BoomboxState['stage']
  wound: number
}) => {
  const masked = {
    artist: scribble(props.daily.artist),
    title: scribble(props.daily.title),
  }
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

const CaseTracklist = (props: PaperProps) => (
  <aside className={css.caseScene} aria-label='Attempts'>
    <div className={css.caseRig}>
      <div className={css.casePaper}>
        <h2 className={css.caseTitle}>
          tracklist <small>· today's guesses</small>
        </h2>
        <p className={css.caseRule}>side a · type i · c-90</p>
        <ol className={css.trackRows}>
          {range(MAX_GUESSES).map((slot) => {
            const guess = props.guesses[slot]
            const active =
              props.stage === 'play' && slot === props.guesses.length
            return (
              <li
                key={`track-${slot}`}
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

type TransportKeyName = 'play' | 'stop' | 'rew' | 'skip' | 'share'

const DECK_KEY_ORDER = ['play', 'stop', 'rew', 'skip', 'share'] as const
const TAD_KEY_ORDER = ['rew', 'play', 'skip', 'stop', 'share'] as const

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
  order: readonly TransportKeyName[]
  size: 'deck' | 'tad'
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

const Transport = (props: TransportProps) => {
  const keys = {
    play: {
      glyph: '▶',
      word: 'play',
      on: props.soundPlaying,
      ariaLabel: 'Play',
      onPress: props.onPlay,
      disabled: !props.soundReady,
    },
    stop: {
      glyph: '◼',
      word: 'stop',
      ariaLabel: 'Stop',
      onPress: props.onStop,
    },
    rew: {
      glyph: '◀◀',
      word: 'rew',
      ariaLabel: 'Rewind to the previous waypoint',
      onPress: props.onRewind,
      disabled: !props.canRewind,
    },
    skip: {
      glyph: '▶▶',
      word: props.skipGain > 0 ? `skip +${props.skipGain}s` : 'skip',
      ariaLabel: 'Skip attempt',
      onPress: props.onSkip,
      disabled: !props.playing,
    },
    share: {
      glyph: '●',
      word: props.copied ? 'copied.' : 'rec·share',
      on: props.copied,
      red: true,
      ariaLabel: 'Share result',
      onPress: props.onShare,
      disabled: props.playing,
    },
  } satisfies Record<TransportKeyName, LeverSpec>

  return (
    <LeverBank size={props.size} keys={props.order.map((name) => keys[name])} />
  )
}

export default function BoomboxView() {
  const [session, setSession] = useState<
    { status: 'loading' } | { status: 'ready'; state: BoomboxState }
  >({ status: 'loading' })

  useGameInput()

  useEffect(() => {
    setSession({ status: 'ready', state: loadState(dayNumber(new Date())) })
  }, [])

  if (session.status === 'loading') {
    return (
      <main className={`${css.room} ${FONT_VARIABLES}`}>
        <p className={css.loading}>Rewinding today's tape…</p>
      </main>
    )
  }

  return <BoomboxMachine initialState={session.state} />
}

function BoomboxMachine({
  initialState: startState,
}: {
  initialState: BoomboxState
}) {
  const [state, setState] = useState(startState)
  const [tapeExpired, setTapeExpired] = useState(false)
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const [mobileEntryOpen, setMobileEntryOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [eqGains, setEqGains] = useState<number[]>(() =>
    Array(EQ_BANDS.length).fill(0),
  )
  const [volume, setVolume] = useState(0.65)
  const sfxRef = useRef<DeckSfx | null>(null)
  const copiedTimerRef = useRef(0)
  /* the site's dailies count to utc midnight; this tape flips at 02:00 on
     spain's wall clock, so the lcd counts to the engine's own flip instant */
  const countdown = useDailyCountdown(nextFlipAt)
  const doorOpen = useDoorGreeting()

  const daily = songForDay(SONGS, state.day)
  const limit = unlockedSeconds(state)
  const playing = state.stage === 'play'
  const tapeSpan = playing ? FULL_UNLOCK : CLIP_SECONDS

  const sfx = useCallback(() => {
    sfxRef.current ??= createDeckSfx()
    return sfxRef.current
  }, [])

  const sound = useClipAudio(clipUrl(daily.id), {
    limit,
    onLimit: () => sfx().clunk(),
    eqGains,
    volume,
  })

  useEffect(() => {
    if (!sound.isPlaying) return
    sfx().motorOn()
    return () => sfxRef.current?.motorOff()
  }, [sound.isPlaying, sfx])

  useEffect(() => () => window.clearTimeout(copiedTimerRef.current), [])

  useEffect(() => {
    const check = () => setTapeExpired(dayNumber(new Date()) !== state.day)
    const interval = setInterval(check, 30_000)
    document.addEventListener('visibilitychange', check)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', check)
    }
  }, [state.day])

  const guessedIds = state.guesses.map((guess) => guess.songId)
  const results =
    query.trim().length < 2
      ? []
      : SONGS.filter(
          (song) =>
            matchesSongQuery(song, query) && !guessedIds.includes(song.id),
        ).slice(0, MAX_RESULTS)

  const dispatch = (event: BoomboxEvent) => {
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
    sfx().click()
    const card = shareCard(state)
    const outcome = await shareText({ text: card })
    if (shareHandled(outcome)) return
    await navigator.clipboard.writeText(card).catch(() => undefined)
    setCopied(true)
    window.clearTimeout(copiedTimerRef.current)
    copiedTimerRef.current = window.setTimeout(
      () => setCopied(false),
      COPIED_RESET_MS,
    )
  }

  const onEqGain = (band: number, gainDb: number) => {
    setEqGains((gains) => gains.with(band, gainDb))
    sound.setBand(band, gainDb)
  }

  const onVolume = (value: number) => {
    setVolume(value)
    sound.setVolume(value)
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
      onFocus={() => {
        if (!autoFocus) setMobileEntryOpen(true)
      }}
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
    <main className={`${css.room} ${FONT_VARIABLES}`}>
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

      <div
        className={css.ansaphone}
        data-entry-open={mobileEntryOpen}
        onClickCapture={(event) => {
          if (!mobileEntryOpen) return
          const target = event.target
          if (!(target instanceof Element)) return
          if (target.closest('[role="option"]')) return
          if (target.closest('button')) setMobileEntryOpen(false)
        }}
        onBlurCapture={(event) => {
          const nextTarget = event.relatedTarget
          if (
            nextTarget instanceof Node &&
            event.currentTarget.contains(nextTarget)
          ) {
            return
          }
          setMobileEntryOpen(false)
        }}
      >
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
          input={guessInput('boombox-results-m', false)}
          dropdown={guessDropdown('boombox-results-m')}
        />
      </div>
    </main>
  )
}
