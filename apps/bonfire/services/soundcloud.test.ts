import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parsePlaylistID, playlistEmbedUrl } from './soundcloud.ts'

test('parsePlaylistID keeps a bare id', () => {
  assert.equal(parsePlaylistID('1201400941'), '1201400941')
})

test('parsePlaylistID extracts the id from an embed code', () => {
  const embed =
    '<iframe src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/playlists/1198136710&color=%230c1c04&auto_play=false"></iframe>'
  assert.equal(parsePlaylistID(embed), '1198136710')
})

test('parsePlaylistID returns null for an http string without a playlist', () => {
  assert.equal(parsePlaylistID('https://soundcloud.com/sospedra'), null)
})

test('playlistEmbedUrl points the widget at the playlist', () => {
  const url = playlistEmbedUrl('42')
  assert.ok(url.includes('api.soundcloud.com/playlists/42'))
  assert.ok(url.includes('auto_play=false'))
})
