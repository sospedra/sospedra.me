/* usage: songs.ts <add|check|remove|reshuffle>; docs in app/boombox/README.md */
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, extname, join } from 'node:path'
import { argv, env, exit } from 'node:process'
import { promisify } from 'node:util'
import { del, list, put } from '@vercel/blob'
import { chunk } from 'es-toolkit'
import sharp from 'sharp'
import {
  CLIP_SECONDS,
  dayNumber,
  type Song,
  songForDay,
} from '../../app/boombox/engine.ts'

/* the original 372-song order came from seededShuffle(alphabetical, 19850701) */
const HISTORICAL_SEED = 19850701
const SONGS_PATH = 'app/boombox/songs.json'
const BLOB_PREFIX = 'boombox'
const COVER_PX = 600
const CLIP_BITRATE = '128k'
const UPLOAD_BATCH = 8
const ONE_YEAR_SECONDS = 31536000
const ROTATION_PREVIEW_ROWS = 10
const MAX_BLOB_PAGES = 20
const TSV_COLUMNS = [
  'file',
  'start',
  'artist',
  'title',
  'album',
  'year',
  'genre',
  'cover',
] as const

type TsvRow = Record<(typeof TSV_COLUMNS)[number], string>

const run = promisify(execFile)

const fail = (message: string): never => {
  console.error(message)
  return exit(1)
}

const readSongs = async (): Promise<Song[]> =>
  JSON.parse(await readFile(SONGS_PATH, 'utf8'))

const writeSongs = async (songs: Song[]) => {
  await writeFile(SONGS_PATH, `${JSON.stringify(songs)}\n`)
  console.log(`${SONGS_PATH}: ${songs.length} songs`)
}

const songId = (artist: string, title: string) =>
  createHash('md5').update(`${artist}|${title}`).digest('hex')

const identity = (song: Pick<Song, 'artist' | 'title'>) =>
  `${song.artist}|${song.title}`.toLowerCase()

const clipPath = (id: string) => `${BLOB_PREFIX}/clips/${id}.mp3`
const coverPath = (id: string) => `${BLOB_PREFIX}/covers/${id}.jpg`

const parseStart = (value: string): number => {
  const parts = value.split(':').map(Number)
  if (parts.some(Number.isNaN)) return fail(`Bad start offset: ${value}`)
  if (parts.length === 1) return parts[0] as number
  if (parts.length === 2)
    return (parts[0] as number) * 60 + (parts[1] as number)
  return fail(`Bad start offset: ${value}`)
}

const mulberry32 = (seed: number) => {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const seededShuffle = <T>(items: T[], seed: number): T[] => {
  const random = mulberry32(seed)
  const shuffled = [...items]
  for (let index = shuffled.length - 1; index > 0; index--) {
    const target = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[target]] = [
      shuffled[target] as T,
      shuffled[index] as T,
    ]
  }
  return shuffled
}

const reportRotationShift = (before: Song[], after: Song[]) => {
  const today = dayNumber(new Date())
  if (today < 0) {
    console.log('Rotation has not started. No day moves.')
    return
  }
  const moved = []
  for (let day = 0; day <= today; day++) {
    const was = songForDay(before, day)
    const now = songForDay(after, day)
    if (was.id !== now.id) moved.push({ day, was, now })
  }
  if (moved.length === 0) {
    console.log(`No played day moves. Today is day ${today}.`)
    return
  }
  console.log(`${moved.length} of ${today + 1} played days move:`)
  for (const { day, was, now } of moved.slice(0, ROTATION_PREVIEW_ROWS)) {
    console.log(
      `  day ${day}: ${was.artist} - ${was.title}  ->  ${now.artist} - ${now.title}`,
    )
  }
  if (moved.length > ROTATION_PREVIEW_ROWS) {
    console.log(`  ...and ${moved.length - ROTATION_PREVIEW_ROWS} more`)
  }
}

const requireToken = () => {
  if (!env.BLOB_READ_WRITE_TOKEN)
    fail('BLOB_READ_WRITE_TOKEN missing. Run with --env-file=.env.local')
}

const requireYes = (flags: Set<string>) => {
  if (!flags.has('--yes')) fail('This reorders the rotation. Re-run with --yes')
}

const upload = async (pathname: string, body: Buffer, contentType: string) => {
  await put(pathname, body, {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: ONE_YEAR_SECONDS,
    contentType,
  })
}

