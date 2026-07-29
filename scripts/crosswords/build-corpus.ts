import { readFileSync, writeFileSync } from 'node:fs'

/* Source: spread the word(list), spreadthewordlist.com, CC BY-NC-SA 4.0.
   Format is WORD;SCORE with the maintainers' own quality scale where 50 is
   the publishable floor. English only for now. */
const RAW = 'work/raw-data/spreadthewordlist.dict'
const OUT = 'data/crosswords/generated/corpus-en.json'
export const CORPUS_REVISION = 'crossword-corpus-stw-2026-07-29.1'

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
    !BANNED.has(grid) &&
    !byGrid.has(grid)
  if (!usable) continue
  byGrid.set(grid, { grid, length: grid.length, score })
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
