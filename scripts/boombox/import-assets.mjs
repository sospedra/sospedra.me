/**
 * One-shot migration for /boombox assets.
 *
 * Reads a local checkout of github.com/sospedra/buborrio (branch `boombox`),
 * writes the shuffled song index to app/boombox/songs.json and uploads every
 * clip and cover to the `boombox` Vercel Blob store.
 *
 * Usage:
 *   node --env-file=.env.local scripts/boombox/import-assets.mjs <buborrio-checkout>
 */
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { exit } from 'node:process'
import { put } from '@vercel/blob'

const SHUFFLE_SEED = 19850701
const UPLOAD_BATCH = 8
const ONE_YEAR_SECONDS = 31536000
const SONGS_OUT = 'app/boombox/songs.json'

const source = process.argv[2]
if (!source) {
  console.error('Usage: import-assets.mjs <path-to-buborrio-checkout>')
  exit(1)
}
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('BLOB_READ_WRITE_TOKEN missing. Run with --env-file=.env.local')
  exit(1)
}

/* source db.json is alphabetical by filename; a seeded shuffle keeps the
 * daily rotation deterministic while breaking same-artist runs */
const mulberry32 = (seed) => {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const seededShuffle = (items, seed) => {
  const random = mulberry32(seed)
  const shuffled = [...items]
  for (let index = shuffled.length - 1; index > 0; index--) {
    const target = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]]
  }
  return shuffled
}

const trimSong = ({ album, artist, genre, id, title, year }) => ({
  album,
  artist,
  genre,
  id,
  title,
  year,
})

const uploadFile = async ({ localPath, pathname, contentType }) => {
  const body = await readFile(localPath)
  await put(pathname, body, {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: ONE_YEAR_SECONDS,
    contentType,
  })
}

const uploadWithRetry = async (file) => {
  try {
    await uploadFile(file)
    return { file, ok: true }
  } catch {
    return uploadFile(file)
      .then(() => ({ file, ok: true }))
      .catch((error) => ({ error, file, ok: false }))
  }
}

const chunk = (items, size) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, index * size + size),
  )

const db = JSON.parse(
  await readFile(join(source, 'public/boombox/db.json'), 'utf8'),
)
const songs = seededShuffle(db, SHUFFLE_SEED).map(trimSong)
await writeFile(SONGS_OUT, `${JSON.stringify(songs)}\n`)
console.log(`Wrote ${songs.length} songs to ${SONGS_OUT}`)

const files = db.flatMap(({ id }) => [
  {
    contentType: 'audio/mpeg',
    localPath: join(source, `public/boombox/clips/${id}.mp3`),
    pathname: `boombox/clips/${id}.mp3`,
  },
  {
    contentType: 'image/jpeg',
    localPath: join(source, `public/boombox/covers/${id}.jpg`),
    pathname: `boombox/covers/${id}.jpg`,
  },
])

const failures = []
let uploaded = 0
for (const batch of chunk(files, UPLOAD_BATCH)) {
  const results = await Promise.all(batch.map(uploadWithRetry))
  failures.push(...results.filter((result) => !result.ok))
  uploaded += results.filter((result) => result.ok).length
  console.log(`Uploaded ${uploaded}/${files.length}`)
}

if (failures.length > 0) {
  for (const { file, error } of failures) {
    console.error(`FAILED ${file.pathname}: ${error?.message}`)
  }
  exit(1)
}
console.log('Upload complete')
