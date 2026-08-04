import { sumBy } from 'es-toolkit'
import { haversineDistanceKm } from 'services/distance'
import * as z from 'zod/mini'
import {
  readJson,
  type StorageLike,
  type StorageLoadStatus,
  writeJson,
} from '../../services/storage.ts'

import type {
  AnswerResult,
  DailyGeoChallenge,
  GeoChallengeRules,
  GeoSettings,
  PersistedGeoRun,
  PersistedGeoStats,
  Question,
  Round,
} from './model'
import {
  isIsoDateTime,
  roundQuestionForAttempt,
  roundTimeLimitMs,
} from './model'
import { isUtcPublicationDate } from './publication-date'
import type { GeoGameState } from './reducer'
import { firstUnansweredPosition } from './reducer'
import {
  mapBaseScoreForDistance,
  scoreChoiceAnswer,
  scoreMapAnswer,
} from './scoring'

type GeoLoadResult<T> = { status: StorageLoadStatus; value: T }

const GEO_SETTINGS_STORAGE_KEY = 'games:geo:v1:settings'
const GEO_STATS_STORAGE_KEY = 'games:geo:v1:stats'

const geoRunStorageKey = (publicationDate: string) =>
  `games:geo:v1:run:${publicationDate}`

export const DEFAULT_GEO_SETTINGS: GeoSettings = {
  schemaVersion: 1,
  sound: true,
  reducedMotion: false,
}

const nonEmptyString = z.string().check(z.minLength(1))
const finiteNonNegative = z.number().check(z.nonnegative())
const nonNegativeInt = z.int().check(z.nonnegative())
const isoDateTime = z.string().check(z.refine(isIsoDateTime))
const isoDate = z.string().check(z.refine(isUtcPublicationDate))

const geoCoordinateSchema = z.object({
  latitude: z.number().check(z.gte(-90), z.lte(90)),
  longitude: z.number().check(z.gte(-180), z.lte(180)),
})

const answerBaseShape = {
  questionId: nonEmptyString,
  roundId: nonEmptyString,
  roundType: z.enum(['shape', 'flag', 'capital', 'map']),
  attemptIndex: z.optional(nonNegativeInt),
  difficulty: z.literal([1, 2, 3, 4]),
  elapsedMs: finiteNonNegative,
  roundElapsedMs: z.optional(finiteNonNegative),
  questionLimitMs: finiteNonNegative,
  remainingMs: finiteNonNegative,
  correct: z.boolean(),
  expired: z.boolean(),
  skipped: z.optional(z.boolean()),
  baseScore: nonNegativeInt,
  streakBefore: nonNegativeInt,
  streakAfter: nonNegativeInt,
  streakMultiplier: finiteNonNegative,
  score: nonNegativeInt,
  answeredAt: isoDateTime,
}

const choiceAnswerSchema = z.object({
  ...answerBaseShape,
  kind: z.literal('choice'),
  selectedOptionId: z.nullable(nonEmptyString),
  correctOptionId: nonEmptyString,
  submittedText: z.optional(nonEmptyString),
})

const mapPinAnswerSchema = z.object({
  ...answerBaseShape,
  kind: z.literal('map-pin'),
  submittedCoordinate: z.nullable(geoCoordinateSchema),
  answerCoordinate: geoCoordinateSchema,
  distanceKm: z.nullable(finiteNonNegative),
  distanceBand: z.enum([
    'within-100',
    'within-300',
    'within-750',
    'within-1500',
    'within-3000',
    'miss',
    'expired',
  ]),
})

const answerResultSchema = z
  .discriminatedUnion('kind', [choiceAnswerSchema, mapPinAnswerSchema])
  .check(
    z.refine((answer) => answer.remainingMs <= answer.questionLimitMs),
    z.refine((answer) => !(answer.expired && answer.skipped)),
  )

export const isAnswerResult = (value: unknown): value is AnswerResult =>
  answerResultSchema.safeParse(value).success

const geoSettingsSchema = z.object({
  schemaVersion: z.literal(1),
  sound: z.boolean(),
  reducedMotion: z.boolean(),
})

const nearlyEqual = (left: number, right: number, tolerance: number) =>
  Math.abs(left - right) <= tolerance

