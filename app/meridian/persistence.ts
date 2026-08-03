import { haversineDistanceKm, isGeoCoordinate } from 'services/distance'
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
  MapDistanceBand,
  OfficialGeoRunRecord,
  PersistedGeoRun,
  PersistedGeoStats,
  Question,
  Round,
  RoundType,
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

// unlike the storage union, a geo load always carries a usable fallback value
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

type UnknownRecord = Record<string, unknown>

const isRecord = (value: unknown): value is UnknownRecord =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0

const isFiniteNonNegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0

const isNonNegativeInteger = (value: unknown): value is number =>
  isFiniteNonNegative(value) && Number.isInteger(value)

const isIsoDate = (value: unknown): value is string =>
  typeof value === 'string' && isUtcPublicationDate(value)

const isRoundType = (value: unknown): value is RoundType =>
  value === 'shape' ||
  value === 'flag' ||
  value === 'capital' ||
  value === 'map'

const isMapDistanceBand = (value: unknown): value is MapDistanceBand =>
  value === 'within-100' ||
  value === 'within-300' ||
  value === 'within-750' ||
  value === 'within-1500' ||
  value === 'within-3000' ||
  value === 'miss' ||
  value === 'expired'

const nearlyEqual = (left: number, right: number, tolerance: number) =>
  Math.abs(left - right) <= tolerance

const answerBaseIsValid = (answer: UnknownRecord) =>
  isNonEmptyString(answer.questionId) &&
  isNonEmptyString(answer.roundId) &&
  isRoundType(answer.roundType) &&
  (answer.attemptIndex === undefined ||
    isNonNegativeInteger(answer.attemptIndex)) &&
  isNonNegativeInteger(answer.difficulty) &&
  answer.difficulty >= 1 &&
  answer.difficulty <= 4 &&
  isFiniteNonNegative(answer.elapsedMs) &&
  isFiniteNonNegative(answer.questionLimitMs) &&
  isFiniteNonNegative(answer.remainingMs) &&
  answer.remainingMs <= answer.questionLimitMs &&
  (answer.roundElapsedMs === undefined ||
    isFiniteNonNegative(answer.roundElapsedMs)) &&
  typeof answer.correct === 'boolean' &&
  typeof answer.expired === 'boolean' &&
  (answer.skipped === undefined || typeof answer.skipped === 'boolean') &&
  !(answer.expired === true && answer.skipped === true) &&
  isNonNegativeInteger(answer.baseScore) &&
  isNonNegativeInteger(answer.streakBefore) &&
  isNonNegativeInteger(answer.streakAfter) &&
  isFiniteNonNegative(answer.streakMultiplier) &&
  isNonNegativeInteger(answer.score) &&
  isIsoDateTime(answer.answeredAt)

export const isAnswerResult = (value: unknown): value is AnswerResult => {
  if (!isRecord(value) || !answerBaseIsValid(value)) return false

  if (value.kind === 'choice') {
    return (
      (value.selectedOptionId === null ||
        isNonEmptyString(value.selectedOptionId)) &&
      isNonEmptyString(value.correctOptionId) &&
      (value.submittedText === undefined ||
        isNonEmptyString(value.submittedText))
    )
  }

  if (value.kind === 'map-pin') {
    return (
      (value.submittedCoordinate === null ||
        isGeoCoordinate(value.submittedCoordinate)) &&
      isGeoCoordinate(value.answerCoordinate) &&
      (value.distanceKm === null || isFiniteNonNegative(value.distanceKm)) &&
      isMapDistanceBand(value.distanceBand)
    )
  }

  return false
}

const parseGeoSettings = (value: unknown): GeoSettings | null => {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    typeof value.sound !== 'boolean' ||
    typeof value.reducedMotion !== 'boolean'
  ) {
    return null
  }

  return {
    schemaVersion: 1,
    sound: value.sound,
    reducedMotion: value.reducedMotion,
  }
}

