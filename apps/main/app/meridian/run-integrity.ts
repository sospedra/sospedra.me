import { haversineDistanceKm } from 'services/distance'
import type {
  AnswerResult,
  DailyGeoChallenge,
  GeoChallengeRules,
  Question,
  Round,
} from './model'
import { roundTimeLimitMs } from './model'
import {
  mapBaseScoreForDistance,
  scoreChoiceAnswer,
  scoreMapAnswer,
} from './scoring'

export const nearlyEqual = (left: number, right: number, tolerance: number) =>
  Math.abs(left - right) <= tolerance

export const challengeQuestions = (challenge: DailyGeoChallenge) =>
  challenge.rounds.flatMap((round, roundIndex) =>
    round.questions.map((question, questionIndex) => ({
      question,
      round,
      roundIndex,
      questionIndex,
    })),
  )

export const expectedStreaks = (answers: readonly AnswerResult[]) => {
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

type ChoiceQuestion = Exclude<Question, { type: 'map' }>
type ChoiceAnswer = Extract<AnswerResult, { kind: 'choice' }>

const submittedChoiceMatches = (
  answer: ChoiceAnswer,
  question: ChoiceQuestion,
) => {
  const hasSubmission =
    answer.selectedOptionId !== null || Boolean(answer.submittedText)
  if (!hasSubmission) return false
  const selectionKnown =
    answer.selectedOptionId === null ||
    question.options.some((option) => option.id === answer.selectedOptionId)
  if (!selectionKnown) return false
  return (
    answer.correct === (answer.selectedOptionId === question.correctOptionId)
  )
}

const choiceAnswerMatches = (
  answer: AnswerResult,
  question: ChoiceQuestion,
) => {
  if (answer.kind !== 'choice') return false
  if (answer.correctOptionId !== question.correctOptionId) return false
  if (answer.skipped) {
    return (
      answer.selectedOptionId === null &&
      !answer.correct &&
      !answer.expired &&
      answer.score === 0
    )
  }
  if (answer.expired) {
    return answer.selectedOptionId === null && !answer.correct
  }
  return submittedChoiceMatches(answer, question)
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

const answerIdentityMatches = (
  answer: AnswerResult,
  question: Question,
  round: Round,
) =>
  answer.questionId === question.id &&
  answer.roundId === round.id &&
  answer.roundType === round.type &&
  answer.difficulty === question.difficulty &&
  answer.questionLimitMs === round.questionLimitMs

const answerTimingMatches = (answer: AnswerResult, round: Round) => {
  const roundLimitMs = roundTimeLimitMs(round)
  if (answer.elapsedMs > roundLimitMs) return false
  if (
    answer.roundElapsedMs !== undefined &&
    (answer.roundElapsedMs > roundLimitMs ||
      answer.roundElapsedMs < answer.elapsedMs)
  ) {
    return false
  }
  if (
    !nearlyEqual(
      Math.min(answer.elapsedMs, round.questionLimitMs) + answer.remainingMs,
      round.questionLimitMs,
      0.001,
    )
  ) {
    return false
  }
  if (
    answer.expired &&
    (answer.elapsedMs !== round.questionLimitMs || answer.remainingMs !== 0)
  ) {
    return false
  }
  return true
}

const answerFlagsMatch = (answer: AnswerResult) => {
  if (answer.expired && (answer.correct || answer.score !== 0)) return false
  if (
    answer.skipped &&
    (answer.correct || answer.expired || answer.score !== 0)
  ) {
    return false
  }
  return true
}

export const answerMatchesQuestion = (
  answer: AnswerResult,
  question: Question,
  round: Round,
  rules?: GeoChallengeRules,
) => {
  if (!answerIdentityMatches(answer, question, round)) return false
  if (!answerTimingMatches(answer, round)) return false
  if (!answerFlagsMatch(answer)) return false
  if (!scoreMatches(answer, rules)) return false
  if (question.type !== 'map') return choiceAnswerMatches(answer, question)
  return pinAnswerMatches(answer, question, rules)
}
