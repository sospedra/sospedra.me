import { groupBy, mapValues, memoize } from 'es-toolkit'
import { filter, flatMap, length, map, pipe, take, uniq } from 'es-toolkit/fp'
import type { Locale, LocalizedOption } from '../../app/meridian/model.ts'

export type GeoAutocompleteMatch =
  | 'exact'
  | 'prefix'
  | 'word-prefix'
  | 'token-prefix'
  | 'substring'

export type GeoAutocompleteCandidate = {
  optionId: string
  label: string
  normalizedLabel: string
  match: GeoAutocompleteMatch
}

export type GeoAutocompleteOptions = {
  minimumCharacters?: number
  maxResults?: number
}

const DEFAULT_MINIMUM_CHARACTERS = 2
const DEFAULT_MAX_RESULTS = 6
const apostrophesPattern = /[’‘`´]/gu
const formattingCharactersPattern = /\p{Cf}/gu
const combiningMarksPattern = /\p{M}+/gu
const meaningfulCharactersPattern = /[\p{L}\p{N}]/gu
const wordSeparatorsPattern = /[\s\p{Pd}']+/gu

/**
 * NFKD plus mark removal makes accented and unaccented input equivalent.
 * Whitespace and common apostrophe variants collapse to one form.
 */
export const normalizeGeoAnswer = (value: string, locale: Locale) =>
  value
    .replace(apostrophesPattern, "'")
    .normalize('NFKD')
    .replace(combiningMarksPattern, '')
    .replace(formattingCharactersPattern, '')
    .toLocaleLowerCase(locale)
    .replace(/\s+/gu, ' ')
    .trim()

const meaningfulCharacterCount = (normalizedInput: string) =>
  normalizedInput.match(meaningfulCharactersPattern)?.length ?? 0

const positiveInteger = (value: number | undefined, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.max(1, Math.floor(value))
    : fallback

export const isMeaningfulGeoAnswerInput = (
  input: string,
  locale: Locale,
  minimumCharacters = DEFAULT_MINIMUM_CHARACTERS,
) =>
  meaningfulCharacterCount(normalizeGeoAnswer(input, locale)) >=
  positiveInteger(minimumCharacters, DEFAULT_MINIMUM_CHARACTERS)

type IndexedOption = {
  index: number
  optionId: string
  label: string
  normalizedLabel: string
  capitalPriority: number
}

const indexOptions = (
  options: readonly LocalizedOption[],
  locale: Locale,
): IndexedOption[] => {
  const seenOptionIds = new Set<string>()

  return options.flatMap((option, index) => {
    if (seenOptionIds.has(option.id)) return []

    const label = option.label[locale]
    const normalizedLabel = normalizeGeoAnswer(label, locale)
    if (!normalizedLabel) return []

    seenOptionIds.add(option.id)
    return [
      {
        index,
        optionId: option.id,
        label,
        normalizedLabel,
        capitalPriority: option.id.startsWith('capital-') ? 0 : 1,
      },
    ]
  })
}

const distinctIdCount = (group: readonly IndexedOption[]): number =>
  pipe(
    group,
    map((option) => option.optionId),
    uniq(),
    length(),
  )

const uniquelyResolvableOptions = (options: readonly IndexedOption[]) => {
  const idCountByLabel = mapValues(
    groupBy(options, (option) => option.normalizedLabel),
    distinctIdCount,
  )

  return options.filter(
    (option) => idCountByLabel[option.normalizedLabel] === 1,
  )
}

const normalizedWords = (label: string) =>
  label.split(wordSeparatorsPattern).filter(Boolean)

const matchFor = (
  normalizedLabel: string,
  normalizedQuery: string,
): GeoAutocompleteMatch | null => {
  if (normalizedLabel === normalizedQuery) return 'exact'
  if (normalizedLabel.startsWith(normalizedQuery)) return 'prefix'

  const words = normalizedWords(normalizedLabel)
  if (words.some((word) => word.startsWith(normalizedQuery))) {
    return 'word-prefix'
  }

  const queryTokens = normalizedWords(normalizedQuery)
  if (
    queryTokens.length > 1 &&
    queryTokens.every((token) => words.some((word) => word.startsWith(token)))
  ) {
    return 'token-prefix'
  }

  return normalizedLabel.includes(normalizedQuery) ? 'substring' : null
}

const MATCH_RANK: Record<GeoAutocompleteMatch, number> = {
  exact: 0,
  prefix: 1,
  'word-prefix': 2,
  'token-prefix': 3,
  substring: 4,
}

type MatchedOption = IndexedOption & { match: GeoAutocompleteMatch }

const toCandidate = ({
  label,
  match,
  normalizedLabel,
  optionId,
}: MatchedOption): GeoAutocompleteCandidate => ({
  optionId,
  label,
  normalizedLabel,
  match,
})

export type GeoAutocompleteIndex = {
  locale: Locale
  resolvable: readonly IndexedOption[]
}

/* the normalization pass over a ~1900-label lexicon must not run per keystroke */
export const buildGeoAutocompleteIndex = (
  options: readonly LocalizedOption[],
  locale: Locale,
): GeoAutocompleteIndex => ({
  locale,
  resolvable: uniquelyResolvableOptions(indexOptions(options, locale)),
})

const collatorFor = memoize(
  (locale: Locale): Intl.Collator =>
    new Intl.Collator(locale, { numeric: true, sensitivity: 'base' }),
)

export const rankGeoAutocompleteIndex = (
  input: string,
  index: GeoAutocompleteIndex,
  config: GeoAutocompleteOptions = {},
): GeoAutocompleteCandidate[] => {
  const minimumCharacters = positiveInteger(
    config.minimumCharacters,
    DEFAULT_MINIMUM_CHARACTERS,
  )
  const normalizedQuery = normalizeGeoAnswer(input, index.locale)
  if (meaningfulCharacterCount(normalizedQuery) < minimumCharacters) {
    return []
  }

  const maxResults = positiveInteger(config.maxResults, DEFAULT_MAX_RESULTS)
  const collator = collatorFor(index.locale)

  const matchedOptions = (option: IndexedOption): MatchedOption[] => {
    const match = matchFor(option.normalizedLabel, normalizedQuery)
    return match ? [{ ...option, match }] : []
  }
  const ranked = (matched: readonly MatchedOption[]) =>
    matched.toSorted(
      (left, right) =>
        MATCH_RANK[left.match] - MATCH_RANK[right.match] ||
        left.capitalPriority - right.capitalPriority ||
        left.normalizedLabel.length - right.normalizedLabel.length ||
        collator.compare(left.label, right.label) ||
        left.index - right.index,
    )

  return pipe(
    index.resolvable,
    flatMap(matchedOptions),
    ranked,
    take(maxResults),
    map(toCandidate),
  )
}

export const rankGeoAutocompleteCandidates = (
  input: string,
  options: readonly LocalizedOption[],
  locale: Locale,
  config: GeoAutocompleteOptions = {},
): GeoAutocompleteCandidate[] =>
  rankGeoAutocompleteIndex(
    input,
    buildGeoAutocompleteIndex(options, locale),
    config,
  )

export const resolveExactGeoOptionId = (
  input: string,
  options: readonly LocalizedOption[],
  locale: Locale,
): string | null => {
  const normalizedInput = normalizeGeoAnswer(input, locale)
  if (!normalizedInput) return null

  const matchingIds = pipe(
    indexOptions(options, locale),
    filter((option) => option.normalizedLabel === normalizedInput),
    map((option) => option.optionId),
    uniq(),
  )

  return matchingIds.length === 1 ? (matchingIds[0] ?? null) : null
}
