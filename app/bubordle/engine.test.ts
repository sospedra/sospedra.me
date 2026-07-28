import assert from 'node:assert/strict'
import test from 'node:test'
import {
  dayNumber,
  initialState,
  matchesSongQuery,
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

test('dayNumber counts local days from the epoch', () => {
  assert.equal(dayNumber(new Date(2026, 6, 28, 0, 0, 1)), 0)
  assert.equal(dayNumber(new Date(2026, 6, 28, 23, 59)), 0)
  assert.equal(dayNumber(new Date(2026, 6, 29, 3)), 1)
  assert.equal(dayNumber(new Date(2026, 7, 28)), 31)
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
    'BUBORDLE #12 📼\n⬛👩‍🎤🟩⬜⬜⬜\n3/6 · sospedra.me/bubordle',
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
  assert.equal(shareCard(state).split('\n')[2], 'X/6 · sospedra.me/bubordle')
})

test('matchesSongQuery ignores case and diacritics', () => {
  const rosalia = song({ id: 'x', artist: 'ROSALÍA', title: 'Malamente' })

  assert.equal(matchesSongQuery(rosalia, 'rosalia'), true)
  assert.equal(matchesSongQuery(rosalia, 'MALAMÉNTE'), true)
  assert.equal(matchesSongQuery(rosalia, 'quevedo'), false)
})
