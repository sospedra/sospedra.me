import assert from 'node:assert/strict'
import test from 'node:test'
import {
  INITIAL_PLAYBACK,
  localDeckIndex,
  type PlaybackState,
  reducePlayback,
} from './playback-state.ts'

const onSoundCloud: PlaybackState = {
  index: 2,
  localIndex: 4,
  source: 'soundcloud',
}

test('the bundled playlist arms the local deck only when it is empty', () => {
  assert.deepEqual(
    reducePlayback(INITIAL_PLAYBACK, { type: 'bundled-ready' }),
    {
      index: 0,
      source: 'local',
    },
  )

  const local: PlaybackState = { index: 3, source: 'local' }
  assert.equal(reducePlayback(local, { type: 'bundled-ready' }), local)

  const unparked: PlaybackState = {
    index: 1,
    localIndex: -1,
    source: 'soundcloud',
  }
  assert.deepEqual(reducePlayback(unparked, { type: 'bundled-ready' }), {
    index: 1,
    localIndex: 0,
    source: 'soundcloud',
  })
  assert.equal(
    reducePlayback(onSoundCloud, { type: 'bundled-ready' }),
    onSoundCloud,
  )
})

test('play-local activates the local deck and dedupes repeats', () => {
  assert.deepEqual(
    reducePlayback(INITIAL_PLAYBACK, { index: 2, type: 'play-local' }),
    { index: 2, source: 'local' },
  )
  assert.deepEqual(
    reducePlayback(onSoundCloud, { index: 1, type: 'play-local' }),
    {
      index: 1,
      source: 'local',
    },
  )

  const local: PlaybackState = { index: 2, source: 'local' }
  assert.equal(reducePlayback(local, { index: 2, type: 'play-local' }), local)
})

test('switching to soundcloud parks the local deck for resume', () => {
  const local: PlaybackState = { index: 3, source: 'local' }
  assert.deepEqual(
    reducePlayback(local, { index: 1, type: 'select-soundcloud' }),
    {
      index: 1,
      localIndex: 3,
      source: 'soundcloud',
    },
  )
  assert.deepEqual(
    reducePlayback(INITIAL_PLAYBACK, { index: 0, type: 'select-soundcloud' }),
    { index: 0, localIndex: -1, source: 'soundcloud' },
  )
  assert.deepEqual(reducePlayback(onSoundCloud, { type: 'load-soundcloud' }), {
    index: 0,
    localIndex: 4,
    source: 'soundcloud',
  })
})

test('widget index syncs apply only while soundcloud is the source', () => {
  assert.deepEqual(
    reducePlayback(onSoundCloud, { index: 5, type: 'sync-soundcloud' }),
    {
      index: 5,
      localIndex: 4,
      source: 'soundcloud',
    },
  )
  assert.equal(
    reducePlayback(onSoundCloud, { index: 2, type: 'sync-soundcloud' }),
    onSoundCloud,
  )

  const local: PlaybackState = { index: 3, source: 'local' }
  assert.equal(
    reducePlayback(local, { index: 5, type: 'sync-soundcloud' }),
    local,
  )
  assert.equal(
    reducePlayback(INITIAL_PLAYBACK, { index: 5, type: 'sync-soundcloud' }),
    INITIAL_PLAYBACK,
  )
})

test('localDeckIndex reads the armed or parked local track', () => {
  assert.equal(localDeckIndex(INITIAL_PLAYBACK), -1)
  assert.equal(localDeckIndex({ index: 3, source: 'local' }), 3)
  assert.equal(localDeckIndex(onSoundCloud), 4)
})
