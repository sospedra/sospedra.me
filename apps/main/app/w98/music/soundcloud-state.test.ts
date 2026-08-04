import assert from 'node:assert/strict'
import test from 'node:test'
import {
  INITIAL_SOUNDCLOUD,
  reduceSoundCloud,
  type SoundCloudEvent,
  type SoundCloudState,
} from './soundcloud-state.ts'

const fold = (events: SoundCloudEvent[], from = INITIAL_SOUNDCLOUD) =>
  events.reduce(reduceSoundCloud, from)

const sounds = [
  { duration: 1000, id: 1, title: 'One' },
  { duration: 2000, id: 2, title: 'Two' },
]

test('starts loading and settles to ready', () => {
  assert.deepEqual(INITIAL_SOUNDCLOUD.status, { phase: 'loading' })
  assert.deepEqual(fold([{ type: 'ready' }]).status, { phase: 'ready' })
})

test('play and pause move between playing and ready', () => {
  const playing = fold([{ type: 'ready' }, { type: 'play' }])
  assert.deepEqual(playing.status, { phase: 'playing' })
  assert.deepEqual(reduceSoundCloud(playing, { type: 'pause' }).status, {
    phase: 'ready',
  })
})

test('pause outside playing changes nothing', () => {
  const loading = INITIAL_SOUNDCLOUD
  assert.equal(reduceSoundCloud(loading, { type: 'pause' }), loading)
  const failed = fold([{ message: 'down', type: 'error' }])
  assert.equal(reduceSoundCloud(failed, { type: 'pause' }), failed)
})

test('a late ready echo never demotes playing', () => {
  const playing = fold([{ type: 'ready' }, { type: 'play' }])
  assert.equal(reduceSoundCloud(playing, { type: 'ready' }), playing)
})

test('finish parks position at the duration and returns to ready', () => {
  const finished = fold([
    { type: 'ready' },
    {
      currentIndex: 0,
      currentSound: sounds[0],
      duration: 1000,
      type: 'sound-sync',
    },
    { type: 'play' },
    { position: 400, type: 'progress' },
    { type: 'finish' },
  ])
  assert.deepEqual(finished.status, { phase: 'ready' })
  assert.equal(finished.position, 1000)
})

test('error wins from any phase and timeout only from loading', () => {
  const failed = fold([{ type: 'ready' }, { message: 'down', type: 'error' }])
  assert.deepEqual(failed.status, { message: 'down', phase: 'error' })

  const timedOut = fold([{ message: 'slow', type: 'timeout' }])
  assert.deepEqual(timedOut.status, { message: 'slow', phase: 'error' })

  const ready = fold([{ type: 'ready' }])
  assert.equal(
    reduceSoundCloud(ready, { message: 'slow', type: 'timeout' }),
    ready,
  )
  const playing = fold([{ type: 'ready' }, { type: 'play' }])
  assert.equal(
    reduceSoundCloud(playing, { message: 'slow', type: 'timeout' }),
    playing,
  )
})

test('load-start resets every field back to the initial state', () => {
  const reloaded = fold([
    { type: 'ready' },
    { sounds, type: 'playlist-sync' },
    { type: 'play' },
    { position: 900, type: 'progress' },
    { type: 'load-start' },
  ])
  assert.deepEqual(reloaded, INITIAL_SOUNDCLOUD)
})

test('sound-sync merges the sound and resets position on index change', () => {
  const synced = fold([
    { type: 'ready' },
    { sounds, type: 'playlist-sync' },
    { position: 500, type: 'progress' },
    {
      currentIndex: 0,
      currentSound: { ...sounds[0], title: 'One (full)' },
      duration: 1200,
      type: 'sound-sync',
    },
  ])
  assert.equal(synced.position, 500)
  assert.equal(synced.duration, 1200)
  assert.equal(synced.sounds[0]?.title, 'One (full)')

  const advanced = reduceSoundCloud(synced, {
    currentIndex: 1,
    currentSound: sounds[1],
    duration: 2000,
    type: 'sound-sync',
  })
  assert.equal(advanced.position, 0)
  assert.equal(advanced.currentIndex, 1)
})

test('select-track picks known sound data and clears an error', () => {
  const base = fold([{ type: 'ready' }, { sounds, type: 'playlist-sync' }])
  const selected = reduceSoundCloud(base, { index: 1, type: 'select-track' })
  assert.equal(selected.currentIndex, 1)
  assert.equal(selected.currentSound, sounds[1])
  assert.equal(selected.duration, 2000)
  assert.equal(selected.position, 0)
  assert.deepEqual(selected.status, { phase: 'ready' })

  const failed: SoundCloudState = {
    ...base,
    status: { message: 'down', phase: 'error' },
  }
  assert.deepEqual(
    reduceSoundCloud(failed, { index: 0, type: 'select-track' }).status,
    { phase: 'loading' },
  )
})

test('select-track keeps playing while the widget skips', () => {
  const playing = fold([
    { type: 'ready' },
    { sounds, type: 'playlist-sync' },
    { type: 'play' },
  ])
  assert.deepEqual(
    reduceSoundCloud(playing, { index: 1, type: 'select-track' }).status,
    { phase: 'playing' },
  )
})
