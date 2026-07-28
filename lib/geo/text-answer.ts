import type { Locale, LocalizedOption } from './model'

export type GeoAutocompleteMatch =
  | 'exact'
  | 'prefix'
  | 'word-prefix'
  | 'token-prefix'
  | 'substring'

export interface GeoAutocompleteCandidate {
  optionId: string
  label: string
  normalizedLabel: string
  match: GeoAutocompleteMatch
}

export interface GeoAutocompleteOptions {
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
 * Produces a comparison key without changing the visible localized label.
 * NFKD plus mark removal makes accented and unaccented input equivalent,
 * while whitespace and common apostrophe variants become deterministic.
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

const uniquelyResolvableOptions = (options: readonly IndexedOption[]) => {
  const idsByLabel = new Map<string, Set<string>>()
  for (const option of options) {
    const ids = idsByLabel.get(option.normalizedLabel) ?? new Set<string>()
    ids.add(option.optionId)
    idsByLabel.set(option.normalizedLabel, ids)
  }

  return options.filter(
    (option) => idsByLabel.get(option.normalizedLabel)?.size === 1,
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

/**
 * Returns deterministic, uniquely resolvable suggestions. Duplicate labels
 * that normalize to different option ids are intentionally omitted. Match
 * quality remains primary; within the same match tier, capital-city options
 * lead non-capital city options.
 */
export const rankGeoAutocompleteCandidates = (
  input: string,
  options: readonly LocalizedOption[],
  locale: Locale,
  config: GeoAutocompleteOptions = {},
): GeoAutocompleteCandidate[] => {
  const minimumCharacters = positiveInteger(
    config.minimumCharacters,
    DEFAULT_MINIMUM_CHARACTERS,
  )
  const normalizedQuery = normalizeGeoAnswer(input, locale)
  if (meaningfulCharacterCount(normalizedQuery) < minimumCharacters) {
    return []
  }

  const maxResults = positiveInteger(config.maxResults, DEFAULT_MAX_RESULTS)
  const collator = new Intl.Collator(locale, {
    numeric: true,
    sensitivity: 'base',
  })

  return uniquelyResolvableOptions(indexOptions(options, locale))
    .flatMap((option) => {
      const match = matchFor(option.normalizedLabel, normalizedQuery)
      return match ? [{ ...option, match }] : []
    })
    .sort(
      (left, right) =>
        MATCH_RANK[left.match] - MATCH_RANK[right.match] ||
        left.capitalPriority - right.capitalPriority ||
        left.normalizedLabel.length - right.normalizedLabel.length ||
        collator.compare(left.label, right.label) ||
        left.index - right.index,
    )
    .slice(0, maxResults)
    .map(({ label, match, normalizedLabel, optionId }) => ({
      optionId,
      label,
      normalizedLabel,
      match,
    }))
}

/**
 * Resolves only an exact normalized label. Ambiguous normalized labels return
 * null instead of silently choosing the first option.
 */
export const resolveExactGeoOptionId = (
  input: string,
  options: readonly LocalizedOption[],
  locale: Locale,
): string | null => {
  const normalizedInput = normalizeGeoAnswer(input, locale)
  if (!normalizedInput) return null

  const matchingIds = new Set(
    indexOptions(options, locale)
      .filter((option) => option.normalizedLabel === normalizedInput)
      .map((option) => option.optionId),
  )

  return matchingIds.size === 1
    ? (matchingIds.values().next().value ?? null)
    : null
}
