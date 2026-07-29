import { haversineDistanceKm, isGeoCoordinate } from './distance'
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
import { roundQuestionForAttempt, roundTimeLimitMs } from './model'
import type { GeoGameState } from './reducer'
import {
  mapBaseScoreForDistance,
  scoreChoiceAnswer,
  scoreMapAnswer,
} from './scoring'

export const GEO_SETTINGS_STORAGE_KEY = 'games:geo:v1:settings'
export const GEO_STATS_STORAGE_KEY = 'games:geo:v1:stats'

export const geoRunStorageKey = (publicationDate: string) =>
  `games:geo:v1:run:${publicationDate}`

export const DEFAULT_GEO_SETTINGS: GeoSettings = {
  schemaVersion: 1,
  sound: true,
  reducedMotion: false,
}

export const EMPTY_GEO_STATS: PersistedGeoStats = {
  schemaVersion: 1,
  runs: [],
}

export interface StorageLike {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export type PersistenceLoadStatus = 'ok' | 'missing' | 'invalid' | 'unavailable'

export interface PersistenceLoadResult<T> {
  status: PersistenceLoadStatus
  value: T
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

const isIsoDateTime = (value: unknown): value is string =>
  typeof value === 'string' && Number.isFinite(Date.parse(value))

const isIsoDate = (value: unknown): value is string => {
  if (typeof value !== 'string') return false

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  )
}

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

const nearlyEqual = (left: number, right: number, tolerance = 0.001) =>
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

const readJson = (
  storage: StorageLike | null,
  key: string,
): PersistenceLoadResult<unknown> => {
  if (!storage) return { status: 'unavailable', value: null }

  try {
    const raw = storage.getItem(key)
    if (raw === null) return { status: 'missing', value: null }
    return { status: 'ok', value: JSON.parse(raw) }
  } catch {
    return { status: 'invalid', value: null }
  }
}

const writeJson = (
  storage: StorageLike | null,
  key: string,
  value: unknown,
) => {
  if (!storage) return false

  try {
    storage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export const getBrowserGeoStorage = (): StorageLike | null => {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage
  } catch {
    return null
  }
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
): PersistenceLoadResult<GeoSettings> => {
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
): PersistenceLoadResult<PersistedGeoStats> => {
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
    ) ||
    !nearlyEqual(
      answer.answerCoordinate.longitude,
      question.answerCoordinate.longitude,
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
    nearlyEqual(answer.remainingMs, expected.remainingMs)
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
    answers.length > (legacyTimerRecord ? questions.length : 4096) ||
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
  const firstUnanswered = questions.find(
    (entry) => !answeredIds.has(entry.question.id),
  )
  let normalizedStatus: PersistedGeoRun['status'] = candidate.status
  let normalizedRoundIndex = candidate.roundIndex
  let normalizedQuestionIndex = candidate.questionIndex
  let normalizedRoundComplete = candidate.roundComplete ?? false
  let normalizedFeedbackPending = candidate.feedbackPending ?? false
  let normalizedQuestionElapsedMs = candidate.questionElapsedMs ?? 0
  let normalizedRoundElapsedMs = candidate.roundElapsedMs ?? 0
  let normalizedCompletedAt = candidate.completedAt

  if (legacyTimerRecord) {
    if (candidate.status === 'started' && !firstUnanswered) {
      normalizedStatus = 'completed'
      normalizedRoundIndex = challenge.rounds.length - 1
      normalizedQuestionIndex =
        (challenge.rounds.at(-1)?.questions.length ?? 1) - 1
      normalizedRoundComplete = true
      normalizedFeedbackPending = false
      normalizedQuestionElapsedMs = 0
      normalizedRoundElapsedMs = roundTimeLimitMs(
        challenge.rounds[normalizedRoundIndex],
      )
      normalizedCompletedAt =
        candidate.completedAt ?? answers.at(-1)?.answeredAt
    } else if (firstUnanswered) {
      normalizedRoundIndex = firstUnanswered.roundIndex
      normalizedQuestionIndex = firstUnanswered.questionIndex
      const oldPositionWasAnswered = answeredIds.has(positionQuestion.id)
      const activeQuestionElapsed =
        firstUnanswered.roundIndex === candidate.roundIndex &&
        !oldPositionWasAnswered
          ? (candidate.questionElapsedMs ?? 0)
          : 0
      const elapsedAnsweredInRound = answers
        .filter((answer) => answer.roundId === firstUnanswered.round.id)
        .reduce((total, answer) => total + answer.elapsedMs, 0)
      normalizedRoundElapsedMs = Math.min(
        roundTimeLimitMs(firstUnanswered.round),
        elapsedAnsweredInRound + activeQuestionElapsed,
      )
      normalizedQuestionElapsedMs = activeQuestionElapsed
      normalizedRoundComplete = false
      normalizedFeedbackPending = false
    }
  }

  const normalizedRound = challenge.rounds[normalizedRoundIndex]
  const normalizedQuestion = normalizedRound
    ? legacyTimerRecord
      ? normalizedRound.questions[normalizedQuestionIndex]
      : roundQuestionForAttempt(normalizedRound, normalizedQuestionIndex)
    : null
  if (!normalizedRound || !normalizedQuestion) return null

  const currentRoundAnswerCount =
    answeredCountByRound.get(normalizedRoundIndex) ?? 0
  const lastCurrentRoundAnswer = [...answers]
    .reverse()
    .find((answer) => answer.roundId === normalizedRound.id)
  const currentQuestionAnswered =
    currentRoundAnswerCount > 0 &&
    normalizedQuestionIndex === currentRoundAnswerCount - 1 &&
    lastCurrentRoundAnswer?.questionId === normalizedQuestion.id &&
    (lastCurrentRoundAnswer.attemptIndex === undefined ||
      lastCurrentRoundAnswer.attemptIndex === normalizedQuestionIndex)
  const lastRecordedRoundElapsed =
    lastRoundElapsedByRound.get(normalizedRoundIndex) ?? 0
  const normalizedRoundLimitMs = roundTimeLimitMs(normalizedRound)
  const activePositionIsValid = normalizedFeedbackPending
    ? currentQuestionAnswered
    : normalizedQuestionIndex === currentRoundAnswerCount
  const completedPositionIsValid =
    normalizedQuestionIndex === currentRoundAnswerCount ||
    currentQuestionAnswered
  if (
    previousRoundIndex > normalizedRoundIndex ||
    normalizedRoundElapsedMs > normalizedRoundLimitMs ||
    normalizedQuestionElapsedMs > normalizedRoundLimitMs ||
    normalizedRoundElapsedMs < lastRecordedRoundElapsed ||
    (!normalizedRoundComplete &&
      normalizedRoundElapsedMs === normalizedRoundLimitMs) ||
    (!normalizedRoundComplete && !activePositionIsValid) ||
    (normalizedStatus === 'completed' &&
      (normalizedRoundIndex !== challenge.rounds.length - 1 ||
        !normalizedRoundComplete ||
        !isIsoDateTime(normalizedCompletedAt))) ||
    (normalizedRoundComplete &&
      (!completedPositionIsValid ||
        normalizedRoundElapsedMs !== normalizedRoundLimitMs))
  ) {
    return null
  }

  const streaks = expectedStreaks(answers)
  if (!streaks) return null
  const answerScore = answers.reduce((total, answer) => total + answer.score, 0)
  const deadlineEndedWithUnanswered =
    normalizedRoundComplete &&
    normalizedQuestionIndex === currentRoundAnswerCount
  const mayHaveResetBetweenRounds =
    currentRoundAnswerCount === 0 && normalizedRoundIndex > 0
  const currentStreakIsValid = deadlineEndedWithUnanswered
    ? candidate.currentStreak === 0
    : candidate.currentStreak === streaks.currentStreak ||
      (mayHaveResetBetweenRounds && candidate.currentStreak === 0)
  if (
    candidate.score !== answerScore ||
    !currentStreakIsValid ||
    candidate.bestStreak !== streaks.bestStreak ||
    (normalizedStatus === 'completed' && !isIsoDateTime(normalizedCompletedAt))
  ) {
    return null
  }

  return {
    schemaVersion: 1,
    challengeId: challenge.id,
    rulesVersion: challenge.rulesVersion,
    status: normalizedStatus,
    roundIndex: normalizedRoundIndex,
    questionIndex: normalizedQuestionIndex,
    answers,
    score: candidate.score,
    currentStreak: candidate.currentStreak,
    bestStreak: candidate.bestStreak,
    startedAt: candidate.startedAt,
    completedAt: normalizedCompletedAt,
    questionElapsedMs: normalizedQuestionElapsedMs,
    roundElapsedMs: normalizedRoundElapsedMs,
    roundComplete: normalizedRoundComplete,
    feedbackPending: normalizedFeedbackPending,
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
): PersistenceLoadResult<PersistedGeoRun | null> => {
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
