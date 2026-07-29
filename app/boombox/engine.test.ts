import assert from 'node:assert/strict'
import test from 'node:test'
import {
  type BoomboxState,
  dayNumber,
  initialState,
  MAX_GUESSES,
  matchesSongQuery,
  nextFlipAt,
  reduce,
  type Song,
  scoreGuess,
  shareCard,
  songForDay,
  unlockedSeconds,
} from './engine.ts'

const song = (patch: Partial<Song>): Song => ({
  album: 'Hunting High and Low',
  artist: 'a-ha',
  genre: 'Pop',
  id: 'take-on-me',
  title: 'Take on Me',
  year: 1985,
  ...patch,
})

test('dayNumber counts utc days from the epoch', () => {
  assert.equal(dayNumber(new Date('2026-07-28T00:00:01.000Z')), 0)
  assert.equal(dayNumber(new Date('2026-07-28T23:59:00.000Z')), 0)
  assert.equal(dayNumber(new Date('2026-07-29T03:00:00.000Z')), 1)
  assert.equal(dayNumber(new Date('2026-08-28T12:00:00.000Z')), 31)
})

test('songForDay wraps the catalogue in both directions', () => {
  const songs = [song({ id: 'a' }), song({ id: 'b' }), song({ id: 'c' })]

  assert.equal(songForDay(songs, 0).id, 'a')
  assert.equal(songForDay(songs, 4).id, 'b')
  assert.equal(songForDay(songs, -1).id, 'c')
})

test('scoreGuess ranks partial matches artist-first', () => {
  const daily = song({})

  assert.equal(scoreGuess(daily, song({})), 'hit')
  assert.equal(
    scoreGuess(
      daily,
      song({ id: 'x', artist: 'a-ha/Röyksopp', album: 'Other' }),
    ),
    'artist',
  )
  assert.equal(
    scoreGuess(daily, song({ id: 'x', artist: 'Queen', year: 1991 })),
    'album',
  )
  assert.equal(
    scoreGuess(
      daily,
      song({ id: 'x', artist: 'Queen', album: 'Innuendo', year: 1985 }),
    ),
    'year',
  )
  assert.equal(
    scoreGuess(
      daily,
      song({ id: 'x', artist: 'Queen', album: 'Innuendo', year: 1989 }),
    ),
    'decade',
  )
  assert.equal(
    scoreGuess(
      daily,
      song({ id: 'x', artist: 'Queen', album: 'Innuendo', year: 1991 }),
    ),
    'miss',
  )
})

test('scoreGuess never matches on empty album or artist fields', () => {
  const daily = song({ album: '', artist: '' })
  const candidate = song({ id: 'x', album: '', artist: '', year: 2011 })

  assert.equal(scoreGuess(daily, candidate), 'miss')
})

test('reduce plays a full losing game and then freezes', () => {
  const daily = song({})
  const wrong = song({
    id: 'x',
    artist: 'Queen',
    album: 'Innuendo',
    year: 2011,
  })
  let state = initialState(3)

  for (let attempt = 0; attempt < 6; attempt++) {
    state = reduce(state, { type: 'guess', candidate: wrong }, daily)
  }
  assert.equal(state.stage, 'lost')
  assert.equal(state.guesses.length, 6)

  const frozen = reduce(state, { type: 'skip' }, daily)
  assert.deepEqual(frozen, state)
})

test('reduce wins on the exact song and records skips', () => {
  const daily = song({})
  let state = initialState(0)

  state = reduce(state, { type: 'skip' }, daily)
  assert.equal(state.guesses[0]?.label, 'Skipped')

  state = reduce(state, { type: 'guess', candidate: daily }, daily)
  assert.equal(state.stage, 'won')
  assert.equal(state.guesses.length, 2)
})

test('unlockedSeconds follows the ladder and opens fully on reveal', () => {
  const daily = song({})
  const wrong = song({
    id: 'x',
    artist: 'Queen',
    album: 'Innuendo',
    year: 2011,
  })
  let state = initialState(0)

  const ladder = [1, 2, 4, 7, 11, 16]
  for (const expected of ladder) {
    assert.equal(unlockedSeconds(state), expected)
    state = reduce(state, { type: 'guess', candidate: wrong }, daily)
  }
  assert.equal(state.stage, 'lost')
  assert.equal(unlockedSeconds(state), 30)
})

