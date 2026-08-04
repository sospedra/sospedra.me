'use client'

import { Caveat, Share_Tech_Mono, VT323 } from 'next/font/google'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useDailyCountdown } from 'services/daily-countdown'
import { useGameInput } from 'services/hotkeys'
import { shareHandled, shareText } from 'services/share'
import { readLocalJson, writeLocalJson } from 'services/storage'
import { useSystem } from 'services/system'
import { useViewportHeightVar } from 'services/viewport'
import * as z from 'zod/mini'
import { Ansaphone } from './ansaphone'
import { clipUrl } from './blob-assets'
import css from './boombox.module.css'
import { BoomboxChassis } from './boombox-chassis'
import { createDeckSfx, type DeckSfx } from './deck-sfx'
import {
  type BoomboxEvent,
  type BoomboxState,
  CLIP_SECONDS,
  dayNumber,
  FULL_UNLOCK,
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
import pen from './guess-line.module.css'
import songsJson from './songs.json'
import { SCORE_LABEL } from './tracklist-card'
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
const STORAGE_KEY = '@@boombox/state-v1'
const MAX_RESULTS = 5
const DOOR_CLOSE_DELAY_MS = 1400
const COPIED_RESET_MS = 2000

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

/* rew steps through the unlock ladder like cd track-back: mid-segment
   jumps to the segment start, a boundary jumps to the one before */
const previousWaypoint = (seconds: number) => {
  const stops = [0, ...UNLOCKS].filter((stop) => stop < seconds)
  return stops[stops.length - 1] ?? 0
}

export default function BoomboxView() {
  const [session, setSession] = useState<
    { status: 'loading' } | { status: 'ready'; state: BoomboxState }
  >({ status: 'loading' })

  useGameInput()
  useViewportHeightVar('--boombox-viewport-height')

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
  const mobilePointerInsideRef = useRef(false)
  const mobilePointerResetRef = useRef(0)
  /* the site's dailies count to utc midnight; this tape flips at 02:00 on
     spain's wall clock, so the lcd counts to the engine's own flip instant */
  const countdown = useDailyCountdown(nextFlipAt)
  const doorOpen = useDoorGreeting()

  useEffect(() => {
    const resetMobilePointer = () => {
      window.clearTimeout(mobilePointerResetRef.current)
      mobilePointerResetRef.current = window.setTimeout(() => {
        mobilePointerInsideRef.current = false
      }, 0)
    }
    window.addEventListener('pointerup', resetMobilePointer, true)
    window.addEventListener('pointercancel', resetMobilePointer, true)
    return () => {
      window.clearTimeout(mobilePointerResetRef.current)
      window.removeEventListener('pointerup', resetMobilePointer, true)
      window.removeEventListener('pointercancel', resetMobilePointer, true)
    }
  }, [])
  const { notify } = useSystem()

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
    const landed = next.guesses[state.guesses.length]
    if (landed) notify(SCORE_LABEL[landed.score])
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
    notify('Result copied to the clipboard')
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
     ids keep the combobox wiring valid while css shows a single surface */
  const guessInput = (resultsId: string, desk: boolean) => (
    <input
      className={pen.noteInput}
      type='text'
      value={query}
      placeholder='artist or title…'
      aria-label='Guess the song'
      aria-expanded={results.length > 0}
      role='combobox'
      aria-controls={results.length > 0 ? resultsId : undefined}
      aria-autocomplete='list'
      aria-activedescendant={
        results.length > 0 ? `${resultsId}-${cursor}` : undefined
      }
      autoComplete='off'
      spellCheck={false}
      onFocus={() => {
        if (!desk) setMobileEntryOpen(true)
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
        className={pen.searchDropdown}
        id={resultsId}
        role='listbox'
        /* picking a result must not blur the pen: blur would drop the
           machine mid-tap and move the row under the finger */
        onMouseDown={(event) => event.preventDefault()}
      >
        {results.map((song, index) => (
          <button
            key={song.id}
            id={`${resultsId}-${index}`}
            type='button'
            role='option'
            tabIndex={-1}
            aria-selected={index === cursor}
            className={pen.songRow}
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

      <BoomboxChassis
        copied={copied}
        countdown={countdown}
        daily={daily}
        doorOpen={doorOpen}
        eqGains={eqGains}
        guessDropdown={guessDropdown}
        guessInput={guessInput}
        limit={limit}
        playing={playing}
        sfx={sfx}
        sound={sound}
        state={state}
        tapeExpired={tapeExpired}
        tapeSpan={tapeSpan}
        volume={volume}
        onEqGain={onEqGain}
        onRewind={onRewind}
        onShare={onShare}
        onSkip={onSkip}
        onStop={onStop}
        onVolume={onVolume}
        togglePlay={togglePlay}
      />

      <Ansaphone
        copied={copied}
        countdown={countdown}
        daily={daily}
        guessDropdown={guessDropdown}
        guessInput={guessInput}
        limit={limit}
        mobileEntryOpen={mobileEntryOpen}
        mobilePointerInsideRef={mobilePointerInsideRef}
        playing={playing}
        setMobileEntryOpen={setMobileEntryOpen}
        sound={sound}
        state={state}
        tapeSpan={tapeSpan}
        onRewind={onRewind}
        onShare={onShare}
        onSkip={onSkip}
        onStop={onStop}
        togglePlay={togglePlay}
      />
    </main>
  )
}
