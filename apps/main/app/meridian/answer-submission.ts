import { haversineDistanceKm, isGeoCoordinate } from 'services/distance'
import {
  currentQuestion,
  currentRound,
  type GeoGameAction,
  type GeoGameState,
  hasAnsweredCurrentQuestion,
  normalizeElapsed,
} from './game-state'
import type {
  AnswerResult,
  ChoiceAnswerResult,
  MapPinAnswerResult,
  Question,
  Round,
} from './model'
import { isIsoDateTime, roundTimeLimitMs } from './model'
import { expireRound } from './round-advance'
import { scoreChoiceAnswer, scoreMapAnswer } from './scoring'

const appendAnswer = (
  state: GeoGameState,
  answer: AnswerResult,
): GeoGameState => {
  const currentStreak = answer.correct ? state.currentStreak + 1 : 0
  const round = currentRound(state)
  if (!round) return state

  const roundElapsedMs =
    normalizeElapsed(
      answer.roundElapsedMs ?? answer.elapsedMs,
      roundTimeLimitMs(round),
    ) ?? state.roundElapsedMs
  const answers = [...state.answers, answer]
  return {
    ...state,
    phase: 'feedback',
    countdownReason: null,
    visibilityReturnPhase: 'feedback',
    answers,
    score: state.score + answer.score,
    currentStreak,
    bestStreak: Math.max(state.bestStreak, currentStreak),
    roundElapsedMs,
    questionElapsedMs: answer.elapsedMs,
    lastAnswer: answer,
  }
}

const answerBase = ({
  answeredAt,
  correct,
  elapsedMs,
  expired,
  question,
  round,
  roundElapsedMs,
  score,
  state,
}: {
  answeredAt: string
  correct: boolean
  elapsedMs: number
  expired: boolean
  question: Question
  round: Round
  roundElapsedMs: number
  score: {
    baseScore: number
    streakMultiplier: number
    score: number
    remainingMs: number
  }
  state: GeoGameState
}) => ({
  questionId: question.id,
  roundId: round.id,
  roundType: round.type,
  difficulty: question.difficulty,
  attemptIndex: state.questionIndex,
  elapsedMs,
  roundElapsedMs,
  questionLimitMs: round.questionLimitMs,
  remainingMs: score.remainingMs,
  correct,
  expired,
  baseScore: score.baseScore,
  streakBefore: state.currentStreak,
  streakAfter: correct ? state.currentStreak + 1 : 0,
  streakMultiplier: score.streakMultiplier,
  score: score.score,
  answeredAt,
})

const answerClocks = (
  state: GeoGameState,
  round: Round,
  elapsedMs: number,
  roundElapsedMs?: number,
) => {
  const limitMs = roundTimeLimitMs(round)
  const responseElapsedMs = normalizeElapsed(elapsedMs, limitMs)
  const reportedRoundElapsedMs = normalizeElapsed(roundElapsedMs ?? 0, limitMs)
  if (responseElapsedMs === null || reportedRoundElapsedMs === null) return null

  return {
    responseElapsedMs,
    roundElapsedMs: Math.max(
      state.roundElapsedMs,
      responseElapsedMs,
      reportedRoundElapsedMs,
    ),
  }
}

type AnswerAttempt = {
  elapsedMs: number
  roundElapsedMs?: number
  answeredAt: string
}

type AnswerWindow = {
  round: Round
  question: Question
  responseElapsedMs: number
  roundElapsedMs: number
}

const canAnswer = (
  state: GeoGameState,
  attempt: AnswerAttempt,
): AnswerWindow | null => {
  const round = currentRound(state)
  const question = currentQuestion(state)
  if (state.phase !== 'question' || !round || !question) return null
  if (hasAnsweredCurrentQuestion(state) || !isIsoDateTime(attempt.answeredAt)) {
    return null
  }

  const clocks = answerClocks(
    state,
    round,
    attempt.elapsedMs,
    attempt.roundElapsedMs,
  )
  return clocks ? { round, question, ...clocks } : null
}

