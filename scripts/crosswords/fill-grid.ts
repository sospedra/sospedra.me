import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

type Slot = {
  id: string
  cells: number[]
  length: number
}

type Crossing = {
  slotIndex: number
  posInSelf: number
  posInOther: number
}

export const PATTERN_TEST_1 = [
  '....#....#...',
  '....#....#...',
  '....#....#...',
  '.........#...',
  '###...#......',
  '......#......',
  '....#####....',
  '......#......',
  '......#...###',
  '...#.........',
  '...#....#....',
  '...#....#....',
  '...#....#....',
] as const

const SIZE = 13
const NODE_BUDGET = 500_000

export const validatePattern = (rows: readonly string[]) => {
  const failures: string[] = []
  if (rows.length !== SIZE || rows.some((row) => row.length !== SIZE)) {
    failures.push('grid is not 13x13')
  }
  const black = (r: number, c: number) => rows[r]?.[c] === '#'
  const blackCount = rows.join('').split('#').length - 1
  if (blackCount > 42) failures.push(`too many blacks: ${blackCount}`)

  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (black(r, c) !== black(SIZE - 1 - r, SIZE - 1 - c)) {
        failures.push(`asymmetric at ${r},${c}`)
      }
    }
  }

  const runFailures = (line: string, label: string) =>
    line.split('#').some((run) => run.length === 1 || run.length === 2)
      ? [`short run in ${label}: ${line}`]
      : []
  for (const [r, row] of rows.entries()) {
    failures.push(...runFailures(row, `row ${r}`))
  }
  for (let c = 0; c < SIZE; c += 1) {
    const column = rows.map((row) => row[c]).join('')
    failures.push(...runFailures(column, `column ${c}`))
  }

  // Flood fill from the first white cell; every white cell must be reached.
  const whites = new Set<number>()
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (!black(r, c)) whites.add(r * SIZE + c)
    }
  }
  const queue = [whites.values().next().value as number]
  const seen = new Set(queue)
  while (queue.length > 0) {
    const index = queue.pop() as number
    const r = Math.floor(index / SIZE)
    const c = index % SIZE
    const neighbors = [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ]
    for (const [nr, nc] of neighbors) {
      const nIndex = nr * SIZE + nc
      const inBounds = nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE
      if (inBounds && whites.has(nIndex) && !seen.has(nIndex)) {
        seen.add(nIndex)
        queue.push(nIndex)
      }
    }
  }
  if (seen.size !== whites.size) failures.push('white region is disconnected')
  return failures
}

export const extractSlots = (rows: readonly string[]): Slot[] => {
  const slots: Slot[] = []
  const addRuns = (
    line: string,
    cellAt: (offset: number) => number,
    label: string,
  ) => {
    let start = 0
    for (const run of line.split('#')) {
      if (run.length >= 3) {
        slots.push({
          id: `${label}${start}`,
          cells: Array.from({ length: run.length }, (_, i) =>
            cellAt(start + i),
          ),
          length: run.length,
        })
      }
      start += run.length + 1
    }
  }
  for (const [r, row] of rows.entries()) {
    addRuns(row, (c) => r * SIZE + c, `A${r}-`)
  }
  for (let c = 0; c < SIZE; c += 1) {
    const column = rows.map((row) => row[c]).join('')
    addRuns(column, (r) => r * SIZE + c, `D${c}-`)
  }
  return slots
}