export const loadGeoSettings = (
  storage: StorageLike | null,
): GeoLoadResult<GeoSettings> => {
  const loaded = readJson(storage, GEO_SETTINGS_STORAGE_KEY)
  if (loaded.status !== 'ok') {
    return { status: loaded.status, value: { ...DEFAULT_GEO_SETTINGS } }
  }

  const parsed = geoSettingsSchema.safeParse(loaded.value)
  return parsed.success
    ? { status: 'ok', value: parsed.data }
    : { status: 'invalid', value: { ...DEFAULT_GEO_SETTINGS } }
}

export const saveGeoSettings = (
  storage: StorageLike | null,
  settings: GeoSettings,
) => writeJson(storage, GEO_SETTINGS_STORAGE_KEY, settings)

const officialRunRecordSchema = z
  .object({
    challengeId: nonEmptyString,
    publicationDate: isoDate,
    rulesVersion: nonEmptyString,
    completedAt: isoDateTime,
    totalScore: nonNegativeInt,
    correctAnswers: nonNegativeInt,
    totalQuestions: nonNegativeInt,
    bestStreak: nonNegativeInt,
  })
  .check(z.refine((record) => record.correctAnswers <= record.totalQuestions))

const geoStatsSchema = z.object({
  schemaVersion: z.literal(1),
  runs: z.array(officialRunRecordSchema),
})

export const loadGeoStats = (
  storage: StorageLike | null,
): GeoLoadResult<PersistedGeoStats> => {
  const loaded = readJson(storage, GEO_STATS_STORAGE_KEY)
  if (loaded.status !== 'ok') {
    return {
      status: loaded.status,
      value: { schemaVersion: 1, runs: [] },
    }
  }

  const parsed = geoStatsSchema.safeParse(loaded.value)
  return parsed.success
    ? { status: 'ok', value: parsed.data }
    : { status: 'invalid', value: { schemaVersion: 1, runs: [] } }
}

export const saveGeoStats = (
  storage: StorageLike | null,
  stats: PersistedGeoStats,
) => writeJson(storage, GEO_STATS_STORAGE_KEY, stats)

// Caps a recycled timed run's answer log against hostile saves. No honest run reaches it.
const MAX_TIMED_RUN_ANSWERS = 4096

const challengeQuestions = (challenge: DailyGeoChallenge) =>
  challenge.rounds.flatMap((round, roundIndex) =>
    round.questions.map((question, questionIndex) => ({
      question,
      round,
      roundIndex,
      questionIndex,
    })),
  )

const expectedStreaks = (answers: readonly AnswerResult[]) => {
  let currentStreak = 0
  let bestStreak = 0
  let previousRoundId: string | null = null

  for (const answer of answers) {
    if (
      previousRoundId !== null &&
      answer.roundId !== previousRoundId &&
      answer.streakBefore === 0
    ) {
      currentStreak = 0
    }
    if (answer.streakBefore !== currentStreak) return null
    currentStreak = answer.correct ? currentStreak + 1 : 0
    if (answer.streakAfter !== currentStreak) return null
    bestStreak = Math.max(bestStreak, currentStreak)
    previousRoundId = answer.roundId
  }

  return { currentStreak, bestStreak }
}

const choiceAnswerMatches = (
  answer: AnswerResult,
  question: Exclude<Question, { type: 'map' }>,
) => {
  if (answer.kind !== 'choice') return false
  const correct = answer.selectedOptionId === question.correctOptionId
  if (answer.skipped) {
    if (
      answer.selectedOptionId !== null ||
      answer.correct ||
      answer.expired ||
      answer.score !== 0
    ) {
      return false
    }
  } else if (answer.expired) {
    if (answer.selectedOptionId !== null || answer.correct) return false
  } else if (
    (answer.selectedOptionId === null && !answer.submittedText) ||
    (answer.selectedOptionId !== null &&
      !question.options.some(
        (option) => option.id === answer.selectedOptionId,
      )) ||
    answer.correct !== correct
  ) {
    return false
  }

  return answer.correctOptionId === question.correctOptionId
}

