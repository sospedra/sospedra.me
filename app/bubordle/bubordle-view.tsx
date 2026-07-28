'use client'

import { Caveat } from 'next/font/google'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useGameInput } from 'service/hotkeys'
import css from './bubordle.module.css'
import { createDeckSfx, type DeckSfx } from './deck-sfx'
import {
  type BubordleEvent,
  type BubordleState,
  dayNumber,
  type Guess,
  type GuessScore,
  initialState,
  MAX_GUESSES,
  matchesSongQuery,
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
  weight: ['500', '700'],
  variable: '--font-caveat',
})

const SONGS = songsJson as Song[]
const BLOB = 'https://2nvntiogo7b5zhfu.public.blob.vercel-storage.com/bubordle'
const STORAGE_KEY = '@@bubordle/state-v1'
const MAX_RESULTS = 6
const DIAL_STOPS = ['88', '92', '96', '100', '104', '108']
const EQ_LABELS = ['60', '250', '1k', '4k', '12k']
const TICKER_STEPS = [
  0.04, 0.12, 0.2, 0.28, 0.36, 0.44, 0.52, 0.6, 0.68, 0.76, 0.84, 0.92,
]
const FULL_TAPE_SECONDS = 16

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

const loadState = (day: number): BubordleState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState(day)
    const stored: BubordleState = JSON.parse(raw)
    return stored.day === day ? stored : initialState(day)
  } catch {
    return initialState(day)
  }
}

const persistState = (state: BubordleState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* private mode: the game still works, it just forgets at reload */
  }
}

const pad = (value: number) => value.toString().padStart(2, '0')