test('shareCard prints the heardle-style result', () => {
  const daily = song({})
  const artistMatch = song({ id: 'x', artist: 'a-ha', album: 'Other' })
  let state = initialState(11)

  state = reduce(state, { type: 'skip' }, daily)
  state = reduce(state, { type: 'guess', candidate: artistMatch }, daily)
  state = reduce(state, { type: 'guess', candidate: daily }, daily)

  assert.equal(
    shareCard(state),
    'BOOMBOX #12 📼\n⬛👩‍🎤🟩⬜⬜⬜\n3/6 · sospedra.me/boombox',
  )
})

test('shareCard marks a loss as X/6', () => {
  const daily = song({})
  const wrong = song({
    id: 'x',
    artist: 'Queen',
    album: 'Innuendo',
    year: 2011,
  })
  let state = initialState(0)

  for (let attempt = 0; attempt < 6; attempt++) {
    state = reduce(state, { type: 'guess', candidate: wrong }, daily)
  }
  assert.equal(shareCard(state).split('\n')[2], 'X/6 · sospedra.me/boombox')
})

test('matchesSongQuery ignores case and diacritics', () => {
  const rosalia = song({ id: 'x', artist: 'ROSALÍA', title: 'Malamente' })

  assert.equal(matchesSongQuery(rosalia, 'rosalia'), true)
  assert.equal(matchesSongQuery(rosalia, 'MALAMÉNTE'), true)
  assert.equal(matchesSongQuery(rosalia, 'quevedo'), false)
})

test('initialState starts a fresh day mid-play with no guesses', () => {
  assert.deepEqual(initialState(7), { day: 7, guesses: [], stage: 'play' })
})

test('dayNumber is negative before the epoch', () => {
  assert.equal(dayNumber(new Date('2026-07-27T12:00:00.000Z')), -1)
  assert.equal(dayNumber(new Date('2026-06-28T00:00:00.000Z')), -30)
})

test('the tape flips at 02:00 on spain summer time', () => {
  /* 01:59:59 cest on jul 30 is still day 1; 02:00 cest opens day 2 */
  assert.equal(dayNumber(new Date('2026-07-29T23:59:59.000Z')), 1)
  assert.equal(dayNumber(new Date('2026-07-30T00:00:00.000Z')), 2)
})

test('the tape flips at 02:00 on spain winter time', () => {
  /* jan 15 2027 is 171 days after the epoch; cet is utc+1 */
  assert.equal(dayNumber(new Date('2027-01-15T00:59:59.000Z')), 170)
  assert.equal(dayNumber(new Date('2027-01-15T01:00:00.000Z')), 171)
})

test('nextFlipAt lands on the next 02:00 spain instant, any season', () => {
  const summer = nextFlipAt(new Date('2026-07-29T12:00:00.000Z'))
  const winter = nextFlipAt(new Date('2027-01-15T12:00:00.000Z'))

  const closeTo = (actual: Date, expectedIso: string) =>
    Math.abs(actual.getTime() - new Date(expectedIso).getTime()) <= 2000
  assert.ok(closeTo(summer, '2026-07-30T00:00:00.000Z'))
  assert.ok(closeTo(winter, '2027-01-16T01:00:00.000Z'))
})

test('nextFlipAt always points into the following day', () => {
  const now = new Date('2026-07-29T23:59:00.000Z')
  const flip = nextFlipAt(now)

  assert.ok(flip.getTime() > now.getTime())
  assert.equal(dayNumber(flip), dayNumber(now) + 1)
})

test('songForDay wraps deep negatives and exact multiples', () => {
  const songs = [song({ id: 'a' }), song({ id: 'b' }), song({ id: 'c' })]

  assert.equal(songForDay(songs, 6).id, 'a')
  assert.equal(songForDay(songs, -4).id, 'c')
  assert.equal(songForDay(songs, -6).id, 'a')
})

test('scoreGuess shares artists across split credits in both directions', () => {
  const daily = song({ artist: 'a-ha/Röyksopp' })

  assert.equal(
    scoreGuess(daily, song({ id: 'x', artist: 'Röyksopp' })),
    'artist',
  )
  assert.equal(
    scoreGuess(
      song({ artist: 'Röyksopp' }),
      song({ id: 'x', artist: 'a-ha/Röyksopp' }),
    ),
    'artist',
  )
})

test('scoreGuess prefers artist over an album match', () => {
  const daily = song({})
  const sameArtistSameAlbum = song({ id: 'x' })

  assert.equal(scoreGuess(daily, sameArtistSameAlbum), 'artist')
})