const pinAnswerMatches = (
  answer: AnswerResult,
  question: Extract<Question, { type: 'map' }>,
  rules?: GeoChallengeRules,
) => {
  if (answer.kind !== 'map-pin') return false
  if (
    !nearlyEqual(
      answer.answerCoordinate.latitude,
      question.answerCoordinate.latitude,
      0.001,
    ) ||
    !nearlyEqual(
      answer.answerCoordinate.longitude,
      question.answerCoordinate.longitude,
      0.001,
    )
  ) {
    return false
  }

  if (answer.skipped) {
    return (
      !answer.expired &&
      !answer.correct &&
      answer.score === 0 &&
      answer.submittedCoordinate === null &&
      answer.distanceKm === null &&
      answer.distanceBand === 'miss'
    )
  }

  if (answer.expired) {
    return (
      answer.submittedCoordinate === null &&
      answer.distanceKm === null &&
      answer.distanceBand === 'expired' &&
      !answer.correct
    )
  }

  if (answer.submittedCoordinate === null || answer.distanceKm === null) {
    return false
  }

  const calculatedDistance = haversineDistanceKm(
    answer.submittedCoordinate,
    answer.answerCoordinate,
  )
  const expected = mapBaseScoreForDistance(answer.distanceKm, rules)
  return (
    nearlyEqual(answer.distanceKm, calculatedDistance, 0.01) &&
    answer.distanceBand === expected.distanceBand &&
    answer.baseScore === expected.baseScore &&
    answer.correct === expected.baseScore > 0
  )
}

// Tamper check: stored scores must reproduce from stored inputs under the same rules.
const scoreMatches = (answer: AnswerResult, rules?: GeoChallengeRules) => {
  if (answer.kind === 'map-pin' && !answer.expired && !answer.skipped) {
    if (answer.distanceKm === null) return false
    const expected = scoreMapAnswer(
      answer.distanceKm,
      answer.streakBefore,
      rules,
    )
    return (
      answer.baseScore === expected.baseScore &&
      answer.streakMultiplier === expected.streakMultiplier &&
      answer.score === expected.score
    )
  }

  const expected = scoreChoiceAnswer({
    correct: answer.correct,
    elapsedMs: answer.elapsedMs,
    questionLimitMs: answer.questionLimitMs,
    correctStreak: answer.streakBefore,
    rules,
  })
  return (
    answer.baseScore === expected.baseScore &&
    answer.streakMultiplier === expected.streakMultiplier &&
    answer.score === expected.score &&
    nearlyEqual(answer.remainingMs, expected.remainingMs, 0.001)
  )
}

const answerMatchesQuestion = (
  answer: AnswerResult,
  question: Question,
  round: Round,
  rules?: GeoChallengeRules,
) => {
  if (
    answer.questionId !== question.id ||
    answer.roundId !== round.id ||
    answer.roundType !== round.type ||
    answer.difficulty !== question.difficulty ||
    answer.questionLimitMs !== round.questionLimitMs ||
    answer.elapsedMs > roundTimeLimitMs(round) ||
    (answer.roundElapsedMs !== undefined &&
      (answer.roundElapsedMs > roundTimeLimitMs(round) ||
        answer.roundElapsedMs < answer.elapsedMs)) ||
    !nearlyEqual(
      Math.min(answer.elapsedMs, round.questionLimitMs) + answer.remainingMs,
      round.questionLimitMs,
      0.001,
    ) ||
    (answer.expired && (answer.correct || answer.score !== 0)) ||
    (answer.skipped &&
      (answer.correct || answer.expired || answer.score !== 0)) ||
    !scoreMatches(answer, rules)
  ) {
    return false
  }
  if (
    answer.expired &&
    (answer.elapsedMs !== round.questionLimitMs || answer.remainingMs !== 0)
  ) {
    return false
  }

  if (question.type !== 'map') return choiceAnswerMatches(answer, question)
  return pinAnswerMatches(answer, question, rules)
}

type NormalizedRunPosition = {
  status: PersistedGeoRun['status']
  roundIndex: number
  questionIndex: number
  roundComplete: boolean
  feedbackPending: boolean
  questionElapsedMs: number
  roundElapsedMs: number
  completedAt: string | undefined
}

const normalizeCurrentRun = (
  candidate: PersistedGeoRun,
): NormalizedRunPosition => ({
  status: candidate.status,
  roundIndex: candidate.roundIndex,
  questionIndex: candidate.questionIndex,
  roundComplete: candidate.roundComplete ?? false,
  feedbackPending: candidate.feedbackPending ?? false,
  questionElapsedMs: candidate.questionElapsedMs ?? 0,
  roundElapsedMs: candidate.roundElapsedMs ?? 0,
  completedAt: candidate.completedAt,
})

