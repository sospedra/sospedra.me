import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import test from 'node:test'

type BonfireTrack = {
  fileUrl: string
  id: string
  order: number
}

type BonfirePlaylist = {
  tracks: BonfireTrack[]
}

const manifestUrl = new URL(
  '../../public/music/bonfire/playlist.json',
  import.meta.url,
)

test('ships the complete ordered Bonfire playlist with nonempty audio files', async () => {
  const manifest = JSON.parse(
    await readFile(manifestUrl, 'utf8'),
  ) as BonfirePlaylist
  const { tracks } = manifest

  assert.equal(tracks.length, 30)
  assert.deepEqual(
    tracks.map((track) => track.order),
    Array.from({ length: 30 }, (_, index) => index + 1),
  )
  assert.equal(new Set(tracks.map((track) => track.id)).size, tracks.length)
  assert.equal(
    new Set(tracks.map((track) => track.fileUrl)).size,
    tracks.length,
  )

  await Promise.all(
    tracks.map(async (track) => {
      const order = String(track.order).padStart(2, '0')
      assert.equal(track.fileUrl, `/music/bonfire/${order}-${track.id}.mp3`)

      const assetUrl = new URL(`../../public${track.fileUrl}`, import.meta.url)
      const asset = await stat(assetUrl)
      assert.ok(asset.isFile(), `${track.fileUrl} must be a file`)
      assert.ok(asset.size > 0, `${track.fileUrl} must not be empty`)
    }),
  )
})
