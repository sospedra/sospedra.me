import assert from 'node:assert/strict'
import test from 'node:test'
import { initialPlayback, playbackReducer } from './local-state.ts'

test('the scrub opens at the moment of maximum', () => {
  assert.equal(initialPlayback.now, null)
  assert.equal(initialPlayback.playing, false)
})

test('scrubbing pauses playback', () => {
  const playing = playbackReducer(initialPlayback, { type: 'play', from: 10 })
  assert.equal(playing.playing, true)
  const scrubbed = playbackReducer(playing, { type: 'scrub', seconds: 20 })
  assert.equal(scrubbed.playing, false)
  assert.equal(scrubbed.now, 20)
})

test('a tick outside playback is ignored', () => {
  assert.equal(
    playbackReducer(initialPlayback, { type: 'tick', seconds: 5, until: 9 }),
    initialPlayback,
  )
})

test('playback stops itself at last contact', () => {
  const playing = playbackReducer(initialPlayback, { type: 'play', from: 0 })
  const mid = playbackReducer(playing, {
    type: 'tick',
    seconds: 50,
    until: 100,
  })
  assert.equal(mid.playing, true)
  assert.equal(mid.now, 50)
  const done = playbackReducer(mid, { type: 'tick', seconds: 140, until: 100 })
  assert.equal(done.playing, false)
  assert.equal(done.now, 100)
})

test('pausing twice returns the same state', () => {
  assert.equal(
    playbackReducer(initialPlayback, { type: 'pause' }),
    initialPlayback,
  )
})

test('a new location resets the player', () => {
  const scrubbed = playbackReducer(initialPlayback, {
    type: 'scrub',
    seconds: 500,
  })
  assert.deepEqual(
    playbackReducer(scrubbed, { type: 'reset' }),
    initialPlayback,
  )
})
