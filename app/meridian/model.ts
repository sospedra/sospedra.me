export const GEO_SCHEMA_VERSION = 1 as const
export const GEO_ROUND_LIMIT_MS = 60_000 as const

export const isIsoDateTime = (value: unknown): value is string =>
  typeof value === 'string' && Number.isFinite(Date.parse(value))

export type Locale = 'en' | 'es'
export type ISOAlpha2 = string
export type Difficulty = 1 | 2 | 3 | 4
export type RoundType = 'shape' | 'flag' | 'capital' | 'map'
export type RunKind = 'official' | 'practice'

export type LocalizedText = Record<Locale, string>
export type LocalizedPrompt = LocalizedText

export interface LocalizedOption {
  id: string
  label: LocalizedText
}

export type CityAutocompleteOptionId =
  | `capital-${string}`
  | `city-${string}-${number}`

export interface CityAutocompleteOption extends LocalizedOption {
  id: CityAutocompleteOptionId
}

import type { GeoCoordinate } from 'services/distance'

export type { GeoCoordinate } from 'services/distance'

export interface CountryDifficulty {
  shape?: Difficulty
  flag?: Difficulty
  capital?: Difficulty
  map?: Difficulty
}

export interface RoundEligibility {
  shape: boolean
  flag: boolean
  capital: boolean
  map: boolean
}

export interface CountryRecord {
  code: ISOAlpha2
  iso3: string
  wikidataId: string
  names: Record<Locale, string>
  shortNames?: Partial<Record<Locale, string>>
  acceptedNames: Record<Locale, string[]>
  continent: 'AF' | 'AS' | 'EU' | 'NA' | 'OC' | 'SA'
  subregion: string
  capital: {
    wikidataId?: string
    geonamesId?: number
    names: Record<Locale, string>
    acceptedNames?: Record<Locale, string[]>
    latitude: number
    longitude: number
    promptNote?: Partial<Record<Locale, string>>
  }
  assets: {
    shapeUrl?: string
    flagUrl: string
  }
  eligibility: RoundEligibility
  difficulty: CountryDifficulty
  status: 'active' | 'review' | 'excluded'
  sourceRevision: string
}

export interface ChoiceQuestion {
  id: string
  type: 'shape' | 'flag' | 'capital'
  countryCode?: ISOAlpha2
  difficulty: Difficulty
  prompt: LocalizedPrompt
  assetUrl?: string
  options: LocalizedOption[]
  correctOptionId: string
}

export interface MapQuestion {
  id: string
  type: 'map'
  countryCode?: ISOAlpha2
  difficulty: Difficulty
  prompt: LocalizedPrompt
  answerCoordinate: GeoCoordinate
}

export type Question = ChoiceQuestion | MapQuestion

export interface Round {
  id: string
  type: RoundType
  /**
   * Per-answer speed-scoring horizon.
   */
  questionLimitMs: number
  /**
   * Shared time budget for the whole round. Older generated packs may omit
   * it, and the game contract still gives those rounds a 60-second budget.
   */
  roundLimitMs?: number
  questions: Question[]
}

export const roundTimeLimitMs = (round: Round) =>
  Math.max(0, round.roundLimitMs ?? GEO_ROUND_LIMIT_MS)

/**
 * Maps an unbounded timed-round attempt cursor back onto the finite country
 * deck. The first pass preserves the seeded ascending ramp exactly. Later
 * passes rotate only the tail beyond the two openers, so recycled play never
 * restarts from the easiest prompts and no country crosses section boundaries.
 */
export const roundQuestionIndexForAttempt = (
  round: Round,
  attemptIndex: number,
): number | null => {
  const questionCount = round.questions.length
  if (
    questionCount === 0 ||
    !Number.isSafeInteger(attemptIndex) ||
    attemptIndex < 0
  ) {
    return null
  }

  if (attemptIndex < questionCount) return attemptIndex
  if (questionCount <= 2) return attemptIndex % questionCount

  const hardQuestionCount = questionCount - 2
  const hardAttemptIndex = attemptIndex - questionCount
  const position = hardAttemptIndex % hardQuestionCount
  const cycle = Math.floor(hardAttemptIndex / hardQuestionCount)
  const rotation = hardQuestionCount > 2 ? cycle % hardQuestionCount : 0
  return 2 + ((position + rotation) % hardQuestionCount)
}

