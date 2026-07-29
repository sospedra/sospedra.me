import { readFileSync, writeFileSync } from 'node:fs'

/* Sources: spread the word(list) for candidate quality (score 50 floor) and
   the licensed NYT clue archive for coverage and usage counts. A word joins
   the corpus only when both agree, so every fill is fully cluable and the
   score carries 28 years of real usage gradient. */
const RAW = 'work/raw-data/spreadthewordlist.dict'
const NYT_CLUES = 'work/raw-data/nyt-clues.json'
const NYT_USAGE = 'data/crosswords/generated/nyt-usage.json'
const OUT = 'data/crosswords/generated/corpus-en.json'
export const CORPUS_REVISION = 'crossword-corpus-stw-nyt-2026-07-29.1'

const SCORE_FLOOR = 50
const GRID_WORD = /^[A-Z]{3,13}$/

const BANNED = new Set([
  'RAPE',
  'RAPED',
  'RAPES',
  'NAZI',
  'NAZIS',
  'INCEST',
  'PEDO',
  'SLAVER',
])

const cluable = new Set(
  Object.keys(JSON.parse(readFileSync(NYT_CLUES, 'utf8'))),
)
const usage = JSON.parse(readFileSync(NYT_USAGE, 'utf8')) as Record<
  string,
  number
>

const usageScore = (grid: string) =>
  Math.min(95, 30 + Math.round(12 * Math.log2((usage[grid] ?? 0) + 1)))

const lines = readFileSync(RAW, 'utf8').trim().split('\n')
const byGrid = new Map<
  string,
  { grid: string; length: number; score: number }
>()

for (const line of lines) {
  const [word, rawScore] = line.split(';')
  const grid = word?.trim() ?? ''
  const score = Number(rawScore)
  const usable =
    GRID_WORD.test(grid) &&
    Number.isFinite(score) &&
    score >= SCORE_FLOOR &&
    cluable.has(grid) &&
    !BANNED.has(grid) &&
    !byGrid.has(grid)
  if (!usable) continue
  byGrid.set(grid, { grid, length: grid.length, score: usageScore(grid) })
}

const words = [...byGrid.values()]
writeFileSync(
  OUT,
  JSON.stringify({ revision: CORPUS_REVISION, locale: 'en', words }, null, 1),
)

const buckets = Object.fromEntries(
  Array.from({ length: 11 }, (_, i) => [
    i + 3,
    words.filter((word) => word.length === i + 3).length,
  ]),
)
console.log('en total:', words.length, 'by length:', buckets)