const parseTsv = (text: string): TsvRow[] => {
  const lines = text.split('\n').filter((line) => line.trim() !== '')
  const header = lines.shift()
  if (!header)
    return fail(`songs.tsv is empty. Header: ${TSV_COLUMNS.join(' ')}`)
  const columns = header.split('\t').map((name) => name.trim())
  const missing = TSV_COLUMNS.filter((name) => !columns.includes(name))
  if (missing.length > 0)
    return fail(`songs.tsv missing columns: ${missing.join(', ')}`)
  return lines.map((line) => {
    const cells = line.split('\t')
    const row = Object.fromEntries(
      columns.map((name, index) => [name, (cells[index] ?? '').trim()]),
    )
    return row as TsvRow
  })
}

const probe = async (file: string) => {
  const { stdout } = await run('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration:format_tags=artist,title,album,date,genre',
    '-of',
    'json',
    file,
  ])
  const { duration, tags } = JSON.parse(stdout).format ?? {}
  return {
    duration: Number(duration),
    tags: Object.fromEntries(
      Object.entries(tags ?? {}).map(([key, value]) => [
        key.toLowerCase(),
        String(value),
      ]),
    ) as Record<string, string>,
  }
}

const cutClip = async (source: string, start: number, target: string) => {
  await run('ffmpeg', [
    '-v',
    'error',
    '-y',
    '-ss',
    String(start),
    '-t',
    String(CLIP_SECONDS),
    '-i',
    source,
    '-c:a',
    'libmp3lame',
    '-b:a',
    CLIP_BITRATE,
    '-ar',
    '44100',
    '-ac',
    '2',
    target,
  ])
}

const resolveSong = async (row: TsvRow, folder: string): Promise<Song> => {
  const { duration, tags } = await probe(join(folder, row.file))
  const start = parseStart(row.start)
  if (start + CLIP_SECONDS > duration)
    fail(
      `${row.file}: start ${row.start} leaves ${(duration - start).toFixed(1)}s, needs ${CLIP_SECONDS}s`,
    )
  const artist = row.artist || tags.artist || ''
  const title = row.title || tags.title || ''
  if (!artist || !title) fail(`${row.file}: no artist or title in row or ID3`)
  const year = Number(row.year || (tags.date ?? '').slice(0, 4))
  if (!Number.isInteger(year)) fail(`${row.file}: no usable year`)
  return {
    album: row.album || tags.album || '',
    artist,
    genre: row.genre || tags.genre || '',
    id: songId(artist, title),
    title,
    year,
  }
}

type Assets = { clip: Buffer; cover: Buffer }

const buildAssets = async (
  row: TsvRow,
  song: Song,
  folder: string,
): Promise<Assets> => {
  const scratch = await mkdtemp(join(tmpdir(), 'boombox-'))
  const clipFile = join(scratch, `${song.id}.mp3`)
  await cutClip(join(folder, row.file), parseStart(row.start), clipFile)
  const coverName = row.cover || `${basename(row.file, extname(row.file))}.jpg`
  const cover = await sharp(join(folder, coverName))
    .resize(COVER_PX, COVER_PX, { fit: 'cover' })
    .jpeg({ quality: 82 })
    .toBuffer()
  const clip = await readFile(clipFile)
  await rm(scratch, { recursive: true, force: true })
  return { clip, cover }
}

const preview = async (folder: string, song: Song, assets: Assets) => {
  const directory = join(folder, 'preview')
  await mkdir(directory, { recursive: true })
  const stem = join(directory, `${song.artist} - ${song.title}`)
  await writeFile(`${stem}.mp3`, assets.clip)
  await writeFile(`${stem}.jpg`, assets.cover)
  return `${stem}.mp3`
}