export const roundQuestionForAttempt = (
  round: Round,
  attemptIndex: number,
): Question | null => {
  const questionIndex = roundQuestionIndexForAttempt(round, attemptIndex)
  return questionIndex === null
    ? null
    : (round.questions[questionIndex] ?? null)
}

export interface GeoChallengeRules {
  choice: {
    min: number
    max: number
  }
  streak: {
    step: number
    cap: number
  }
  mapBands: {
    maxKm: number
    score: number
  }[]
  feedbackMs: number
  /**
   * Missed answers hold the feedback phase longer so the correction reads.
   * Optional so pre-geo-v7 packs stay loadable.
   */
  wrongFeedbackMs?: number
  roundSummaryMs: number
}

export interface DailyGeoChallenge {
  schemaVersion: typeof GEO_SCHEMA_VERSION
  generatorVersion: string
  rulesVersion: string
  id: string
  publicationDate: string
  seed: string
  cityOptions: CityAutocompleteOption[]
  rounds: Round[]
  sourceRevision: string
  rules?: GeoChallengeRules
  /**
   * Optional display issue assigned by the publication pipeline. It is never
   * used as part of selection or scoring.
   */
  sequence?: number
}

export type MapDistanceBand =
  | 'within-100'
  | 'within-300'
  | 'within-750'
  | 'within-1500'
  | 'within-3000'
  | 'miss'
  | 'expired'

interface AnswerResultBase {
  questionId: string
  roundId: string
  roundType: RoundType
  difficulty: Difficulty
  /**
   * Zero-based attempt cursor within the round. This disambiguates repeated
   * questions when a timed player exhausts and recycles the finite deck.
   * Optional so pre-recycling schema-v1 saves remain readable.
   */
  attemptIndex?: number
  elapsedMs: number
  /**
   * Explicit shared round-clock reading for records created by the corrected
   * round loop. Optional so existing schema-v1 saves can still be restored.
   */
  roundElapsedMs?: number
  questionLimitMs: number
  remainingMs: number
  correct: boolean
  expired: boolean
  /**
   * Explicit player pass. It is incorrect but distinct from round-clock
   * expiry, which does not create an answer record.
   */
  skipped?: boolean
  baseScore: number
  streakBefore: number
  streakAfter: number
  streakMultiplier: number
  score: number
  answeredAt: string
}

export interface ChoiceAnswerResult extends AnswerResultBase {
  kind: 'choice'
  selectedOptionId: string | null
  correctOptionId: string
  /** Older multiple-choice records omit it and remain valid. */
  submittedText?: string
}

export interface MapPinAnswerResult extends AnswerResultBase {
  kind: 'map-pin'
  submittedCoordinate: GeoCoordinate | null
  answerCoordinate: GeoCoordinate
  distanceKm: number | null
  distanceBand: MapDistanceBand
}

export type AnswerResult = ChoiceAnswerResult | MapPinAnswerResult

export interface PersistedGeoRun {
  schemaVersion: typeof GEO_SCHEMA_VERSION
  challengeId: string
  rulesVersion: string
  status: 'started' | 'completed'
  roundIndex: number
  questionIndex: number
  answers: AnswerResult[]
  score: number
  currentStreak: number
  bestStreak: number
  startedAt: string
  completedAt?: string
  questionElapsedMs?: number
  roundElapsedMs?: number
  /**
   * Marks a round whose questions are finished or whose shared clock expired.
   * This lets a refresh restore the round summary even when unanswered
   * questions remain.
   */
  roundComplete?: boolean
  /**
   * The latest answer is still in its brief feedback phase. Persisting this
   * avoids restoring onto an already-answered question after a refresh.
   */
  feedbackPending?: boolean
}

export interface GeoSettings {
  schemaVersion: typeof GEO_SCHEMA_VERSION
  sound: boolean
  reducedMotion: boolean
}

export interface OfficialGeoRunRecord {
  challengeId: string
  publicationDate: string
  rulesVersion: string
  completedAt: string
  totalScore: number
  correctAnswers: number
  totalQuestions: number
  bestStreak: number
}

export interface PersistedGeoStats {
  schemaVersion: typeof GEO_SCHEMA_VERSION
  runs: OfficialGeoRunRecord[]
}
