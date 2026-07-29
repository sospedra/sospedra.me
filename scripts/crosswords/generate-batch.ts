import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { fillPattern, renderGrid } from './fill-grid'

type Corpus = { revision: string; words: { grid: string; score: number }[] }

const GENERATOR_VERSION = '0.4.0'
const NYT_CLUES = 'work/raw-data/nyt-clues.json'
const RULES_VERSION = 'cw-v2'
const PATTERN_SET_VERSION = 'pattern-set-13.2'
const PATTERN_DIR = 'data/crosswords/editorial/patterns/13'
const CHALLENGE_DIR = 'content/crosswords/challenges'
const EPOCH = '2026-07-27'
const PATTERN_WINDOW = 7
const ANSWER_WINDOW_DAYS = 60
const MAX_RETRIES = 6

const args = process.argv.slice(2)
const argValue = (flag: string) => {
  const index = args.indexOf(flag)
  return index >= 0 ? args[index + 1] : undefined
}
const from = argValue('--from')
const days = Number(argValue('--days') ?? '7')
if (!from || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !Number.isInteger(days)) {
  console.error('usage: generate-batch.ts --from YYYY-MM-DD --days N')
  process.exit(1)
}

const isoAddDays = (iso: string, delta: number) => {
  const date = new Date(`${iso}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + delta)
  return date.toISOString().slice(0, 10)
}
const dayNumber = (iso: string) =>
  Math.round(
    (Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${EPOCH}T00:00:00Z`)) /
      86_400_000,
  ) + 1

const corpus: Corpus = JSON.parse(
  readFileSync('data/crosswords/generated/corpus-en.json', 'utf8'),
)

/* Licensed NYT clue variants per answer; selection is seeded, so the whole
   edition remains deterministic. */
const clueVariants = JSON.parse(readFileSync(NYT_CLUES, 'utf8')) as Record<
  string,
  string[]
>

const pickClue = (seed: string, answer: string) => {
  const variants = clueVariants[answer]
  if (!variants || variants.length === 0) {
    throw new Error(`no clue variants for ${answer}`)
  }
  const hash = createHash('sha256').update(`clue:${seed}:${answer}`).digest()
  return variants[hash.readUInt32BE(0) % variants.length]
}

const patterns = readdirSync(PATTERN_DIR)
  .filter((file) => file.endsWith('.json'))
  .sort()
  .map(
    (file) =>
      JSON.parse(readFileSync(join(PATTERN_DIR, file), 'utf8')) as {
        id: string
        rows: string[]
      },
  )

const loadHistory = () => {
  const patternByDate = new Map<string, string>()
  const answersByDate = new Map<string, string[]>()
  if (!existsSync(CHALLENGE_DIR)) return { patternByDate, answersByDate }

  for (const file of readdirSync(CHALLENGE_DIR).sort()) {
    if (!file.endsWith('.json')) continue
    const edition = JSON.parse(readFileSync(join(CHALLENGE_DIR, file), 'utf8'))
    const date = edition.publicationDate as string
    patternByDate.set(date, edition.puzzles.en.pattern)
    const rows = edition.puzzles.en.solution as string[]
    const answers: string[] = []
    const collect = (line: string) => {
      for (const run of line.split('#')) if (run.length >= 3) answers.push(run)
    }
    for (const row of rows) collect(row)
    for (let c = 0; c < rows[0].length; c += 1) {
      collect(rows.map((row) => row[c]).join(''))
    }
    answersByDate.set(date, answers)
  }
  return { patternByDate, answersByDate }
}

const history = loadHistory()

const recentAnswers = (date: string) => {
  const floor = isoAddDays(date, -ANSWER_WINDOW_DAYS)
  const recent = new Set<string>()
  for (const [seenDate, answers] of history.answersByDate) {
    if (seenDate >= floor && seenDate < date) {
      for (const answer of answers) recent.add(answer)
    }
  }
  return recent
}

const recentPatterns = (date: string) => {
  const floor = isoAddDays(date, -PATTERN_WINDOW)
  const used = new Set<string>()
  for (const [seenDate, pattern] of history.patternByDate) {
    if (seenDate >= floor && seenDate < date) used.add(pattern)
  }
  return used
}

const generateDay = (date: string) => {
  const target = join(CHALLENGE_DIR, `${date}.json`)
  if (existsSync(target)) return 'exists'

  const excluded = recentPatterns(date)
  const candidates = patterns.filter((pattern) => !excluded.has(pattern.id))
  const pool = candidates.length >= 2 ? candidates : patterns
  const recent = recentAnswers(date)
  const words = corpus.words.filter((word) => !recent.has(word.grid))

  const attemptFill = (retry: number) => {
    const pattern = pool[(dayNumber(date) + retry) % pool.length]
    const seed = `crossword:${date}:${GENERATOR_VERSION}:${corpus.revision}:${PATTERN_SET_VERSION}:${RULES_VERSION}:en:retry${retry}`
    const result = fillPattern(pattern.rows, words, seed)
    return result.ok ? { pattern, result } : null
  }

  const solved = Array.from(
    { length: MAX_RETRIES },
    (_, retry) => retry,
  ).reduce<ReturnType<typeof attemptFill>>(
    (found, retry) => found ?? attemptFill(retry),
    null,
  )
  if (!solved) throw new Error(`${date}: all retries exhausted`)

  const gridRows = renderGrid(solved.pattern.rows, solved.result.grid)
  const clueSeed = `crossword:${date}:${GENERATOR_VERSION}`
  const clues: Record<'across' | 'down', Record<string, string>> = {
    across: {},
    down: {},
  }
  for (const [slotId, answer] of solved.result.answers) {
    const side = slotId.startsWith('A') ? 'across' : 'down'
    clues[side][answer] = pickClue(clueSeed, answer)
  }

  const edition = {
    schemaVersion: 2,
    id: `crossword:${date}`,
    publicationDate: date,
    generatorVersion: GENERATOR_VERSION,
    corpusRevision: corpus.revision,
    patternSetVersion: PATTERN_SET_VERSION,
    rulesVersion: RULES_VERSION,
    seed: `crossword:${date}:${GENERATOR_VERSION}`,
    puzzles: {
      en: {
        title: `Daily Nº ${dayNumber(date)}`,
        storyDeck: 'Common words only. The crossings do the talking.',
        difficultyTier: 2,
        pattern: solved.pattern.id,
        width: 13,
        height: 13,
        solution: gridRows,
        clues,
      },
    },
  }
  mkdirSync(CHALLENGE_DIR, { recursive: true })
  writeFileSync(target, `${JSON.stringify(edition, null, 1)}\n`)

  history.patternByDate.set(date, solved.pattern.id)
  history.answersByDate.set(date, [...solved.result.answers.values()])
  return 'written'
}

const started = Date.now()
let written = 0
for (let offset = 0; offset < days; offset += 1) {
  const date = isoAddDays(from, offset)
  const outcome = generateDay(date)
  if (outcome === 'written') written += 1
  if (offset % 25 === 24 || offset === days - 1) {
    const elapsed = Math.round((Date.now() - started) / 1000)
    console.log(
      `${date} done (${offset + 1}/${days}, ${written} new, ${elapsed}s)`,
    )
  }
}
console.log(`batch complete: ${written} editions written`)