const add = async (args: string[], flags: Set<string>) => {
  const dryRun = flags.has('--dry-run')
  if (!dryRun) requireToken()
  const folder = args[0] ?? fail('Usage: songs.ts add <folder>')
  const rows = parseTsv(await readFile(join(folder, 'songs.tsv'), 'utf8'))
  const songs = await readSongs()
  const known = new Map(songs.map((song) => [identity(song), song]))
  const seen = new Set<string>()
  const incoming = []
  for (const row of rows) {
    const fresh = await resolveSong(row, folder)
    const key = identity(fresh)
    if (seen.has(key)) fail(`songs.tsv lists ${key} twice`)
    seen.add(key)
    const clash = known.get(key)
    if (clash && !flags.has('--replace'))
      fail(`${fresh.artist} - ${fresh.title} already exists. Use --replace`)
    /* the first 372 ids came from the old source and follow no rule, so a
       replacement keeps the stored id to hold its blob path and rotation slot */
    const song = clash ? { ...fresh, id: clash.id } : fresh
    incoming.push({ row, song, replaces: Boolean(clash) })
  }
  for (const batch of chunk(incoming, UPLOAD_BATCH)) {
    await Promise.all(
      batch.map(async ({ row, song }) => {
        const { clip, cover } = await buildAssets(row, song, folder)
        if (dryRun) {
          const previewPath = await preview(folder, song, { clip, cover })
          console.log(
            `${song.id}  ${clip.length}B clip, ${cover.length}B cover -> ${previewPath}`,
          )
          return
        }
        await upload(clipPath(song.id), clip, 'audio/mpeg')
        await upload(coverPath(song.id), cover, 'image/jpeg')
        console.log(`${song.id}  ${song.artist} - ${song.title}`)
      }),
    )
  }
  const replaced = incoming.filter((item) => item.replaces)
  const appended = incoming.filter((item) => !item.replaces)
  if (dryRun) {
    console.log(
      `dry run: would append ${appended.length}, replace ${replaced.length}. Listen to the clips, then re-run without --dry-run.`,
    )
    return
  }
  const next = songs.map(
    (song) => replaced.find((item) => item.song.id === song.id)?.song ?? song,
  )
  await writeSongs([...next, ...appended.map((item) => item.song)])
  console.log(`appended ${appended.length}, replaced ${replaced.length}`)
}

const remove = async (args: string[], flags: Set<string>) => {
  requireToken()
  if (args.length === 0) fail('Usage: songs.ts remove <id>... --yes')
  const songs = await readSongs()
  const doomed = songs.filter((song) => args.includes(song.id))
  const unknown = args.filter((id) => !songs.some((song) => song.id === id))
  if (unknown.length > 0) fail(`Unknown ids: ${unknown.join(', ')}`)
  const next = songs.filter((song) => !args.includes(song.id))
  reportRotationShift(songs, next)
  requireYes(flags)
  await del(doomed.flatMap((song) => [clipPath(song.id), coverPath(song.id)]))
  await writeSongs(next)
  console.log(`removed ${doomed.length}`)
}

const reshuffle = async (args: string[], flags: Set<string>) => {
  const seedIndex = args.indexOf('--seed')
  const seed = Number(args[seedIndex + 1])
  if (seedIndex === -1 || !Number.isInteger(seed))
    fail(
      `Usage: songs.ts reshuffle --seed <n> --yes (history used ${HISTORICAL_SEED})`,
    )
  const songs = await readSongs()
  const next = seededShuffle(songs, seed)
  reportRotationShift(songs, next)
  requireYes(flags)
  await writeSongs(next)
}

const check = async () => {
  requireToken()
  const songs = await readSongs()
  const stored = new Set<string>()
  let cursor: string | undefined
  for (let page = 0; page < MAX_BLOB_PAGES; page++) {
    const batch = await list({ prefix: `${BLOB_PREFIX}/`, cursor, limit: 1000 })
    for (const blob of batch.blobs) stored.add(blob.pathname)
    if (!batch.hasMore) break
    cursor = batch.cursor
    if (page === MAX_BLOB_PAGES - 1) {
      fail(`Blob listing did not finish within ${MAX_BLOB_PAGES} pages.`)
    }
  }
  const missing = songs.flatMap((song) =>
    [clipPath(song.id), coverPath(song.id)].filter((path) => !stored.has(path)),
  )
  const wanted = new Set(
    songs.flatMap((song) => [clipPath(song.id), coverPath(song.id)]),
  )
  const orphans = [...stored].filter((path) => !wanted.has(path))
  console.log(`${songs.length} songs, ${stored.size} blobs`)
  for (const path of missing) console.log(`MISSING ${path}`)
  for (const path of orphans) console.log(`ORPHAN  ${path}`)
  if (missing.length > 0) exit(1)
}

const COMMANDS = {
  add,
  check,
  remove,
  reshuffle,
} satisfies Record<
  string,
  (args: string[], flags: Set<string>) => Promise<void>
>

const [command, ...rest] = argv.slice(2)
const handler = COMMANDS[command as keyof typeof COMMANDS]
if (!handler) fail(`Usage: songs.ts <${Object.keys(COMMANDS).join('|')}>`)
const flags = new Set(rest.filter((arg) => arg.startsWith('--')))
await handler(rest, flags)