const normalizeLegacyRun = ({
  answers,
  candidate,
  challenge,
  firstUnanswered,
  oldPositionWasAnswered,
}: {
  answers: readonly AnswerResult[]
  candidate: PersistedGeoRun
  challenge: DailyGeoChallenge
  firstUnanswered: { roundIndex: number; questionIndex: number } | null
  oldPositionWasAnswered: boolean
}): NormalizedRunPosition => {
  const base = normalizeCurrentRun(candidate)
  if (candidate.status === 'started' && !firstUnanswered) {
    const roundIndex = challenge.rounds.length - 1
    return {
      ...base,
      status: 'completed',
      roundIndex,
      questionIndex: (challenge.rounds.at(-1)?.questions.length ?? 1) - 1,
      roundComplete: true,
      feedbackPending: false,
      questionElapsedMs: 0,
      roundElapsedMs: roundTimeLimitMs(challenge.rounds[roundIndex]),
      completedAt: candidate.completedAt ?? answers.at(-1)?.answeredAt,
    }
  }
  if (!firstUnanswered) return base

  const unansweredRound = challenge.rounds[firstUnanswered.roundIndex]
  const activeQuestionElapsed =
    firstUnanswered.roundIndex === candidate.roundIndex &&
    !oldPositionWasAnswered
      ? (candidate.questionElapsedMs ?? 0)
      : 0
  const elapsedAnsweredInRound = sumBy(
    answers.filter((answer) => answer.roundId === unansweredRound.id),
    (answer) => answer.elapsedMs,
  )
  return {
    ...base,
    roundIndex: firstUnanswered.roundIndex,
    questionIndex: firstUnanswered.questionIndex,
    roundComplete: false,
    feedbackPending: false,
    questionElapsedMs: activeQuestionElapsed,
    roundElapsedMs: Math.min(
      roundTimeLimitMs(unansweredRound),
      elapsedAnsweredInRound + activeQuestionElapsed,
    ),
  }
}

const persistedGeoRunSchema = z
  .object({
    schemaVersion: z.literal(1),
    challengeId: z.string(),
    rulesVersion: z.string(),
    status: z.enum(['started', 'completed']),
    roundIndex: nonNegativeInt,
    questionIndex: nonNegativeInt,
    answers: z.array(answerResultSchema),
    score: nonNegativeInt,
    currentStreak: nonNegativeInt,
    bestStreak: nonNegativeInt,
    startedAt: isoDateTime,
    completedAt: z.optional(isoDateTime),
    questionElapsedMs: z.optional(finiteNonNegative),
    roundElapsedMs: z.optional(finiteNonNegative),
    roundComplete: z.optional(z.boolean()),
    feedbackPending: z.optional(z.boolean()),
  })
  .check(
    z.refine(
      (run) => !(run.roundComplete === true && run.feedbackPending === true),
    ),
  )