const untilMidnight = (now: Date) => {
  const midnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  )
  const seconds = Math.max(
    0,
    Math.floor((midnight.getTime() - now.getTime()) / 1000),
  )
  return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`
}

const useCountdown = () => {
  const [time, setTime] = useState('--:--:--')

  useEffect(() => {
    const update = () => setTime(untilMidnight(new Date()))
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  return time
}

const CHARS = 'aabccddeefghiijklmnnoopqrssttuuvwxyz'
const scribble = (text: string) =>
  text
    .split('')
    .map((char) =>
      char === ' ' ? ' ' : CHARS[Math.floor(Math.random() * CHARS.length)],
    )
    .join('')

const skipSecondsGain = (state: BubordleState) => {
  const current = UNLOCKS[state.guesses.length] ?? 16
  const next = UNLOCKS[state.guesses.length + 1]
  return next === undefined ? 0 : next - current
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

const coverBlurClass = (limit: number, stage: BubordleState['stage']) => {
  if (stage !== 'play') return css.coverClear
  if (limit >= 11) return css.coverSoft
  if (limit >= 7) return css.coverMid
  return css.coverHeavy
}

const tickerZone = (at: number) => {
  if (at >= 0.84) return 'red'
  if (at >= 0.6) return 'amber'
  return 'green'
}

/* db ticker: a row of led lights, rAF writes --vu, css decides which burn */
const LedTicker = (props: {
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
    <div className={css.ticker} aria-hidden>
      <div className={css.tickerScale}>
        <span>-20</span>
        <span>-6</span>
        <span>0</span>
        <span>+3</span>
      </div>
      <div className={css.tickerRow} ref={rowRef}>
        {TICKER_STEPS.map((at) => (
          <span
            key={at}
            className={css.tickerLed}
            data-zone={tickerZone(at)}
            style={{ '--at': at } as React.CSSProperties}
          />
        ))}
      </div>
      <span className={css.tickerTag}>
        db·{props.band === 'low' ? 'l' : 'r'}
      </span>
    </div>
  )
}

/* fm scale; the red needle advances one stop per attempt */
const TunerBand = (props: {
  attempts: number
  analyser: React.RefObject<AnalyserNode | null>
  isPlaying: boolean
}) => (
  <div className={css.band}>
    <LedTicker
      analyser={props.analyser}
      band='low'
      isPlaying={props.isPlaying}
    />
    <div
      className={css.dial}
      role='img'
      aria-label={`Attempt ${Math.min(props.attempts + 1, MAX_GUESSES)} of ${MAX_GUESSES}`}
    >
      <div className={css.dialScale}>
        {DIAL_STOPS.map((stop) => (
          <span key={stop}>{stop}</span>
        ))}
      </div>
      <div className={css.dialTicks} />
      <span
        className={css.dialNeedle}
        style={
          { '--dial': props.attempts / MAX_GUESSES } as React.CSSProperties
        }
      />
      <span className={css.dialUnit}>fm·mhz</span>
    </div>
    <LedTicker
      analyser={props.analyser}
      band='high'
      isPlaying={props.isPlaying}
    />
  </div>
)

const Lcd = (props: {
  countdown: string
  daily: Song
  seconds: number
  limit: number
  state: BubordleState
}) => {
  const { stage } = props.state
  const playing = stage === 'play'

  const statusLine = () => {
    if (stage === 'won')
      return `got it in ${props.state.guesses.length} · rec to share`
    if (stage === 'lost') return 'side b next time · rec to share'
    return `next tape ${props.countdown}`
  }
  const yearHint = props.limit >= 4 || !playing ? props.daily.year : '····'
  const genreHint = () => {
    if (playing && props.limit < 7) return '····'
    return props.daily.genre || 'unknown'
  }

  return (
    <div className={css.lcd} aria-live='polite'>
      <div className={css.lcdRow}>
        <span className={css.lcdBrand}>bubordle #{props.state.day + 1}</span>
        <span className={css.lcdDigits}>
          {pad(props.seconds).padStart(3, '0')}
          <span className={css.lcdUnit}>
            /{playing ? `${props.limit}s` : '30s'}
          </span>
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
      <p className={css.lcdHints}>
        year {yearHint} · genre {genreHint()}
      </p>
      <p className={css.lcdStatus}>{statusLine()}</p>
    </div>
  )
}

const Cassette = (props: {
  daily: Song
  isPlaying: boolean
  limit: number
  stage: BubordleState['stage']
}) => {
  const masked = useMemo(
    () => ({
      artist: scribble(props.daily.artist),
      title: scribble(props.daily.title),
    }),
    [props.daily],
  )
  const revealed = props.stage !== 'play'
  /* skips wind the reel: the unlock ladder is the tape position */
  const wound = props.stage === 'play' ? props.limit / FULL_TAPE_SECONDS : 1

  return (
    <div
      className={css.cassette}
      data-rolling={props.isPlaying}
      style={{ '--progress': wound } as React.CSSProperties}
    >
      <div className={css.cassetteLabel}>
        <div className={css.labelBand}>
          <span className={css.bandTeal} />
          <span className={css.bandRust} />
        </div>
        <div className={css.labelRow}>
          {/* the cover is the answer; alt text would spoil it */}
          <img
            src={coverUrl(props.daily.id)}
            className={`${css.cover} ${coverBlurClass(props.limit, props.stage)}`}
            alt=''
            draggable={false}
          />
          <div className={css.labelInk}>
            <p className={css.penTitle} data-masked={!revealed}>
              {revealed ? props.daily.title : masked.title}
            </p>
            <p className={css.penArtist} data-masked={!revealed}>
              {revealed ? props.daily.artist : masked.artist}
            </p>
          </div>
        </div>
      </div>
      <div className={css.window}>
        <div className={`${css.spool} ${css.spoolLeft}`} />
        <div className={`${css.spool} ${css.spoolRight}`} />
        <div className={`${css.reel} ${css.reelLeft}`}>
          <div className={css.hub} />
        </div>
        <div className={`${css.reel} ${css.reelRight}`}>
          <div className={css.hub} />
        </div>
      </div>
    </div>
  )
}

const NoteLine = (props: {
  guess: Guess | undefined
  typed: string
  active: boolean
}) => {
  if (props.guess) {
    const circled = props.guess.score === 'hit'
    const note = SCORE_NOTE[props.guess.score]
    return (
      <>
        <span className={circled ? css.circled : css.struck}>
          {props.guess.label}
          <span className='sr-only'> ({SCORE_LABEL[props.guess.score]})</span>
        </span>
        {note !== '' && <span className={css.noteMargin}>{note}</span>}
      </>
    )
  }
  if (props.active) {
    return (
      <span className={css.noteInk}>
        {props.typed}
        <span className={css.caret} aria-hidden />
      </span>
    )
  }
  return null
}

const PostIt = (props: {
  guesses: Guess[]
  stage: BubordleState['stage']
  typed: string
}) => (
  <aside className={css.postit} aria-label='Attempts'>
    <p className={css.postitHead}>today's guesses</p>
    <ol className={css.noteLines}>
      {Array.from({ length: MAX_GUESSES }, (_, index) => (
        <li
          key={`note-${
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed six-line note
            index
          }`}
          className={css.noteLine}
          data-active={props.stage === 'play' && index === props.guesses.length}
        >
          <NoteLine
            guess={props.guesses[index]}
            typed={props.typed}
            active={props.stage === 'play' && index === props.guesses.length}
          />
        </li>
      ))}
    </ol>
  </aside>
)

const Speaker = (props: { live: boolean }) => (
  <div className={css.speaker} data-live={props.live}>
    <div className={css.tweeterSlot} />
    <div className={css.woofer}>
      <div className={css.wooferRing}>
        <div className={css.wooferCone}>
          <div className={css.wooferCap} />
        </div>
      </div>
    </div>
  </div>
)

const EqBank = (props: {
  gains: number[]
  onGain: (band: number, gainDb: number) => void
}) => (
  <fieldset className={css.eq} aria-label='Equalizer'>
    {EQ_LABELS.map((label, band) => (
      <label key={label} className={css.eqBand}>
        <input
          type='range'
          className={css.eqSlider}
          min={-8}
          max={8}
          step={1}
          value={props.gains[band] ?? 0}
          aria-label={`${label}Hz gain`}
          onChange={(event) => props.onGain(band, Number(event.target.value))}
        />
        <span className={css.eqLabel}>{label}</span>
      </label>
    ))}
  </fieldset>
)

const VolumeKnob = (props: {
  value: number
  onChange: (value: number) => void
}) => (
  <div className={css.volume}>
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
        className={css.knob}
        style={
          { '--angle': `${-135 + props.value * 270}deg` } as React.CSSProperties
        }
      >
        <span className={css.knobShaft} />
        <span className={css.knobPin} />
      </div>
    </div>
    <span className={css.volumeTag}>volume</span>
  </div>
)

export default function BubordleView() {
  const [state, setState] = useState<BubordleState | null>(null)
  const [tapeExpired, setTapeExpired] = useState(false)
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const [copied, setCopied] = useState(false)
  const [eqGains, setEqGains] = useState<number[]>(() =>
    Array(EQ_BANDS.length).fill(0),
  )
  const [volume, setVolume] = useState(0.85)
  const sfxRef = useRef<DeckSfx | null>(null)
  const countdown = useCountdown()

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

  const sfx = useCallback(() => {
    sfxRef.current ??= createDeckSfx()
    return sfxRef.current
  }, [])

  const sound = useClipAudio(daily ? clipUrl(daily.id) : '', {
    limit,
    onLimit: () => sfx().clunk(),
  })

  /* the graph exists only after the first play; re-apply settings then */
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

  /* the tape flips at local midnight; playing past it earns a reload strip */
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

  const dispatch = (event: BubordleEvent) => {
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
    if (navigator.share) {
      try {
        await navigator.share({ text: card })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }
    await navigator.clipboard.writeText(card).catch(() => undefined)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

  if (!state || !daily) {
    return (
      <main className={`${css.room} ${caveat.variable}`}>
        <p className={css.loading}>Rewinding today's tape…</p>
      </main>
    )
  }

  return (
    <main className={`${css.room} ${caveat.variable}`}>
      <h1 className='sr-only'>Bubordle, the daily mixtape guessing game</h1>

      <div className={css.machine}>
        <div className={css.handle} />

        <TunerBand
          attempts={state.guesses.length}
          analyser={sound.analyser}
          isPlaying={sound.isPlaying}
        />

        <div className={css.body}>
          <span className={css.bodyScrew} data-corner='tl' />
          <span className={css.bodyScrew} data-corner='tr' />
          <span className={css.bodyScrew} data-corner='bl' />
          <span className={css.bodyScrew} data-corner='br' />

          <Speaker live={sound.isPlaying} />

          <div className={css.center}>
            <div className={css.lcdRack}>
              <Lcd
                countdown={countdown}
                daily={daily}
                limit={limit}
                seconds={sound.seconds}
                state={state}
              />
              <span className={css.powerLed} data-on={sound.isPlaying} />
            </div>

            <div className={css.door}>
              <Cassette
                daily={daily}
                isPlaying={sound.isPlaying}
                limit={limit}
                stage={state.stage}
              />
              <div className={css.doorGlass} />
              <p className={css.doorBrand}>bubordle deluxe · daily mixtape</p>
            </div>

            <div className={css.slot}>
              <input
                className={css.slotInput}
                type='text'
                value={query}
                placeholder={playing ? 'Artist or title…' : 'Tape finished'}
                aria-label='Guess the song'
                aria-expanded={results.length > 0}
                role='combobox'
                aria-controls='bubordle-results'
                autoComplete='off'
                spellCheck={false}
                disabled={!playing}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setCursor(0)
                }}
                onKeyDown={onSearchKeyDown}
              />
              {results.length > 0 && (
                <div
                  className={css.results}
                  id='bubordle-results'
                  role='listbox'
                >
                  {results.map((song, index) => (
                    <button
                      key={song.id}
                      type='button'
                      role='option'
                      aria-selected={index === cursor}
                      className={css.result}
                      data-cursor={index === cursor}
                      onMouseEnter={() => setCursor(index)}
                      onClick={() => onGuess(song)}
                    >
                      <span className={css.resultTitle}>{song.title}</span>
                      <span className={css.resultArtist}>{song.artist}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className={css.consoleRow}>
              <div className={css.tray}>
                <button
                  type='button'
                  className={css.key}
                  data-pressed={sound.isPlaying}
                  onClick={togglePlay}
                  disabled={!sound.isReady}
                >
                  <span className={css.keyGlyph}>▶</span>
                  <span className={css.keyName}>play</span>
                </button>
                <button type='button' className={css.key} onClick={onStop}>
                  <span className={css.keyGlyph}>■</span>
                  <span className={css.keyName}>stop</span>
                </button>
                <button
                  type='button'
                  className={css.key}
                  onClick={onSkip}
                  disabled={!playing}
                >
                  <span className={css.keyGlyph}>▶▶</span>
                  <span className={css.keyName}>
                    {skipSecondsGain(state) > 0
                      ? `skip +${skipSecondsGain(state)}s`
                      : 'skip'}
                  </span>
                </button>
                <button
                  type='button'
                  className={`${css.key} ${css.keyRec}`}
                  onClick={onShare}
                  disabled={playing}
                >
                  <span className={css.keyGlyph}>●</span>
                  <span className={css.keyName}>
                    {copied ? 'copied.' : 'rec·share'}
                  </span>
                </button>
              </div>
              <VolumeKnob value={volume} onChange={onVolume} />
            </div>

            <EqBank gains={eqGains} onGain={onEqGain} />

            {tapeExpired && (
              <button
                type='button'
                className={css.newTape}
                onClick={() => location.reload()}
              >
                ● new tape ready · press to load
              </button>
            )}
          </div>

          <Speaker live={sound.isPlaying} />

          <PostIt guesses={state.guesses} stage={state.stage} typed={query} />

          <p className={css.badge}>
            240w<span className={css.badgeSmall}>total mixtape power</span>
          </p>
        </div>
      </div>
    </main>
  )
}
