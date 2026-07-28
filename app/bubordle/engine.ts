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

export type BubordleState = {
  day: number
  guesses: Guess[]
  stage: Stage
}

export type BubordleEvent =
  | { type: 'guess'; candidate: Song }
  | { type: 'skip' }

export const MAX_GUESSES = 6
/* Heardle's unlock ladder: seconds audible after n failed attempts */
export const UNLOCKS = [1, 2, 4, 7, 11, 16] as const
export const CLIP_SECONDS = 30
/* first tape spins on launch day; local midnight so the tape flips with the player's clock */
const EPOCH = new Date(2026, 6, 28)
const DAY_MS = 86_400_000

const localMidnight = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate())

export const dayNumber = (now: Date) =>
  Math.round((localMidnight(now).getTime() - EPOCH.getTime()) / DAY_MS)

export const songForDay = (songs: Song[], day: number): Song => {
  const index = ((day % songs.length) + songs.length) % songs.length
  return songs[index] as Song
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

export const initialState = (day: number): BubordleState => ({
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
  state: BubordleState,
  event: BubordleEvent,
  daily: Song,
): BubordleState => {
  if (state.stage !== 'play') return state

  const score =
    event.type === 'skip' ? 'skip' : scoreGuess(daily, event.candidate)
  const guess =
    event.type === 'skip' ? SKIP_GUESS : guessOf(event.candidate, score)
  const guesses = [...state.guesses, guess]

  return { ...state, guesses, stage: stageAfter(guesses, score) }
}

export const unlockedSeconds = (state: BubordleState): number => {
  if (state.stage !== 'play') return CLIP_SECONDS
  return UNLOCKS[state.guesses.length] ?? UNLOCKS[UNLOCKS.length - 1] ?? 16
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

export const shareCard = (state: BubordleState): string => {
  const symbols = state.guesses.map((guess) => SHARE_SYMBOLS[guess.score])
  const row = [...symbols, ...Array(MAX_GUESSES - symbols.length).fill('⬜')]
  const result = state.stage === 'won' ? `${state.guesses.length}/6` : 'X/6'

  return [
    `BUBORDLE #${state.day + 1} 📼`,
    row.join(''),
    `${result} · sospedra.me/bubordle`,
  ].join('\n')
}
