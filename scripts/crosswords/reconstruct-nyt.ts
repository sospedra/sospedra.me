import { readFileSync } from 'node:fs'

/* Rebuilds an NYT grid from its CSV rows alone. The CSV lists a date's
   answers in clue order (all Across ascending, then all Down ascending),
   and crossword numbering is a pure function of the black-square layout,
   so a depth-first search over row compositions, pruned by symmetry and
   by down-word letter matches, recovers the original grid. Rebus dates
   and glitched exports find no solution and report as failures. */

const RAW = '/Users/sospedra/Downloads/nytcrosswords.csv'

type Puzzle = {
  date: string
  size: number
  grid: string[]
  across: { answer: string; clue: string }[]
  down: { answer: string; clue: string }[]
}

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

// Quote-aware record split: quoted clue fields may contain newlines, so the
// file cannot be split on raw line breaks.
const csvRecords = (text: string): string[] => {
  const records: string[] = []
  let record = ''
  let quoted = false
  for (const char of text) {
    if (char === '"') quoted = !quoted
    if (char === '\n' && !quoted) {
      if (record !== '') records.push(record)
      record = ''
      continue
    }
    record += char
  }
  if (record !== '') records.push(record)
  return records
}

export const loadArchive = () => {
  const perDate = new Map<string, { answer: string; clue: string }[]>()
  for (const record of csvRecords(readFileSync(RAW, 'utf8')).slice(1)) {
    const [date, word, clue] = parseCsvLine(record.trim())
    const answer = word?.trim().toUpperCase() ?? ''
    if (!date || !/^[A-Z]{2,}$/.test(answer)) continue
    const rows = perDate.get(date) ?? []
    rows.push({ answer, clue: clue?.trim() ?? '' })
    perDate.set(date, rows)
  }
  return perDate
}

type Run = { word: string; start: number; length: number }