export const loadGeoSettings = (
  storage: StorageLike | null,
): GeoLoadResult<GeoSettings> => {
  const loaded = readJson(storage, GEO_SETTINGS_STORAGE_KEY)
  if (loaded.status !== 'ok') {
    return { status: loaded.status, value: { ...DEFAULT_GEO_SETTINGS } }
  }

  const settings = parseGeoSettings(loaded.value)
  return settings
    ? { status: 'ok', value: settings }
    : { status: 'invalid', value: { ...DEFAULT_GEO_SETTINGS } }
}

export const saveGeoSettings = (
  storage: StorageLike | null,
  settings: GeoSettings,
) => writeJson(storage, GEO_SETTINGS_STORAGE_KEY, settings)

const parseOfficialRunRecord = (
  value: unknown,
): OfficialGeoRunRecord | null => {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.challengeId) ||
    !isIsoDate(value.publicationDate) ||
    !isNonEmptyString(value.rulesVersion) ||
    !isIsoDateTime(value.completedAt) ||
    !isNonNegativeInteger(value.totalScore) ||
    !isNonNegativeInteger(value.correctAnswers) ||
    !isNonNegativeInteger(value.totalQuestions) ||
    value.correctAnswers > value.totalQuestions ||
    !isNonNegativeInteger(value.bestStreak)
  ) {
    return null
  }

  return {
    challengeId: value.challengeId,
    publicationDate: value.publicationDate,
    rulesVersion: value.rulesVersion,
    completedAt: value.completedAt,
    totalScore: value.totalScore,
    correctAnswers: value.correctAnswers,
    totalQuestions: value.totalQuestions,
    bestStreak: value.bestStreak,
  }
}

const parseGeoStats = (value: unknown): PersistedGeoStats | null => {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    !Array.isArray(value.runs)
  ) {
    return null
  }

  const runs = value.runs.map(parseOfficialRunRecord)
  if (runs.some((run) => run === null)) return null

  return {
    schemaVersion: 1,
    runs: runs as OfficialGeoRunRecord[],
  }
}

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

  const stats = parseGeoStats(loaded.value)
  return stats
    ? { status: 'ok', value: stats }
    : { status: 'invalid', value: { schemaVersion: 1, runs: [] } }
}

export const saveGeoStats = (
  storage: StorageLike | null,
  stats: PersistedGeoStats,
) => writeJson(storage, GEO_STATS_STORAGE_KEY, stats)

// Target: caps a recycled timed run's answer log; it bounds hostile saves, no honest run reaches it.
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

interface NormalizedRunPosition {
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
  const elapsedAnsweredInRound = answers
    .filter((answer) => answer.roundId === unansweredRound.id)
    .reduce((total, answer) => total + answer.elapsedMs, 0)
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

// isAnswerResult gates record shapes; this deep validator replays positions, clocks, streaks, and scores against the challenge.
export const validatePersistedGeoRun = (
  value: unknown,
  challenge: DailyGeoChallenge,
): PersistedGeoRun | null => {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    value.challengeId !== challenge.id ||
    value.rulesVersion !== challenge.rulesVersion ||
    (value.status !== 'started' && value.status !== 'completed') ||
    !isNonNegativeInteger(value.roundIndex) ||
    !isNonNegativeInteger(value.questionIndex) ||
    !Array.isArray(value.answers) ||
    !value.answers.every(isAnswerResult) ||
    !isNonNegativeInteger(value.score) ||
    !isNonNegativeInteger(value.currentStreak) ||
    !isNonNegativeInteger(value.bestStreak) ||
    !isIsoDateTime(value.startedAt) ||
    (value.completedAt !== undefined && !isIsoDateTime(value.completedAt)) ||
    (value.questionElapsedMs !== undefined &&
      !isFiniteNonNegative(value.questionElapsedMs)) ||
    (value.roundElapsedMs !== undefined &&
      !isFiniteNonNegative(value.roundElapsedMs)) ||
    (value.roundComplete !== undefined &&
      typeof value.roundComplete !== 'boolean') ||
    (value.feedbackPending !== undefined &&
      typeof value.feedbackPending !== 'boolean') ||
    (value.roundComplete === true && value.feedbackPending === true)
  ) {
    return null
  }

  const candidate = value as unknown as PersistedGeoRun
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
  const answerScore = answers.reduce((total, answer) => total + answer.score, 0)
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
