import assert from 'node:assert/strict'
import test from 'node:test'
import { parseBundledPlaylist } from './bundled-playlist.ts'

const track = {
  artist: 'Test Artist',
  durationMs: 123_456,
  fileUrl: '/music/bonfire/test-track.mp3',
  id: 42,
  sourceUrl: 'https://soundcloud.com/test-artist/test-track',
  title: 'Test Track',
}

test('parses a top-level bundled playlist array', () => {
  assert.deepEqual(parseBundledPlaylist([track]), [
    {
      album: '',
      artist: 'Test Artist',
      duration: 123_456,
      id: 'bundled:42',
      kind: 'local',
      sourceUrl: 'https://soundcloud.com/test-artist/test-track',
      src: '/music/bonfire/test-track.mp3',
      title: 'Test Track',
      type: 'MP3',
    },
  ])
})

test('parses a playlist object containing tracks', () => {
  assert.equal(
    parseBundledPlaylist({ tracks: [track] })[0]?.title,
    'Test Track',
  )
})

test('rejects malformed and duplicate tracks', () => {
  assert.throws(
    () => parseBundledPlaylist({ tracks: [{ ...track, durationMs: -1 }] }),
    /invalid durationMs/,
  )
  assert.throws(
    () => parseBundledPlaylist({ tracks: [track, track] }),
    /repeats track id/,
  )
})
