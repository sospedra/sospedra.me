import type {
  CrosswordDirection,
  CrosswordEntry,
  CrosswordPuzzle,
} from './crossword-data'

export type EntryStep = { index: number; direction: CrosswordDirection }

export const entryFor = (
  puzzle: CrosswordPuzzle,
  index: number,
  direction: CrosswordDirection,
) => {
  const cell = puzzle.cells[index]
  if (!cell) return null
  const id = cell.entryIds.find((entryId) => entryId.endsWith(direction))
  return puzzle.entries.find((entry) => entry.id === id) ?? null
}

export const availableDirection = (
  puzzle: CrosswordPuzzle,
  index: number,
  preferred: CrosswordDirection,
) =>
  entryFor(puzzle, index, preferred)
    ? preferred
    : preferred === 'across'
      ? 'down'
      : 'across'

export const firstOpenCell = (entry: CrosswordEntry, guesses: string[]) =>
  entry.cells.find((index) => !guesses[index]) ?? entry.cells[0]

export const whiteCellIndices = (puzzle: CrosswordPuzzle) =>
  puzzle.cells.flatMap((cell) => (cell.solution === null ? [] : [cell.index]))

export const solutionsByCell = (puzzle: CrosswordPuzzle) =>
  Object.fromEntries(
    puzzle.cells.flatMap((cell) =>
      cell.solution === null ? [] : [[cell.index, cell.solution]],
    ),
  )

export const solvedEntryIdsFor = (puzzle: CrosswordPuzzle, guesses: string[]) =>
  new Set(
    puzzle.entries
      .filter((entry) =>
        entry.cells.every(
          (index) => guesses[index] === puzzle.cells[index]?.solution,
        ),
      )
      .map((entry) => entry.id),
  )

export const nextCellInEntry = ({
  activeEntry,
  delta,
  direction,
  guesses,
  index,
  orderedEntries,
  puzzle,
  skipFilled,
}: {
  activeEntry: CrosswordEntry
  delta: -1 | 1
  direction: CrosswordDirection
  guesses: string[]
  index: number
  orderedEntries: CrosswordEntry[]
  puzzle: CrosswordPuzzle
  skipFilled: boolean
}): EntryStep => {
  const entry = entryFor(puzzle, index, direction) ?? activeEntry
  const position = entry.cells.indexOf(index)
  const candidates =
    delta === 1
      ? entry.cells.slice(position + 1)
      : entry.cells.slice(0, position).reverse()
  if (skipFilled) {
    const open = candidates.find((cellIndex) => !guesses[cellIndex])
    if (open !== undefined) {
      return { index: open, direction: entry.direction }
    }
  } else {
    const adjacent = candidates[0]
    if (adjacent !== undefined) {
      return { index: adjacent, direction: entry.direction }
    }
  }

  const clueIndex = orderedEntries.findIndex(
    (candidate) => candidate.id === entry.id,
  )
  for (let step = 1; step < orderedEntries.length; step += 1) {
    const nextEntry =
      orderedEntries[
        (clueIndex + step * delta + orderedEntries.length) %
          orderedEntries.length
      ]
    const entryCells =
      delta === 1 ? nextEntry.cells : [...nextEntry.cells].reverse()
    const nextIndex = skipFilled
      ? entryCells.find((cellIndex) => !guesses[cellIndex])
      : entryCells[0]
    if (nextIndex !== undefined) {
      return { index: nextIndex, direction: nextEntry.direction }
    }
  }

  return { index, direction: entry.direction }
}
