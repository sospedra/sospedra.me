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

type GeoRound = DailyGeoChallenge['rounds'][number]
type GeoQuestion = GeoRound['questions'][number]
type ChallengeQuestionEntry = ReturnType<typeof challengeQuestions>[number]

type RunRecordFormat = 'legacy' | 'timed'

type RunScope = {
  challenge: DailyGeoChallenge
  format: RunRecordFormat
  questionCount: number
  entryByQuestionId: Map<string, ChallengeQuestionEntry>
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

type ValidatedPosition = NormalizedRunPosition & {
  currentRoundAnswerCount: number
}

type AnswerLog = {
  answeredCountByRound: Map<number, number>
  lastRoundElapsedByRound: Map<number, number>
  lastRoundIndex: number
}

const runRecordFormat = (candidate: PersistedGeoRun): RunRecordFormat => {
  const legacy =
    candidate.roundElapsedMs === undefined &&
    candidate.roundComplete === undefined &&
    candidate.feedbackPending === undefined &&
    candidate.answers.every(
      (answer) =>
        answer.roundElapsedMs === undefined &&
        answer.attemptIndex === undefined,
    )
  return legacy ? 'legacy' : 'timed'
}

const questionForFormat = (
  round: GeoRound,
  attemptIndex: number,
  format: RunRecordFormat,
): GeoQuestion | undefined =>
  format === 'legacy'
    ? round.questions[attemptIndex]
    : (roundQuestionForAttempt(round, attemptIndex) ?? undefined)

const parseCandidate = (
  value: unknown,
  challenge: DailyGeoChallenge,
): PersistedGeoRun | null => {
  const parsed = persistedGeoRunSchema.safeParse(value)
  if (!parsed.success) return null
  const candidate = parsed.data
  const matchesChallenge =
    candidate.challengeId === challenge.id &&
    candidate.rulesVersion === challenge.rulesVersion
  return matchesChallenge ? candidate : null
}

const exceedsPositionBudget = (
  candidate: PersistedGeoRun,
  positionRound: GeoRound,
): boolean => {
  const limitMs = roundTimeLimitMs(positionRound)
  return (
    (candidate.questionElapsedMs !== undefined &&
      candidate.questionElapsedMs > limitMs) ||
    (candidate.roundElapsedMs !== undefined &&
      candidate.roundElapsedMs > limitMs)
  )
}

const resolvePositionQuestion = (
  candidate: PersistedGeoRun,
  scope: RunScope,
): GeoQuestion | null => {
  const positionRound = scope.challenge.rounds[candidate.roundIndex]
  if (!positionRound) return null
  const positionQuestion = questionForFormat(
    positionRound,
    candidate.questionIndex,
    scope.format,
  )
  if (!positionQuestion) return null
  const maxAnswers =
    scope.format === 'legacy' ? scope.questionCount : MAX_TIMED_RUN_ANSWERS
  if (candidate.answers.length > maxAnswers) return null
  if (exceedsPositionBudget(candidate, positionRound)) return null
  return positionQuestion
}

const matchesExpectedAttempt = (
  answer: AnswerResult,
  expected: {
    question: GeoQuestion | undefined
    attemptIndex: number
    round: GeoRound
  },
  scope: RunScope,
): boolean => {
  if (expected.question?.id !== answer.questionId) return false
  if (
    answer.attemptIndex !== undefined &&
    answer.attemptIndex !== expected.attemptIndex
  ) {
    return false
  }
  return answerMatchesQuestion(
    answer,
    expected.question,
    expected.round,
    scope.challenge.rules,
  )
}

const recordAnswer = (
  answer: AnswerResult,
  log: AnswerLog,
  scope: RunScope,
): boolean => {
  const entry = scope.entryByQuestionId.get(answer.questionId)
  if (!entry || entry.roundIndex < log.lastRoundIndex) return false
  const attemptIndex = log.answeredCountByRound.get(entry.roundIndex) ?? 0
  const question = questionForFormat(entry.round, attemptIndex, scope.format)
  if (
    !matchesExpectedAttempt(
      answer,
      { question, attemptIndex, round: entry.round },
      scope,
    )
  ) {
    return false
  }
  const previousRoundElapsed =
    log.lastRoundElapsedByRound.get(entry.roundIndex) ?? 0
  if (
    answer.roundElapsedMs !== undefined &&
    answer.roundElapsedMs < previousRoundElapsed
  ) {
    return false
  }
  if (answer.roundElapsedMs !== undefined) {
    log.lastRoundElapsedByRound.set(entry.roundIndex, answer.roundElapsedMs)
  }
  log.answeredCountByRound.set(entry.roundIndex, attemptIndex + 1)
  log.lastRoundIndex = entry.roundIndex
  return true
}

const validateAnswerLog = (
  answers: readonly AnswerResult[],
  scope: RunScope,
): AnswerLog | null => {
  const log: AnswerLog = {
    answeredCountByRound: new Map(),
    lastRoundElapsedByRound: new Map(),
    lastRoundIndex: -1,
  }
  for (const answer of answers) {
    if (!recordAnswer(answer, log, scope)) return null
  }
  return log
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

type RoundPositionFacts = {
  roundLimitMs: number
  answeredCount: number
  currentQuestionAnswered: boolean
}

const withinTimeBudget = (
  normalized: NormalizedRunPosition,
  roundLimitMs: number,
  lastRecordedRoundElapsed: number,
): boolean =>
  normalized.roundElapsedMs <= roundLimitMs &&
  normalized.questionElapsedMs <= roundLimitMs &&
  normalized.roundElapsedMs >= lastRecordedRoundElapsed

const validActiveRound = (
  normalized: NormalizedRunPosition,
  position: RoundPositionFacts,
): boolean => {
  if (normalized.roundComplete) return true
  if (normalized.roundElapsedMs === position.roundLimitMs) return false
  return normalized.feedbackPending
    ? position.currentQuestionAnswered
    : normalized.questionIndex === position.answeredCount
}

const validCompletedRound = (
  normalized: NormalizedRunPosition,
  position: RoundPositionFacts,
): boolean => {
  if (!normalized.roundComplete) return true
  if (normalized.roundElapsedMs !== position.roundLimitMs) return false
  return (
    normalized.questionIndex === position.answeredCount ||
    position.currentQuestionAnswered
  )
}

const validCompletedRun = (
  normalized: NormalizedRunPosition,
  challenge: DailyGeoChallenge,
): boolean => {
  if (normalized.status !== 'completed') return true
  return (
    normalized.roundIndex === challenge.rounds.length - 1 &&
    normalized.roundComplete &&
    isIsoDateTime(normalized.completedAt)
  )
}

const normalizeRun = (
  candidate: PersistedGeoRun,
  scope: RunScope,
  dependencies: { log: AnswerLog; positionQuestion: GeoQuestion },
): ValidatedPosition | null => {
  const { answers } = candidate
  const firstUnanswered = firstUnansweredPosition(scope.challenge, answers)
  const answeredIds = new Set(answers.map((answer) => answer.questionId))
  const normalized =
    scope.format === 'legacy'
      ? normalizeLegacyRun({
          answers,
          candidate,
          challenge: scope.challenge,
          firstUnanswered,
          oldPositionWasAnswered: answeredIds.has(
            dependencies.positionQuestion.id,
          ),
        })
      : normalizeCurrentRun(candidate)

  const normalizedRound = scope.challenge.rounds[normalized.roundIndex]
  if (!normalizedRound) return null
  const normalizedQuestion = questionForFormat(
    normalizedRound,
    normalized.questionIndex,
    scope.format,
  )
  if (!normalizedQuestion) return null

  const currentRoundAnswerCount =
    dependencies.log.answeredCountByRound.get(normalized.roundIndex) ?? 0
  const lastCurrentRoundAnswer = [...answers]
    .reverse()
    .find((answer) => answer.roundId === normalizedRound.id)
  const currentQuestionAnswered =
    currentRoundAnswerCount > 0 &&
    normalized.questionIndex === currentRoundAnswerCount - 1 &&
    lastCurrentRoundAnswer?.questionId === normalizedQuestion.id &&
    (lastCurrentRoundAnswer.attemptIndex === undefined ||
      lastCurrentRoundAnswer.attemptIndex === normalized.questionIndex)
  const position: RoundPositionFacts = {
    roundLimitMs: roundTimeLimitMs(normalizedRound),
    answeredCount: currentRoundAnswerCount,
    currentQuestionAnswered,
  }
  const lastRecordedRoundElapsed =
    dependencies.log.lastRoundElapsedByRound.get(normalized.roundIndex) ?? 0
  const positionValid =
    dependencies.log.lastRoundIndex <= normalized.roundIndex &&
    withinTimeBudget(
      normalized,
      position.roundLimitMs,
      lastRecordedRoundElapsed,
    ) &&
    validActiveRound(normalized, position) &&
    validCompletedRound(normalized, position) &&
    validCompletedRun(normalized, scope.challenge)
  if (!positionValid) return null
  return { ...normalized, currentRoundAnswerCount }
}

const currentStreakMatches = (
  candidate: PersistedGeoRun,
  position: ValidatedPosition,
  expectedCurrentStreak: number,
): boolean => {
  const deadlineEndedWithUnanswered =
    position.roundComplete &&
    position.questionIndex === position.currentRoundAnswerCount
  if (deadlineEndedWithUnanswered) return candidate.currentStreak === 0
  if (candidate.currentStreak === expectedCurrentStreak) return true
  const mayHaveResetBetweenRounds =
    position.currentRoundAnswerCount === 0 && position.roundIndex > 0
  return mayHaveResetBetweenRounds && candidate.currentStreak === 0
}

const scoreAndStreaksMatch = (
  candidate: PersistedGeoRun,
  position: ValidatedPosition,
): boolean => {
  const streaks = expectedStreaks(candidate.answers)
  if (!streaks) return false
  const answerScore = sumBy(candidate.answers, (answer) => answer.score)
  if (candidate.score !== answerScore) return false
  if (candidate.bestStreak !== streaks.bestStreak) return false
  return currentStreakMatches(candidate, position, streaks.currentStreak)
}

export const validatePersistedGeoRun = (
  value: unknown,
  challenge: DailyGeoChallenge,
): PersistedGeoRun | null => {
  const candidate = parseCandidate(value, challenge)
  if (!candidate) return null
  const questions = challengeQuestions(challenge)
  const scope: RunScope = {
    challenge,
    format: runRecordFormat(candidate),
    questionCount: questions.length,
    entryByQuestionId: new Map(
      questions.map((entry) => [entry.question.id, entry]),
    ),
  }
  const positionQuestion = resolvePositionQuestion(candidate, scope)
  if (!positionQuestion) return null
  const log = validateAnswerLog(candidate.answers, scope)
  if (!log) return null
  const normalized = normalizeRun(candidate, scope, { log, positionQuestion })
  if (!normalized) return null
  if (!scoreAndStreaksMatch(candidate, normalized)) return null

  return {
    schemaVersion: 1,
    challengeId: challenge.id,
    rulesVersion: challenge.rulesVersion,
    status: normalized.status,
    roundIndex: normalized.roundIndex,
    questionIndex: normalized.questionIndex,
    answers: candidate.answers,
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
