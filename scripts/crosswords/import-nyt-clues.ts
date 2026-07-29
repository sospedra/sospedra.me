import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

/* NYT clue archive import, used under Rubén's NYT content license (see
   sources.lock.json). Emits a local lookup for generation plus committed
   usage counts for corpus scoring. The raw CSV never enters git. */

const RAW = '/Users/sospedra/Downloads/nytcrosswords.csv'
const LOOKUP_OUT = 'work/raw-data/nyt-clues.json'
const USAGE_OUT = 'data/crosswords/generated/nyt-usage.json'

/* Clues that reference their original grid or puzzle gimmick make no sense
   in ours. */
const SELF_REFERENTIAL = [
  /\d+[- ](Across|Down)/i,
  /\bthis puzzle\b/i,
  /\bstarred\b/i,
  /\bcircled\b/i,
  /\bshaded\b/i,
  /\basterisk/i,
  /\btheme\b/i,
  /\bpuzzle's\b/i,
  /^With /,
]

const GRID_WORD = /^[A-Z]{3,13}$/

const parseCsvLine = (line: string): string[] => {
  const cells: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (quoted && char === '"' && line[i + 1] === '"') {
      cell += '"'
      i += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      cells.push(cell)
      cell = ''
    } else {
      cell += char
    }
  }
  cells.push(cell)
  return cells
}

const clueVariants = new Map<string, Set<string>>()
const usage = new Map<string, number>()

const lines = readFileSync(RAW, 'utf8').split('\n')
for (const line of lines.slice(1)) {
  const [, word, clue] = parseCsvLine(line.trim())
  const answer = word?.trim().toUpperCase() ?? ''
  const text = clue?.trim() ?? ''
  if (!GRID_WORD.test(answer) || text === '') continue

  usage.set(answer, (usage.get(answer) ?? 0) + 1)
  if (text.length > 90) continue
  if (SELF_REFERENTIAL.some((pattern) => pattern.test(text))) continue
  const variants = clueVariants.get(answer) ?? new Set()
  variants.add(text)
  clueVariants.set(answer, variants)
}

writeFileSync(
  LOOKUP_OUT,
  JSON.stringify(
    Object.fromEntries(
      [...clueVariants.entries()].map(([answer, variants]) => [
        answer,
        [...variants],
      ]),
    ),
  ),
)
writeFileSync(
  USAGE_OUT,
  JSON.stringify(Object.fromEntries([...usage.entries()].sort()), null, 1),
)

const checksum = createHash('sha256').update(readFileSync(RAW)).digest('hex')
console.log('answers with usable clues:', clueVariants.size)
console.log('answers counted for scoring:', usage.size)
console.log('raw csv sha256:', checksum)
