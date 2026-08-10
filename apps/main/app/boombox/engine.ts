import { Temporal } from 'temporal-polyfill'
import { match } from 'ts-pattern'

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
export const FULL_UNLOCK = 15
/* Songless's unlock ladder: seconds audible after n failed attempts */
export const UNLOCKS = [0.1, 0.5, 2, 4, 8, FULL_UNLOCK] as const
export const CLIP_SECONDS = 30
/* first tape spun on launch day; the tape flips for everyone at the same
   instant: 02:00 on Spain's wall clock, whatever utc offset that is */
const TIME_ZONE = 'Europe/Madrid'
const EPOCH_DATE = Temporal.PlainDate.from('2026-07-28')
const FLIP_HOUR = 2

const spainClock = (now: Date) =>
  Temporal.Instant.fromEpochMilliseconds(now.getTime()).toZonedDateTimeISO(
    TIME_ZONE,
  )

export const dayNumber = (now: Date) => {
  const spain = spainClock(now)
  const calendarDays = EPOCH_DATE.until(spain.toPlainDate()).days
  return spain.hour < FLIP_HOUR ? calendarDays - 1 : calendarDays
}

export const nextFlipAt = (now: Date): Date => {
  const spain = spainClock(now)
  const flipDate =
    spain.hour < FLIP_HOUR
      ? spain.toPlainDate()
      : spain.toPlainDate().add({ days: 1 })
  const flip = flipDate.toZonedDateTime({
    timeZone: TIME_ZONE,
    plainTime: { hour: FLIP_HOUR },
  })
  return new Date(flip.epochMilliseconds)
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

  return match(event)
    .with({ type: 'guess' }, ({ candidate }) => {
      const score = scoreGuess(daily, candidate)
      const guesses = [...state.guesses, guessOf(candidate, score)]
      return { ...state, guesses, stage: stageAfter(guesses, score) }
    })
    .with({ type: 'skip' }, () => {
      const guesses = [...state.guesses, SKIP_GUESS]
      return { ...state, guesses, stage: stageAfter(guesses, 'skip') }
    })
    .exhaustive()
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