const mulberry32 = (seedBytes: Buffer) => {
  let a = seedBytes.readUInt32BE(0)
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type FillResult =
  | { ok: true; grid: string[]; answers: Map<string, string>; nodes: number }
  | { ok: false; failedSlot: string; nodes: number }

export const fillPattern = (
  rows: readonly string[],
  words: { grid: string; score: number }[],
  seed: string,
  nodeBudget = NODE_BUDGET,
): FillResult => {
  const slots = extractSlots(rows)
  const random = mulberry32(createHash('sha256').update(seed).digest())

  const byLength = new Map<number, string[]>()
  for (const word of words) {
    const bucket = byLength.get(word.grid.length) ?? []
    bucket.push(word.grid)
    byLength.set(word.grid.length, bucket)
  }
  const scoreOf = new Map(words.map((word) => [word.grid, word.score]))

  // Crossing index: for each slot, the slots sharing a cell with it.
  const cellOwners = new Map<number, { slot: number; pos: number }[]>()
  for (const [slotIndex, slot] of slots.entries()) {
    for (const [pos, cell] of slot.cells.entries()) {
      const owners = cellOwners.get(cell) ?? []
      owners.push({ slot: slotIndex, pos })
      cellOwners.set(cell, owners)
    }
  }
  const crossings: Crossing[][] = slots.map((slot, slotIndex) =>
    slot.cells.flatMap((cell, posInSelf) =>
      (cellOwners.get(cell) ?? [])
        .filter((owner) => owner.slot !== slotIndex)
        .map((owner) => ({
          slotIndex: owner.slot,
          posInSelf,
          posInOther: owner.pos,
        })),
    ),
  )

  const grid: string[] = Array.from({ length: SIZE * SIZE }, () => '')
  const assigned: (string | null)[] = slots.map(() => null)
  const used = new Set<string>()
  let nodes = 0

  // Position-letter index: candidates start from the smallest matching set
  // instead of scanning the whole length bucket.
  const posIndex = new Map<string, string[]>()
  for (const [length, bucket] of byLength) {
    for (const word of bucket) {
      for (let pos = 0; pos < length; pos += 1) {
        const key = `${length}:${pos}:${word[pos]}`
        const set = posIndex.get(key) ?? []
        set.push(word)
        posIndex.set(key, set)
      }
    }
  }

  const candidatesFor = (slotIndex: number) => {
    const slot = slots[slotIndex]
    const fixed = slot.cells
      .map((cell, pos) => [pos, grid[cell]] as const)
      .filter(([, letter]) => letter !== '')
    const pools = fixed.map(
      ([pos, letter]) => posIndex.get(`${slot.length}:${pos}:${letter}`) ?? [],
    )
    const base =
      pools.length === 0
        ? (byLength.get(slot.length) ?? [])
        : pools.reduce((a, b) => (a.length <= b.length ? a : b))
    return base.filter(
      (word) =>
        !used.has(word) && fixed.every(([pos, letter]) => word[pos] === letter),
    )
  }

  const solve = (): FillResult | null => {
    const open = assigned
      .map((value, index) => ({ value, index }))
      .filter(({ value }) => value === null)
    if (open.length === 0) {
      const answers = new Map(
        slots.map((slot, index) => [slot.id, assigned[index] as string]),
      )
      return { ok: true, grid: [...grid], answers, nodes }
    }

    const ranked = open
      .map(({ index }) => ({ index, candidates: candidatesFor(index) }))
      .sort((a, b) => a.candidates.length - b.candidates.length)
    const target = ranked[0]
    if (target.candidates.length === 0) return null

    const ordered = target.candidates
      .map((word) => ({
        word,
        rank: (scoreOf.get(word) ?? 0) + random() * 24,
      }))
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 24)

    for (const { word } of ordered) {
      nodes += 1
      if (nodes > nodeBudget)
        return { ok: false, failedSlot: slots[target.index].id, nodes }

      const slot = slots[target.index]
      const touched: number[] = []
      for (const [pos, cell] of slot.cells.entries()) {
        if (grid[cell] === '') {
          grid[cell] = word[pos]
          touched.push(cell)
        }
      }
      assigned[target.index] = word
      used.add(word)

      const crossingsAlive = crossings[target.index].every(
        (crossing) =>
          assigned[crossing.slotIndex] !== null ||
          candidatesFor(crossing.slotIndex).length > 0,
      )
      const result = crossingsAlive ? solve() : null
      if (result) return result

      assigned[target.index] = null
      used.delete(word)
      for (const cell of touched) grid[cell] = ''
    }
    return null
  }

  const outcome = solve()
  return outcome ?? { ok: false, failedSlot: 'exhausted', nodes }
}

export const renderGrid = (rows: readonly string[], grid: string[]) =>
  rows.map((row, r) =>
    [...row]
      .map((cell, c) => (cell === '#' ? '#' : grid[r * SIZE + c] || '?'))
      .join(''),
  )

const main = () => {
  const patternFailures = validatePattern(PATTERN_TEST_1)
  if (patternFailures.length > 0) {
    console.error('pattern invalid:', patternFailures)
    process.exit(1)
  }
  console.log('pattern valid, slots:', extractSlots(PATTERN_TEST_1).length)

  for (const locale of ['en', 'es'] as const) {
    const corpus = JSON.parse(
      readFileSync(`data/crosswords/generated/corpus-${locale}.json`, 'utf8'),
    ) as { revision: string; words: { grid: string; score: number }[] }

    const seed = `crossword:2026-07-29:0.1.0-test:${corpus.revision}:pattern-test.1:cw-v1:${locale}`
    const started = Date.now()
    const result = fillPattern(PATTERN_TEST_1, corpus.words, seed)
    const elapsed = Date.now() - started
    if (!result.ok) {
      console.error(
        locale,
        'FILL FAILED at',
        result.failedSlot,
        'nodes:',
        result.nodes,
      )
      process.exit(1)
    }
    console.log(locale, `filled in ${elapsed}ms, nodes: ${result.nodes}`)
    const gridRows = renderGrid(PATTERN_TEST_1, result.grid)
    console.log(gridRows.join('\n'))
    writeFileSync(
      `work/raw-data/fill-${locale}.json`,
      JSON.stringify(
        {
          seed,
          corpusRevision: corpus.revision,
          gridRows,
          answers: [...result.answers.entries()].map(([id, answer]) => ({
            id,
            answer,
          })),
        },
        null,
        1,
      ),
    )
  }
}

if (process.argv[1]?.endsWith('fill-grid.ts')) main()
