import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'

/* Replays the USA Today archive (xd files, Universal Uclick copyright, see
   sources.lock.json) as daily editions. Weekday-locked, newest-first: our
   Monday serves the k-th newest archive Monday. Deterministic, no AI. */

const ARCHIVE_DIR = 'content/crosswords/puzzles'
const CHALLENGE_DIR = 'content/crosswords/challenges'
const REPLAY_EPOCH = '2026-07-29'
const GENERATOR_VERSION = 'replay-1.0.0'

const args = process.argv.slice(2)
const argValue = (flag: string) => {
  const index = args.indexOf(flag)
  return index >= 0 ? args[index + 1] : undefined
}
const from = argValue('--from')
const days = Number(argValue('--days') ?? '14')
if (!from || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !Number.isInteger(days)) {
  console.error('usage: generate-replay.ts --from YYYY-MM-DD --days N')
  process.exit(1)
}

type ArchivePuzzle = {
  date: string
  title: string
  author: string
  grid: string[]
  clues: { across: Record<string, string>; down: Record<string, string> }
}

const GRID_LINE = /^[A-Z#]+$/
const CLUE_LINE = /^([AD])\d+\.\s*(.*?)\s*~\s*(.+)$/

const parseXd = (text: string): ArchivePuzzle | null => {
  const header: Record<string, string> = {}
  const gridRows: string[] = []
  const across: Record<string, string> = {}
  const down: Record<string, string> = {}

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (line === '') continue
    const clue = line.match(CLUE_LINE)
    if (clue) {
      const [, direction, clueText, answer] = clue
      const side = direction === 'A' ? across : down
      const key = answer.trim().toUpperCase()
      if (key in side) return null
      side[key] = clueText
      continue
    }
    if (GRID_LINE.test(line) && line.length >= 5) {
      gridRows.push(line)
      continue
    }
    const colon = line.indexOf(':')
    if (colon > 0)
      header[line.slice(0, colon).trim()] = line.slice(colon + 1).trim()
  }

  const width = gridRows[0]?.length ?? 0
  const complete =
    gridRows.length === 15 &&
    width === 15 &&
    gridRows.every((row) => row.length === width) &&
    header.Date !== undefined
  if (!complete) return null

  // Every grid word needs its clue or the edition would render blanks.
  const gridWords = (rows: string[]) =>
    rows.flatMap((row) => row.split('#').filter((run) => run.length >= 3))
  const columns = Array.from({ length: width }, (_, c) =>
    gridRows.map((row) => row[c]).join(''),
  )
  const coveredAcross = gridWords(gridRows).every((word) => word in across)
  const coveredDown = gridWords(columns).every((word) => word in down)
  if (!coveredAcross || !coveredDown) return null

  return {
    date: header.Date,
    title: header.Title ?? 'Crossword',
    author: (header.Author ?? 'Unknown').replace(/^By /i, ''),
    grid: gridRows,
    clues: { across, down },
  }
}

const loadPools = () => {
  const pools = new Map<number, ArchivePuzzle[]>()
  let rejected = 0
  for (const year of readdirSync(ARCHIVE_DIR).sort()) {
    const yearDir = join(ARCHIVE_DIR, year)
    let names: string[] = []
    try {
      names = readdirSync(yearDir).filter((name) => name.endsWith('.xd'))
    } catch {
      continue
    }
    for (const name of names.sort()) {
      const puzzle = parseXd(readFileSync(join(yearDir, name), 'utf8'))
      if (!puzzle) {
        rejected += 1
        continue
      }
      const weekday = new Date(`${puzzle.date}T00:00:00Z`).getUTCDay()
      const pool = pools.get(weekday) ?? []
      pool.push(puzzle)
      pools.set(weekday, pool)
    }
  }
  // Newest first: replay starts from the freshest puzzles.
  for (const pool of pools.values()) {
    pool.sort((a, b) => b.date.localeCompare(a.date))
  }
  return { pools, rejected }
}

const { pools, rejected } = loadPools()
console.log(
  `pools: ${[...pools.entries()]
    .map(([day, pool]) => `${'SMTWTFS'[day]}=${pool.length}`)
    .join(' ')} (rejected ${rejected})`,
)

const isoAddDays = (iso: string, delta: number) => {
  const date = new Date(`${iso}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + delta)
  return date.toISOString().slice(0, 10)
}

const weekdayCountSinceEpoch = (iso: string) => {
  const target = Date.parse(`${iso}T00:00:00Z`)
  const epoch = Date.parse(`${REPLAY_EPOCH}T00:00:00Z`)
  const daysBetween = Math.round((target - epoch) / 86_400_000)
  return Math.floor(daysBetween / 7)
}

mkdirSync(CHALLENGE_DIR, { recursive: true })
let written = 0
for (let offset = 0; offset < days; offset += 1) {
  const date = isoAddDays(from, offset)
  const target = join(CHALLENGE_DIR, `${date}.json`)
  if (existsSync(target)) continue

  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay()
  const pool = pools.get(weekday) ?? []
  if (pool.length === 0) throw new Error(`empty pool for weekday ${weekday}`)
  const puzzle = pool[weekdayCountSinceEpoch(date) % pool.length]

  const edition = {
    schemaVersion: 2,
    id: `crossword:${date}`,
    publicationDate: date,
    generatorVersion: GENERATOR_VERSION,
    corpusRevision: 'usatoday-archive',
    patternSetVersion: 'usatoday-archive',
    rulesVersion: 'cw-v2',
    seed: `replay:${date}:${puzzle.date}`,
    source: {
      archiveDate: puzzle.date,
      author: puzzle.author,
      copyright: 'Universal Uclick / USA Today',
    },
    puzzles: {
      en: {
        title: puzzle.title,
        storyDeck: `By ${puzzle.author} · USA Today, ${puzzle.date}`,
        difficultyTier: 2,
        pattern: `usatoday:${puzzle.date}`,
        width: 15,
        height: 15,
        solution: puzzle.grid,
        clues: puzzle.clues,
      },
    },
  }
  writeFileSync(target, `${JSON.stringify(edition, null, 2)}\n`)
  written += 1
}
console.log(`replay: ${written} editions written from ${from} for ${days} days`)