export const validatePersistedGeoRun = (
  value: unknown,
  challenge: DailyGeoChallenge,
): PersistedGeoRun | null => {
  const parsed = persistedGeoRunSchema.safeParse(value)
  if (!parsed.success) return null

  const candidate = parsed.data
  if (
    candidate.challengeId !== challenge.id ||
    candidate.rulesVersion !== challenge.rulesVersion
  ) {
    return null
  }

  const questions = challengeQuestions(challenge)
  const answers = candidate.answers
  const legacyTimerRecord =
    candidate.roundElapsedMs === undefined &&
    candidate.roundComplete === undefined &&
    candidate.feedbackPending === undefined &&
    answers.every(
      (answer) =>
        answer.roundElapsedMs === undefined &&
        answer.attemptIndex === undefined,
    )
  const positionRound = challenge.rounds[candidate.roundIndex]
  const positionQuestion = positionRound
    ? legacyTimerRecord
      ? positionRound.questions[candidate.questionIndex]
      : roundQuestionForAttempt(positionRound, candidate.questionIndex)
    : null
  if (
    !positionRound ||
    !positionQuestion ||
    answers.length >
      (legacyTimerRecord ? questions.length : MAX_TIMED_RUN_ANSWERS) ||
    (candidate.questionElapsedMs !== undefined &&
      candidate.questionElapsedMs > roundTimeLimitMs(positionRound)) ||
    (candidate.roundElapsedMs !== undefined &&
      candidate.roundElapsedMs > roundTimeLimitMs(positionRound))
  ) {
    return null
  }

  const entryByQuestionId = new Map(
    questions.map((entry) => [entry.question.id, entry]),
  )
  const answeredCountByRound = new Map<number, number>()
  const lastRoundElapsedByRound = new Map<number, number>()
  let previousRoundIndex = -1

  for (const answer of answers) {
    const entry = entryByQuestionId.get(answer.questionId)
    const expectedAttemptIndex = entry
      ? (answeredCountByRound.get(entry.roundIndex) ?? 0)
      : -1
    const expectedQuestion = entry
      ? legacyTimerRecord
        ? entry.round.questions[expectedAttemptIndex]
        : roundQuestionForAttempt(entry.round, expectedAttemptIndex)
      : null
    if (
      !entry ||
      !expectedQuestion ||
      entry.roundIndex < previousRoundIndex ||
      expectedQuestion.id !== answer.questionId ||
      (answer.attemptIndex !== undefined &&
        answer.attemptIndex !== expectedAttemptIndex) ||
      !answerMatchesQuestion(
        answer,
        expectedQuestion,
        entry.round,
        challenge.rules,
      )
    ) {
      return null
    }

    const previousRoundElapsed =
      lastRoundElapsedByRound.get(entry.roundIndex) ?? 0
    if (
      answer.roundElapsedMs !== undefined &&
      answer.roundElapsedMs < previousRoundElapsed
    ) {
      return null
    }
    if (answer.roundElapsedMs !== undefined) {
      lastRoundElapsedByRound.set(entry.roundIndex, answer.roundElapsedMs)
    }
    answeredCountByRound.set(entry.roundIndex, expectedAttemptIndex + 1)
    previousRoundIndex = entry.roundIndex
  }

  const answeredIds = new Set(answers.map((answer) => answer.questionId))
  const firstUnanswered = firstUnansweredPosition(challenge, answers)
  const normalized = legacyTimerRecord
    ? normalizeLegacyRun({
        answers,
        candidate,
        challenge,
        firstUnanswered,
        oldPositionWasAnswered: answeredIds.has(positionQuestion.id),
      })
    : normalizeCurrentRun(candidate)

  const normalizedRound = challenge.rounds[normalized.roundIndex]
  const normalizedQuestion = normalizedRound
    ? legacyTimerRecord
      ? normalizedRound.questions[normalized.questionIndex]
      : roundQuestionForAttempt(normalizedRound, normalized.questionIndex)
    : null
  if (!normalizedRound || !normalizedQuestion) return null

  const currentRoundAnswerCount =
    answeredCountByRound.get(normalized.roundIndex) ?? 0
  const lastCurrentRoundAnswer = [...answers]
    .reverse()
    .find((answer) => answer.roundId === normalizedRound.id)
  const currentQuestionAnswered =
    currentRoundAnswerCount > 0 &&
    normalized.questionIndex === currentRoundAnswerCount - 1 &&
    lastCurrentRoundAnswer?.questionId === normalizedQuestion.id &&
    (lastCurrentRoundAnswer.attemptIndex === undefined ||
      lastCurrentRoundAnswer.attemptIndex === normalized.questionIndex)
  const lastRecordedRoundElapsed =
    lastRoundElapsedByRound.get(normalized.roundIndex) ?? 0
  const normalizedRoundLimitMs = roundTimeLimitMs(normalizedRound)
  const activePositionIsValid = normalized.feedbackPending
    ? currentQuestionAnswered
    : normalized.questionIndex === currentRoundAnswerCount
  const completedPositionIsValid =
    normalized.questionIndex === currentRoundAnswerCount ||
    currentQuestionAnswered
  if (
    previousRoundIndex > normalized.roundIndex ||
    normalized.roundElapsedMs > normalizedRoundLimitMs ||
    normalized.questionElapsedMs > normalizedRoundLimitMs ||
    normalized.roundElapsedMs < lastRecordedRoundElapsed ||
    (!normalized.roundComplete &&
      normalized.roundElapsedMs === normalizedRoundLimitMs) ||
    (!normalized.roundComplete && !activePositionIsValid) ||
    (normalized.status === 'completed' &&
      (normalized.roundIndex !== challenge.rounds.length - 1 ||
        !normalized.roundComplete ||
        !isIsoDateTime(normalized.completedAt))) ||
    (normalized.roundComplete &&
      (!completedPositionIsValid ||
        normalized.roundElapsedMs !== normalizedRoundLimitMs))
  ) {
    return null
  }

  const streaks = expectedStreaks(answers)
  if (!streaks) return null
  const answerScore = sumBy(answers, (answer) => answer.score)
  const deadlineEndedWithUnanswered =
    normalized.roundComplete &&
    normalized.questionIndex === currentRoundAnswerCount
  const mayHaveResetBetweenRounds =
    currentRoundAnswerCount === 0 && normalized.roundIndex > 0
  const currentStreakIsValid = deadlineEndedWithUnanswered
    ? candidate.currentStreak === 0
    : candidate.currentStreak === streaks.currentStreak ||
      (mayHaveResetBetweenRounds && candidate.currentStreak === 0)
  if (
    candidate.score !== answerScore ||
    !currentStreakIsValid ||
    candidate.bestStreak !== streaks.bestStreak ||
    (normalized.status === 'completed' &&
      !isIsoDateTime(normalized.completedAt))
  ) {
    return null
  }

  return {
    schemaVersion: 1,
    challengeId: challenge.id,
    rulesVersion: challenge.rulesVersion,
    status: normalized.status,
    roundIndex: normalized.roundIndex,
    questionIndex: normalized.questionIndex,
    answers,
    score: candidate.score,
    currentStreak: candidate.currentStreak,
    bestStreak: candidate.bestStreak,
    startedAt: candidate.startedAt,
    completedAt: normalized.completedAt,
    questionElapsedMs: normalized.questionElapsedMs,
    roundElapsedMs: normalized.roundElapsedMs,
    roundComplete: normalized.roundComplete,
    feedbackPending: normalized.feedbackPending,
  }
}

