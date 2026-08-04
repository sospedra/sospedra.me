import { sumBy } from 'es-toolkit'
import { firstUnansweredPosition } from './game-state'
import type { AnswerResult, DailyGeoChallenge, PersistedGeoRun } from './model'
import {
  isIsoDateTime,
  roundQuestionForAttempt,
  roundTimeLimitMs,
} from './model'
import {
  answerMatchesQuestion,
  challengeQuestions,
  expectedStreaks,
} from './run-integrity'
import { persistedGeoRunSchema } from './run-schema'

// Caps a recycled timed run's answer log against hostile saves. No honest run reaches it.
const MAX_TIMED_RUN_ANSWERS = 4096

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