export const reconstruct = (
  date: string,
  entries: { answer: string; clue: string }[],
  width: number,
  height: number,
): Puzzle | null => {
  const words = entries.map((entry) => entry.answer)
  const total = words.length

  const solveWithSplit = (
    acrossCount: number,
    downFirst: boolean,
  ): Puzzle | null => {
    const across = downFirst
      ? words.slice(words.length - acrossCount)
      : words.slice(0, acrossCount)
    const down = downFirst
      ? words.slice(0, words.length - acrossCount)
      : words.slice(acrossCount)
    const grid: string[][] = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => '#'),
    )
    const downBindings: {
      word: string
      column: number
      startRow: number
    }[] = []
    let acrossCursor = 0
    let downCursor = 0
    let debugMaxRow = -1

    const rowRunOptions = (startIndex: number): Run[][] => {
      const options: Run[][] = []
      const walk = (cursor: number, cell: number, runs: Run[]) => {
        for (let gap = cell === 0 ? 0 : 1; cell + gap <= width; gap += 1) {
          const start = cell + gap
          if (start === width) {
            if (cursor - startIndex === runs.length) options.push([...runs])
            break
          }
          const word = across[cursor]
          if (!word || word.length < 3 || start + word.length > width) continue
          runs.push({ word, start, length: word.length })
          walk(cursor + 1, start + word.length, runs)
          runs.pop()
        }
        if (cell === width) options.push([...runs])
      }
      walk(startIndex, 0, [])
      return options
    }

    const applyRow = (row: number, runs: Run[]) => {
      for (const run of runs) {
        for (let i = 0; i < run.length; i += 1) {
          grid[row][run.start + i] = run.word[i]
        }
      }
    }

    const clearRow = (row: number) => {
      for (let c = 0; c < width; c += 1) grid[row][c] = '#'
    }

    const blacksOf = (runs: Run[]): boolean[] => {
      const black = Array.from({ length: width }, () => true)
      for (const run of runs) {
        for (let i = 0; i < run.length; i += 1) black[run.start + i] = false
      }
      return black
    }

    // Down bookkeeping: bind new vertical runs in row-major order, verify
    // letters as rows land, require a black right below each finished run.
    // Callers snapshot and restore bindings around a failed attempt.
    const verifyDowns = (row: number, rowBlacks: boolean[]): boolean => {
      for (let c = 0; c < width; c += 1) {
        const isWhite = !rowBlacks[c]
        const aboveBlack = row === 0 || grid[row - 1][c] === '#'
        if (isWhite && aboveBlack) {
          const word = down[downCursor]
          if (!word) return false
          if (word[0] !== grid[row][c]) return false
          if (row + word.length > height) return false
          downBindings.push({ word, column: c, startRow: row })
          downCursor += 1
        }
      }
      for (const binding of downBindings) {
        const offset = row - binding.startRow
        if (offset < 0 || offset >= binding.word.length) {
          const belowRow = binding.startRow + binding.word.length
          if (row === belowRow && grid[row][binding.column] !== '#') {
            return false
          }
          continue
        }
        if (grid[row][binding.column] !== binding.word[offset]) return false
      }
      return true
    }

    const mirrorMatches = (row: number, rowBlacks: boolean[]): boolean => {
      const mirror = height - 1 - row
      if (mirror > row) return true
      if (mirror === row) {
        return rowBlacks.every((black, c) => black === rowBlacks[width - 1 - c])
      }
      return rowBlacks.every(
        (black, c) => black === (grid[mirror][width - 1 - c] === '#'),
      )
    }

    const dfs = (row: number): Puzzle | null => {
      if (process.env.CW_DEBUG && acrossCursor > 0 && row > debugMaxRow) {
        debugMaxRow = row
        console.error(
          `split ${acrossCount}: real path reached row ${row} (across ${acrossCursor}, down ${downCursor})`,
        )
      }
      if (row === height) {
        if (process.env.CW_DEBUG) {
          console.error(
            `split ${acrossCount}: summit across ${acrossCursor}/${across.length} down ${downCursor}/${down.length}`,
          )
        }
        if (acrossCursor !== across.length) return null
        if (downCursor !== down.length) return null
        return {
          date,
          size: width,
          grid: grid.map((cells) => cells.join('')),
          across: [],
          down: [],
        }
      }

      const savedCursor = acrossCursor
      for (const runs of rowRunOptions(acrossCursor)) {
        applyRow(row, runs)
        acrossCursor = savedCursor + runs.length
        const rowBlacks = blacksOf(runs)

        const bindMark = downBindings.length
        const cursorMark = downCursor
        const viable =
          mirrorMatches(row, rowBlacks) && verifyDowns(row, rowBlacks)
        if (viable) {
          const solved = dfs(row + 1)
          if (solved) return solved
        }
        downBindings.length = bindMark
        downCursor = cursorMark
        clearRow(row)
        acrossCursor = savedCursor
      }
      return null
    }

    return dfs(0)
  }

  // Plausible across counts: somewhere near half, wrong splits die in the
  // first rows on letter mismatches. Both list orders get tried because the
  // export's block order is unverified.
  const half = Math.floor(total / 2)
  for (const downFirst of [false, true]) {
    for (let delta = 0; delta <= 16; delta += 1) {
      for (const sign of [1, -1]) {
        const acrossCount = half + sign * delta
        if (acrossCount < 10 || acrossCount >= total - 10) continue
        const solved = solveWithSplit(acrossCount, downFirst)
        if (solved) {
          const splitAt = downFirst ? total - acrossCount : acrossCount
          const first = entries.slice(0, splitAt)
          const second = entries.slice(splitAt)
          solved.across = downFirst ? second : first
          solved.down = downFirst ? first : second
          return solved
        }
        if (delta === 0) break
      }
    }
  }
  return null
}

const main = () => {
  const date = process.argv[2]
  if (!date) {
    console.error('usage: reconstruct-nyt.ts MM/DD/YYYY')
    process.exit(1)
  }
  const archive = loadArchive()
  const entries = archive.get(date)
  if (!entries) {
    console.error('date not in archive')
    process.exit(1)
  }
  const started = Date.now()

  // NYT weekdays are 15x15 with occasional 16-wide or 16-deep variants.
  const shapes: [number, number][] = [
    [15, 15],
    [16, 15],
    [15, 16],
    [14, 15],
    [15, 14],
    [16, 16],
  ]
  const puzzle = shapes.reduce<ReturnType<typeof reconstruct>>(
    (found, [width, height]) =>
      found ?? reconstruct(date, entries, width, height),
    null,
  )
  console.log(`(${Date.now() - started}ms, ${entries.length} words)`)
  if (!puzzle) {
    console.error('no reconstruction found')
    process.exit(1)
  }
  console.log(puzzle.grid.join('\n'))
}

if (process.argv[1]?.endsWith('reconstruct-nyt.ts')) main()