export const submitChoice = (
  state: GeoGameState,
  action: Extract<GeoGameAction, { type: 'SUBMIT_CHOICE' }>,
) => {
  const answerWindow = canAnswer(state, action)
  if (!answerWindow) return state
  const { question, round } = answerWindow
  if (
    question.type === 'map' ||
    !question.options.some((option) => option.id === action.optionId)
  ) {
    return state
  }
  if (answerWindow.roundElapsedMs >= roundTimeLimitMs(round)) {
    return expireRound(state, answerWindow.roundElapsedMs, action.answeredAt)
  }

  const correct = action.optionId === question.correctOptionId
  const score = scoreChoiceAnswer({
    correct,
    elapsedMs: answerWindow.responseElapsedMs,
    questionLimitMs: round.questionLimitMs,
    correctStreak: state.currentStreak,
    rules: state.challenge.rules,
  })
  const answer: ChoiceAnswerResult = {
    ...answerBase({
      answeredAt: action.answeredAt,
      correct,
      elapsedMs: answerWindow.responseElapsedMs,
      expired: false,
      question,
      round,
      roundElapsedMs: answerWindow.roundElapsedMs,
      score,
      state,
    }),
    kind: 'choice',
    selectedOptionId: action.optionId,
    correctOptionId: question.correctOptionId,
  }

  return appendAnswer(state, answer)
}

export const submitMap = (
  state: GeoGameState,
  action: Extract<GeoGameAction, { type: 'SUBMIT_MAP' }>,
) => {
  const answerWindow = canAnswer(state, action)
  if (!answerWindow) return state
  const { question, round } = answerWindow
  if (question.type !== 'map' || !isGeoCoordinate(action.coordinate)) {
    return state
  }
  if (answerWindow.roundElapsedMs >= roundTimeLimitMs(round)) {
    return expireRound(state, answerWindow.roundElapsedMs, action.answeredAt)
  }

  const distanceKm = haversineDistanceKm(
    action.coordinate,
    question.answerCoordinate,
  )
  const mapScore = scoreMapAnswer(
    distanceKm,
    state.currentStreak,
    state.challenge.rules,
  )
  const correct = mapScore.baseScore > 0
  const answer: MapPinAnswerResult = {
    ...answerBase({
      answeredAt: action.answeredAt,
      correct,
      elapsedMs: answerWindow.responseElapsedMs,
      expired: false,
      question,
      round,
      roundElapsedMs: answerWindow.roundElapsedMs,
      score: {
        ...mapScore,
        remainingMs: Math.max(
          0,
          round.questionLimitMs - answerWindow.responseElapsedMs,
        ),
      },
      state,
    }),
    kind: 'map-pin',
    submittedCoordinate: action.coordinate,
    answerCoordinate: question.answerCoordinate,
    distanceKm,
    distanceBand: mapScore.distanceBand,
  }

  return appendAnswer(state, answer)
}

export const skipQuestion = (
  state: GeoGameState,
  action: Extract<GeoGameAction, { type: 'SKIP_QUESTION' }>,
): GeoGameState => {
  const answerWindow = canAnswer(state, action)
  if (!answerWindow) return state
  const { question, round } = answerWindow
  if (answerWindow.roundElapsedMs >= roundTimeLimitMs(round)) {
    return expireRound(state, answerWindow.roundElapsedMs, action.answeredAt)
  }

  const score = scoreChoiceAnswer({
    correct: false,
    elapsedMs: answerWindow.responseElapsedMs,
    questionLimitMs: round.questionLimitMs,
    correctStreak: state.currentStreak,
    rules: state.challenge.rules,
  })
  const base = {
    ...answerBase({
      answeredAt: action.answeredAt,
      correct: false,
      elapsedMs: answerWindow.responseElapsedMs,
      expired: false,
      question,
      round,
      roundElapsedMs: answerWindow.roundElapsedMs,
      score,
      state,
    }),
    skipped: true as const,
  }

  if (question.type !== 'map') {
    const answer: ChoiceAnswerResult = {
      ...base,
      kind: 'choice',
      selectedOptionId: null,
      correctOptionId: question.correctOptionId,
    }
    return appendAnswer(state, answer)
  }

  const answer: MapPinAnswerResult = {
    ...base,
    kind: 'map-pin',
    submittedCoordinate: null,
    answerCoordinate: question.answerCoordinate,
    distanceKm: null,
    distanceBand: 'miss',
  }
  return appendAnswer(state, answer)
}
