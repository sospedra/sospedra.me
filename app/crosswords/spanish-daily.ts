import {
  type ChallengePuzzle,
  type CrosswordChallengeFile,
  GRID_LETTERS,
  ISO_DATE,
} from './crossword-data.ts'

export type SpanishDailyChallenge = {
  publicationDate: string
  puzzle: ChallengePuzzle
}

type SpanishClueBook = {
  across: Record<string, string>
  down: Record<string, string>
}

const ACCENT_FOLD: Record<string, string> = {
  Á: 'A',
  À: 'A',
  É: 'E',
  È: 'E',
  Í: 'I',
  Ì: 'I',
  Ó: 'O',
  Ò: 'O',
  Ú: 'U',
  Ù: 'U',
  Ü: 'U',
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const normalizeLetter = (character: string): string => {
  const upper = character.toUpperCase()
  return ACCENT_FOLD[upper] ?? upper
}

const normalizeWord = (word: string): string =>
  [...word].map(normalizeLetter).join('')

const isGridCharacter = (character: string): boolean =>
  character === '#' || GRID_LETTERS.has(character)

const parseBoard = (board: string): string[] | null => {
  const rows = board
    .split('\n')
    .map((row) => normalizeWord(row.trim()))
    .filter((row) => row.length > 0)

  const width = rows[0]?.length ?? 0
  const sane =
    rows.length >= 3 && rows.length <= 25 && width >= 3 && width <= 25
  if (!sane) return null
  if (rows.some((row) => row.length !== width)) return null

  const valid = rows.every((row) => [...row].every(isGridCharacter))
  return valid ? rows : null
}

const cluePair = (entry: unknown): readonly [string, string] | null => {
  if (!isRecord(entry)) return null
  const text = typeof entry.clue === 'string' ? entry.clue.trim() : ''
  if (text.length === 0 || typeof entry.answer !== 'string') return null
  return [normalizeWord(entry.answer), text]
}

const clueBookSide = (side: unknown): Record<string, string> => {
  if (!isRecord(side)) return {}
  const pairs = Object.values(side)
    .map(cluePair)
    .filter((pair): pair is readonly [string, string] => pair !== null)
  return Object.fromEntries(pairs)
}

const wordsIn = (line: string): string[] =>
  line.split('#').filter((word) => word.length >= 2)

const columnLines = (rows: string[]): string[] =>
  [...(rows[0] ?? '')].map((_, column) =>
    rows.map((row) => row[column]).join(''),
  )

/* Every playable word needs its clue; a partial book means a broken feed
   and the whole edition is safer skipped than shipped half-clued. */
const fullyClued = (rows: string[], clues: SpanishClueBook): boolean =>
  rows.flatMap(wordsIn).every((word) => clues.across[word] !== undefined) &&
  columnLines(rows)
    .flatMap(wordsIn)
    .every((word) => clues.down[word] !== undefined)

const attributesOf = (payload: unknown): Record<string, unknown> | null => {
  if (!isRecord(payload)) return null
  const data = payload.data
  if (!isRecord(data)) return null
  const attributes = data.attributes
  return isRecord(attributes) ? attributes : null
}

export const spanishChallengeFromPayload = (
  payload: unknown,
): SpanishDailyChallenge | null => {
  const attributes = attributesOf(payload)
  const config = attributes?.config
  if (!attributes || !isRecord(config)) return null

  const publicationDate = attributes.publicationDate
  if (typeof publicationDate !== 'string' || !ISO_DATE.test(publicationDate))
    return null
  if (typeof config.board !== 'string') return null

  const solution = parseBoard(config.board)
  if (!solution) return null

  const entries = isRecord(config.entries) ? config.entries : {}
  const clues = {
    across: clueBookSide(entries.across),
    down: clueBookSide(entries.down),
  }
  if (!fullyClued(solution, clues)) return null

  return { publicationDate, puzzle: { solution, clues } }
}

export const withSpanishPuzzle = (
  challenges: CrosswordChallengeFile[],
  spanish: SpanishDailyChallenge,
): CrosswordChallengeFile[] =>
  challenges.map((challenge) =>
    challenge.publicationDate === spanish.publicationDate
      ? { ...challenge, puzzles: { ...challenge.puzzles, es: spanish.puzzle } }
      : challenge,
  )
