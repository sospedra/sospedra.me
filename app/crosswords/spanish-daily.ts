import * as z from 'zod/mini'
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

const clueEntrySchema = z.object({
  clue: z.string().check(z.trim(), z.minLength(1)),
  answer: z.string(),
})

const looseRecordSchema = z.catch(z.record(z.string(), z.unknown()), {})

const clueBookSide = (side: unknown): Record<string, string> => {
  const pairs = Object.values(looseRecordSchema.parse(side)).flatMap(
    (entry) => {
      const parsed = clueEntrySchema.safeParse(entry)
      if (!parsed.success) return []
      return [[normalizeWord(parsed.data.answer), parsed.data.clue] as const]
    },
  )
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

const feedPayloadSchema = z.object({
  data: z.object({
    attributes: z.object({
      publicationDate: z.string().check(z.regex(ISO_DATE)),
      config: z.object({
        board: z.string(),
        entries: z.unknown(),
      }),
    }),
  }),
})

export const spanishChallengeFromPayload = (
  payload: unknown,
): SpanishDailyChallenge | null => {
  const parsed = feedPayloadSchema.safeParse(payload)
  if (!parsed.success) return null
  const { config, publicationDate } = parsed.data.data.attributes

  const solution = parseBoard(config.board)
  if (!solution) return null

  const entries = looseRecordSchema.parse(config.entries)
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
