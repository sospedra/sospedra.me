import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { mulberry32 } from '../../lib/random.ts'
import { fillPattern, PATTERN_TEST_1, validatePattern } from './fill-grid'

const SIZE = 13
const TARGET = 16
const OUT_DIR = 'data/crosswords/editorial/patterns/13'

/* Random symmetric block placement, validated by the same gate the filler
   uses. Most candidates fail; the seed loop just keeps drawing. */
const drawCandidate = (random: () => number) => {
  const grid = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => '.'),
  )
  const blackPairs = 13 + Math.floor(random() * 4)

  for (let placed = 0; placed < blackPairs; placed += 1) {
    const r = Math.floor(random() * SIZE)
    const c = Math.floor(random() * SIZE)
    grid[r][c] = '#'
    grid[SIZE - 1 - r][SIZE - 1 - c] = '#'
  }
  return grid.map((row) => row.join(''))
}

/* Move a few symmetric black pairs of a known-good pattern; validity is far
   more likely near a valid layout than in a fresh random draw. */
const mutate = (rows: string[], random: () => number) => {
  const grid = rows.map((row) => [...row])
  const moves = 1 + Math.floor(random() * 3)
  for (let move = 0; move < moves; move += 1) {
    const blacks: [number, number][] = []
    for (let r = 0; r < SIZE; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
        if (grid[r][c] === '#') blacks.push([r, c])
      }
    }
    const [fr, fc] = blacks[Math.floor(random() * blacks.length)]
    const tr = Math.floor(random() * SIZE)
    const tc = Math.floor(random() * SIZE)
    grid[fr][fc] = '.'
    grid[SIZE - 1 - fr][SIZE - 1 - fc] = '.'
    grid[tr][tc] = '#'
    grid[SIZE - 1 - tr][SIZE - 1 - tc] = '#'
  }
  return grid.map((row) => row.join(''))
}

const loadCorpus = (locale: 'en') =>
  (
    JSON.parse(
      readFileSync(`data/crosswords/generated/corpus-${locale}.json`, 'utf8'),
    ) as { words: { grid: string; score: number }[] }
  ).words

const main = () => {
  const corpus = loadCorpus('en')

  /* Structural validity is cheap and insufficient; a pattern joins the
     library only after one proven fill. The tight budget also rejects
     patterns that would be expensive dailies. */
  const fillsEnglish = (rows: string[]) =>
    fillPattern(rows, corpus, 'feasibility:en', 120_000).ok

  const patterns = new Map<string, string[]>([
    ['pattern-13-001', [...PATTERN_TEST_1]],
  ])
  let attempts = 0
  let fillChecked = 0

  while (patterns.size < TARGET && attempts < 400_000) {
    attempts += 1
    const random = mulberry32(
      createHash('sha256')
        .update(`pattern-draw:${attempts}`)
        .digest()
        .readUInt32BE(0),
    )
    const pool = [...patterns.values()]
    const candidate =
      attempts % 3 === 0
        ? drawCandidate(random)
        : mutate(pool[Math.floor(random() * pool.length)], random)
    if (validatePattern(candidate).length > 0) continue

    const signature = candidate.join('')
    const duplicate = [...patterns.values()].some(
      (rows) => rows.join('') === signature,
    )
    if (duplicate) continue

    fillChecked += 1
    if (!fillsEnglish(candidate)) continue
    patterns.set(
      `pattern-13-${String(patterns.size + 1).padStart(3, '0')}`,
      candidate,
    )
    console.log(
      `accepted ${patterns.size}/${TARGET} (draw ${attempts}, fill-checked ${fillChecked})`,
    )
  }

  mkdirSync(OUT_DIR, { recursive: true })
  for (const [id, rows] of patterns) {
    writeFileSync(
      `${OUT_DIR}/${id}.json`,
      `${JSON.stringify({ id, size: SIZE, rows }, null, 1)}\n`,
    )
  }
  console.log(
    `wrote ${patterns.size} patterns after ${attempts} draws to ${OUT_DIR}`,
  )
}

main()