test('scoreGuess treats decades as calendar decades', () => {
  const daily = song({ year: 1990 })
  const eighties = song({
    id: 'x',
    artist: 'Queen',
    album: 'Innuendo',
    year: 1989,
  })
  const nineties = song({
    id: 'y',
    artist: 'Queen',
    album: 'Innuendo',
    year: 1999,
  })

  assert.equal(scoreGuess(daily, eighties), 'miss')
  assert.equal(scoreGuess(daily, nineties), 'decade')
})

test('reduce wins on the final attempt instead of losing', () => {
  const daily = song({})
  const wrong = song({
    id: 'x',
    artist: 'Queen',
    album: 'Innuendo',
    year: 2011,
  })
  let state = initialState(0)

  for (let attempt = 0; attempt < MAX_GUESSES - 1; attempt++) {
    state = reduce(state, { type: 'guess', candidate: wrong }, daily)
  }
  assert.equal(state.stage, 'play')

  state = reduce(state, { type: 'guess', candidate: daily }, daily)
  assert.equal(state.stage, 'won')
  assert.equal(state.guesses.length, MAX_GUESSES)
})

test('reduce freezes after a win', () => {
  const daily = song({})
  let state = initialState(0)

  state = reduce(state, { type: 'guess', candidate: daily }, daily)
  assert.equal(state.stage, 'won')

  const frozen = reduce(state, { type: 'guess', candidate: daily }, daily)
  assert.deepEqual(frozen, state)
})

test('reduce records the guess label, score and song id', () => {
  const daily = song({})
  const wrong = song({
    id: 'bohemian',
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    album: 'A Night at the Opera',
    year: 2011,
  })

  const state = reduce(
    initialState(0),
    { type: 'guess', candidate: wrong },
    daily,
  )

  assert.deepEqual(state.guesses[0], {
    label: 'Bohemian Rhapsody · Queen',
    score: 'miss',
    songId: 'bohemian',
  })
})

test('reduce never mutates the state it was given', () => {
  const daily = song({})
  const before = initialState(0)
  const snapshot = structuredClone(before)

  reduce(before, { type: 'skip' }, daily)

  assert.deepEqual(before, snapshot)
})

test('unlockedSeconds clamps past the ladder while still playing', () => {
  const overflow: BoomboxState = {
    day: 0,
    guesses: Array.from({ length: 7 }, () => ({
      label: 'Skipped',
      score: 'skip' as const,
      songId: null,
    })),
    stage: 'play',
  }

  assert.equal(unlockedSeconds(overflow), 16)
})

test('shareCard maps every partial score to its own symbol', () => {
  const daily = song({})
  const wrong = song({
    id: 'x',
    artist: 'Queen',
    album: 'Innuendo',
    year: 2011,
  })
  const albumMatch = song({ id: 'y', artist: 'Queen' })
  const yearMatch = song({ id: 'z', artist: 'Queen', album: 'Innuendo' })
  const decadeMatch = song({
    id: 'w',
    artist: 'Queen',
    album: 'Innuendo',
    year: 1989,
  })
  let state = initialState(0)

  state = reduce(state, { type: 'guess', candidate: wrong }, daily)
  state = reduce(state, { type: 'guess', candidate: albumMatch }, daily)
  state = reduce(state, { type: 'guess', candidate: yearMatch }, daily)
  state = reduce(state, { type: 'guess', candidate: decadeMatch }, daily)
  state = reduce(state, { type: 'guess', candidate: daily }, daily)

  assert.equal(shareCard(state).split('\n')[1], '❌💿📆🔟🟩⬜')
})

test('shareCard fills the whole row on a six-guess game', () => {
  const daily = song({})
  const wrong = song({
    id: 'x',
    artist: 'Queen',
    album: 'Innuendo',
    year: 2011,
  })
  let state = initialState(0)

  for (let attempt = 0; attempt < MAX_GUESSES - 1; attempt++) {
    state = reduce(state, { type: 'guess', candidate: wrong }, daily)
  }
  state = reduce(state, { type: 'guess', candidate: daily }, daily)

  assert.equal(
    shareCard(state),
    'BOOMBOX #1 📼\n❌❌❌❌❌🟩\n6/6 · sospedra.me/boombox',
  )
})

test('shareCard pads an untouched day with empty slots', () => {
  assert.equal(
    shareCard(initialState(0)),
    'BOOMBOX #1 📼\n⬜⬜⬜⬜⬜⬜\nX/6 · sospedra.me/boombox',
  )
})

test('matchesSongQuery spans the title and artist boundary', () => {
  const daily = song({})

  assert.equal(matchesSongQuery(daily, 'on me a-ha'), true)
  assert.equal(matchesSongQuery(daily, ''), true)
})