export const serializeGeoRun = (
  state: GeoGameState,
): PersistedGeoRun | null => {
  if (!state.startedAt || state.runKind !== 'official') return null
  const round = state.challenge.rounds[state.roundIndex]
  const reachedRoundDeadline = Boolean(
    round && state.roundElapsedMs >= roundTimeLimitMs(round),
  )
  const roundCompleteByPhase =
    state.phase === 'round-summary' ||
    state.phase === 'between-rounds-paused' ||
    state.phase === 'completed'
  const roundComplete = roundCompleteByPhase || reachedRoundDeadline
  const feedbackPending =
    state.phase === 'feedback' ||
    ((state.phase === 'visibility-paused' || state.phase === 'countdown') &&
      state.visibilityReturnPhase === 'feedback')
  const answeredInRound = round
    ? state.answers.filter((answer) => answer.roundId === round.id).length
    : 0
  const timedOutWithUnanswered =
    reachedRoundDeadline && state.questionIndex === answeredInRound

  return {
    schemaVersion: 1,
    challengeId: state.challenge.id,
    rulesVersion: state.challenge.rulesVersion,
    status: state.phase === 'completed' ? 'completed' : 'started',
    roundIndex: state.roundIndex,
    questionIndex: state.questionIndex,
    answers: [...state.answers],
    score: state.score,
    currentStreak: timedOutWithUnanswered ? 0 : state.currentStreak,
    bestStreak: state.bestStreak,
    startedAt: state.startedAt,
    completedAt: state.completedAt ?? undefined,
    questionElapsedMs: state.questionElapsedMs,
    roundElapsedMs: state.roundElapsedMs,
    roundComplete,
    feedbackPending: !roundComplete && feedbackPending,
  }
}

export const loadGeoRun = (
  storage: StorageLike | null,
  challenge: DailyGeoChallenge,
): GeoLoadResult<PersistedGeoRun | null> => {
  const loaded = readJson(storage, geoRunStorageKey(challenge.publicationDate))
  if (loaded.status !== 'ok') {
    return { status: loaded.status, value: null }
  }

  const run = validatePersistedGeoRun(loaded.value, challenge)
  return run ? { status: 'ok', value: run } : { status: 'invalid', value: null }
}

export const saveGeoRun = (
  storage: StorageLike | null,
  publicationDate: string,
  run: PersistedGeoRun,
) => writeJson(storage, geoRunStorageKey(publicationDate), run)

export const removeGeoRun = (
  storage: StorageLike | null,
  publicationDate: string,
) => {
  if (!storage) return false

  try {
    storage.removeItem(geoRunStorageKey(publicationDate))
    return true
  } catch {
    return false
  }
}
