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

export const answerMatchesQuestion = (
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
