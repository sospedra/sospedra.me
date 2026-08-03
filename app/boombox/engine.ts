import { DAY_MS } from '../../services/time.ts'

export type Song = {
  album: string
  artist: string
  genre: string
  id: string
  title: string
  year: number
}

export type GuessScore =
  | 'hit'
  | 'artist'
  | 'album'
  | 'year'
  | 'decade'
  | 'miss'
  | 'skip'

export type Guess = {
  label: string
  score: GuessScore
  songId: string | null
}

export type Stage = 'play' | 'won' | 'lost'

export type BoomboxState = {
  day: number
  guesses: Guess[]
  stage: Stage
}

export type BoomboxEvent = { type: 'guess'; candidate: Song } | { type: 'skip' }

export const MAX_GUESSES = 6
export const FULL_UNLOCK = 16
/* Heardle's unlock ladder: seconds audible after n failed attempts */
export const UNLOCKS = [1, 2, 4, 7, 11, FULL_UNLOCK] as const
export const CLIP_SECONDS = 30
/* first tape spun on launch day; the tape flips for everyone at the same
   instant: 02:00 on Spain's wall clock, whatever utc offset that is */
const EPOCH_UTC = Date.UTC(2026, 6, 28)
const FLIP_HOUR = 2

const SPAIN_CLOCK = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Madrid',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
})

const spainWallClock = (now: Date) => {
  const parts = Object.fromEntries(
    SPAIN_CLOCK.formatToParts(now).map((part) => [part.type, part.value]),
  )
  return {
    date: Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
    ),
    hour: Number(parts.hour),
  }
}

export const dayNumber = (now: Date) => {
  const spain = spainWallClock(now)
  const calendarDays = Math.round((spain.date - EPOCH_UTC) / DAY_MS)
  return spain.hour < FLIP_HOUR ? calendarDays - 1 : calendarDays
}

/* the exact instant the next tape loads; dayNumber is a step function of
   time, so binary-search its next step within the coming 26 hours */
export const nextFlipAt = (now: Date): Date => {
  const today = dayNumber(now)
  let lo = now.getTime()
  let hi = lo + 26 * 3_600_000

  while (hi - lo > 1000) {
    const mid = lo + Math.floor((hi - lo) / 2)
    if (dayNumber(new Date(mid)) > today) hi = mid
    else lo = mid
  }
  return new Date(Math.ceil(hi / 1000) * 1000)
}

export const songForDay = (songs: Song[], day: number): Song => {
  const index = ((day % songs.length) + songs.length) % songs.length
  const song = songs.at(index)
  if (!song) throw new Error('The song catalogue is empty.')
  return song
}

const splitArtists = (artist: string) =>
  artist.split('/').filter((name) => name !== '')

const sharesArtist = (left: string, right: string) => {
  const others = splitArtists(right)
  return splitArtists(left).some((name) => others.includes(name))
}

const decadeOf = (year: number) => Math.floor(year / 10)

export const scoreGuess = (song: Song, candidate: Song): GuessScore => {
  if (candidate.id === song.id) return 'hit'
  if (sharesArtist(song.artist, candidate.artist)) return 'artist'
  if (song.album !== '' && song.album === candidate.album) return 'album'
  if (song.year === candidate.year) return 'year'
  if (decadeOf(song.year) === decadeOf(candidate.year)) return 'decade'
  return 'miss'
}

export const initialState = (day: number): BoomboxState => ({
  day,
  guesses: [],
  stage: 'play',
})

const guessOf = (candidate: Song, score: GuessScore): Guess => ({
  label: `${candidate.title} · ${candidate.artist}`,
  score,
  songId: candidate.id,
})

const SKIP_GUESS: Guess = { label: 'Skipped', score: 'skip', songId: null }

const stageAfter = (guesses: Guess[], score: GuessScore): Stage => {
  if (score === 'hit') return 'won'
  return guesses.length >= MAX_GUESSES ? 'lost' : 'play'
}

export const reduce = (
  state: BoomboxState,
  event: BoomboxEvent,
  daily: Song,
): BoomboxState => {
  if (state.stage !== 'play') return state

  switch (event.type) {
    case 'guess': {
      const score = scoreGuess(daily, event.candidate)
      const guesses = [...state.guesses, guessOf(event.candidate, score)]
      return { ...state, guesses, stage: stageAfter(guesses, score) }
    }
    case 'skip': {
      const guesses = [...state.guesses, SKIP_GUESS]
      return { ...state, guesses, stage: stageAfter(guesses, 'skip') }
    }
  }
}

export const unlockedSeconds = (state: BoomboxState): number => {
  if (state.stage !== 'play') return CLIP_SECONDS
  return UNLOCKS[state.guesses.length] ?? FULL_UNLOCK
}

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

export const matchesSongQuery = (song: Song, query: string) =>
  normalize(`${song.title} ${song.artist}`).includes(normalize(query))

const SHARE_SYMBOLS = {
  album: '💿',
  artist: '👩‍🎤',
  decade: '🔟',
  hit: '🟩',
  miss: '❌',
  skip: '⬛',
  year: '📆',
} satisfies Record<GuessScore, string>

export const shareCard = (state: BoomboxState): string => {
  const symbols = state.guesses.map((guess) => SHARE_SYMBOLS[guess.score])
  const row = [...symbols, ...Array(MAX_GUESSES - symbols.length).fill('⬜')]
  const result = state.stage === 'won' ? `${state.guesses.length}/6` : 'X/6'

  return [
    `BOOMBOX #${state.day + 1} 📼`,
    row.join(''),
    `${result} · sospedra.me/boombox`,
  ].join('\n')
}
