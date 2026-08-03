import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { groupBy, isNotNil, mapValues } from 'es-toolkit'
import { ISO_DATE } from '../../app/crosswords/crossword-data.ts'

/* Replays the USA Today archive (xd files, Universal Uclick copyright, see
   sources.lock.json) as daily editions. Weekday-locked, newest-first: our
   Monday serves the k-th newest archive Monday. Deterministic, no AI. */

const ARCHIVE_DIR = 'repo/crosswords/puzzles'
const CHALLENGE_DIR = 'repo/crosswords/challenges'
const REPLAY_EPOCH = '2026-07-29'

const args = process.argv.slice(2)
const argValue = (flag: string) => {
  const index = args.indexOf(flag)
  return index >= 0 ? args[index + 1] : undefined
}
const from = argValue('--from')
const days = Number(argValue('--days') ?? '14')
const argsValid =
  from !== undefined && ISO_DATE.test(from) && Number.isInteger(days)
if (!argsValid) {
  console.error('usage: generate-replay.ts --from YYYY-MM-DD --days N')
  process.exit(1)
}

type ArchivePuzzle = {
  date: string
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
      /* crossword-data keys clues by answer; a repeated answer would make
         two entries silently share one clue, so reject the puzzle */
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
  if (!fullyClued(gridRows, { across, down })) return null

  return {
    date: header.Date,
    grid: gridRows,
    clues: { across, down },
  }
}

// Every grid word needs its clue or the edition would render blanks.
const fullyClued = (
  gridRows: string[],
  clues: ArchivePuzzle['clues'],
): boolean => {
  const gridWords = (rows: string[]) =>
    rows.flatMap((row) => row.split('#').filter((run) => run.length >= 3))
  const columns = Array.from({ length: gridRows[0]?.length ?? 0 }, (_, c) =>
    gridRows.map((row) => row[c]).join(''),
  )
  return (
    gridWords(gridRows).every((word) => word in clues.across) &&
    gridWords(columns).every((word) => word in clues.down)
  )
}

const archivePaths = () =>
  readdirSync(ARCHIVE_DIR)
    .sort()
    .flatMap((year) => {
      const yearDir = join(ARCHIVE_DIR, year)
      try {
        return readdirSync(yearDir)
          .filter((name) => name.endsWith('.xd'))
          .sort()
          .map((name) => join(yearDir, name))
      } catch {
        return []
      }
    })

const loadPools = () => {
  const parsed = archivePaths().map((path) =>
    parseXd(readFileSync(path, 'utf8')),
  )
  const puzzles = parsed.filter(isNotNil)
  const byWeekday = groupBy(puzzles, (puzzle) =>
    new Date(`${puzzle.date}T00:00:00Z`).getUTCDay(),
  )
  const pools = mapValues(byWeekday, (pool) =>
    pool.toSorted((a, b) => b.date.localeCompare(a.date)),
  )
  return { pools, rejected: parsed.length - puzzles.length }
}

const { pools, rejected } = loadPools()
console.log(
  `pools: ${Object.entries(pools)
    .map(([day, pool]) => `${'SMTWTFS'[Number(day)]}=${pool.length}`)
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
  const pool = pools[weekday] ?? []
  if (pool.length === 0) throw new Error(`empty pool for weekday ${weekday}`)
  const puzzle = pool[weekdayCountSinceEpoch(date) % pool.length]

  // Bare render minimum; provenance lives in repo/crosswords, the mapping
  // back to an archive date is the replay formula itself.
  const edition = {
    publicationDate: date,
    puzzles: {
      en: {
        solution: puzzle.grid,
        clues: puzzle.clues,
      },
    },
  }
  writeFileSync(target, `${JSON.stringify(edition, null, 2)}\n`)
  written += 1
}
console.log(`replay: ${written} editions written from ${from} for ${days} days`)
