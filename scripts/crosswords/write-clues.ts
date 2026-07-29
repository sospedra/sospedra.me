import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/* Clue writer: one codex exec call per edition, strict JSON out, gated in
   code. Editions that fail gates keep no clues; the UI falls back to
   progress masks and the publish validator holds them back. */

const CHALLENGE_DIR = 'content/crosswords/challenges'
const CLUE_MAX_LENGTH = 90

const args = process.argv.slice(2)
const argValue = (flag: string) => {
  const index = args.indexOf(flag)
  return index >= 0 ? args[index + 1] : undefined
}
const limit = Number(argValue('--limit') ?? '9999')

type Direction = 'across' | 'down'
type ClueBook = Record<Direction, Record<string, string>>

const answersOf = (solution: string[]): Record<Direction, string[]> => {
  const across: string[] = []
  const down: string[] = []
  const collect = (line: string, sink: string[]) => {
    for (const run of line.split('#')) if (run.length >= 3) sink.push(run)
  }
  for (const row of solution) collect(row, across)
  for (let c = 0; c < solution[0].length; c += 1) {
    collect(solution.map((row) => row[c]).join(''), down)
  }
  return { across, down }
}

const cluePrompt = (answers: Record<Direction, string[]>) => `
You are a crossword clue writer for a daily 13x13 American-style puzzle of
mid-week difficulty. Write one clue per answer.

Style rules:
- Short and idiomatic, 60 characters or fewer where possible, 90 hard max.
- Never include the answer word, or any inflection of it, inside its clue.
- Fill-in-the-blank clues use ___ (three underscores).
- Signal abbreviations ("briefly", "for short", or "Abbr.").
- Proper nouns get clued as who or what they are.
- No two answers may share the same clue text.
- Question-mark wordplay clues: at most three per puzzle.

Return ONLY a JSON object, no prose, exactly this shape:
{"across": {"ANSWER": "clue", ...}, "down": {"ANSWER": "clue", ...}}

Across answers: ${answers.across.join(', ')}
Down answers: ${answers.down.join(', ')}
`

const extractJson = (raw: string): ClueBook | null => {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    return JSON.parse(raw.slice(start, end + 1)) as ClueBook
  } catch {
    return null
  }
}

const gateFailures = (
  answers: Record<Direction, string[]>,
  clues: ClueBook,
) => {
  const failures: string[] = []
  const seen = new Map<string, string>()
  for (const direction of ['across', 'down'] as const) {
    for (const answer of answers[direction]) {
      const clue = clues[direction]?.[answer]
      if (!clue) {
        failures.push(`missing clue for ${answer}`)
        continue
      }
      if (clue.length > CLUE_MAX_LENGTH) failures.push(`too long: ${answer}`)

      // Whole words only: "ARGentina" may clue ARG, "___ mater" may not
      // clue ALMA. The prefix guard catches simple inflections of longer
      // answers (ALMA in "almas").
      const clueWords = clue.toUpperCase().split(/[^A-Z]+/)
      const wholeWord = clueWords.includes(answer)
      const inflected =
        answer.length >= 4 &&
        clueWords.some((word) => word !== '' && word.startsWith(answer))
      if (wholeWord || inflected) {
        failures.push(`answer inside clue: ${answer}`)
      }
      const duplicate = seen.get(clue.toLowerCase())
      if (duplicate && duplicate !== answer) {
        failures.push(`duplicate clue: ${answer} and ${duplicate}`)
      }
      seen.set(clue.toLowerCase(), answer)
    }
  }
  return failures
}

const askCodex = (prompt: string) =>
  execFileSync('codex', ['exec', '--skip-git-repo-check', prompt], {
    encoding: 'utf8',
    timeout: 300_000,
    maxBuffer: 4_000_000,
  })

const clueEdition = (file: string) => {
  const path = join(CHALLENGE_DIR, file)
  const edition = JSON.parse(readFileSync(path, 'utf8'))
  if (edition.puzzles.en.clues) return 'has-clues'

  const answers = answersOf(edition.puzzles.en.solution)
  const attempt = () => extractJson(askCodex(cluePrompt(answers)))

  const first = attempt()
  const book =
    first && gateFailures(answers, first).length === 0 ? first : attempt()
  if (!book) {
    console.error(`${file}: codex returned no parseable JSON twice`)
    return 'failed'
  }
  const failures = gateFailures(answers, book)
  if (failures.length > 0) {
    console.error(`${file}: gates failed: ${failures.slice(0, 4).join(' | ')}`)
    return 'failed'
  }

  edition.puzzles.en.clues = book
  writeFileSync(path, `${JSON.stringify(edition, null, 1)}\n`)
  return 'written'
}

const files = readdirSync(CHALLENGE_DIR).filter((f) => f.endsWith('.json'))
let written = 0
let failed = 0
for (const file of files.sort()) {
  if (written >= limit) break
  const outcome = clueEdition(file)
  if (outcome === 'written') {
    written += 1
    console.log(`${file}: clues written (${written})`)
  }
  if (outcome === 'failed') failed += 1
}
console.log(`clue pass complete: ${written} written, ${failed} failed`)
