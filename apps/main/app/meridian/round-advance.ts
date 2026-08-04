import {
  currentRound,
  type GeoGameState,
  hasAnsweredCurrentQuestion,
  normalizeElapsed,
} from './game-state'
import { isIsoDateTime, roundTimeLimitMs } from './model'

export const expireRound = (
  state: GeoGameState,
  elapsedMs: number,
  answeredAt: string,
): GeoGameState => {
  const round = currentRound(state)
  const limitMs = round ? roundTimeLimitMs(round) : 0
  if (
    (state.phase !== 'question' && state.phase !== 'feedback') ||
    !round ||
    !Number.isFinite(elapsedMs) ||
    elapsedMs < limitMs ||
    !isIsoDateTime(answeredAt)
  ) {
    return state
  }

  const roundElapsedMs = limitMs
  const isLastRound = state.roundIndex >= state.challenge.rounds.length - 1
  const currentAlreadyAnswered =
    state.phase === 'feedback' && hasAnsweredCurrentQuestion(state)

  return {
    ...state,
    phase: 'round-summary',
    countdownReason: null,
    visibilityReturnPhase: 'question',
    currentStreak: currentAlreadyAnswered ? state.currentStreak : 0,
    roundElapsedMs,
    completedAt: isLastRound ? answeredAt : state.completedAt,
    lastAnswer: null,
  }
}

export const finishFeedback = (
  state: GeoGameState,
  completedAt: string,
  roundElapsedMs?: number,
): GeoGameState => {
  if (state.phase !== 'feedback' || !isIsoDateTime(completedAt)) return state

  const round = currentRound(state)
  if (!round) return state
  const reportedElapsedMs = normalizeElapsed(
    roundElapsedMs ?? 0,
    roundTimeLimitMs(round),
  )
  const nextRoundElapsedMs =
    reportedElapsedMs === null
      ? state.roundElapsedMs
      : Math.max(state.roundElapsedMs, reportedElapsedMs)
  if (nextRoundElapsedMs >= roundTimeLimitMs(round)) {
    return expireRound(state, nextRoundElapsedMs, completedAt)
  }

  const isLastQuestion = state.questionIndex >= round.questions.length - 1
  const isLastRound = state.roundIndex >= state.challenge.rounds.length - 1

  if (!state.timed && isLastQuestion) {
    return {
      ...state,
      phase: 'round-summary',
      visibilityReturnPhase: 'question',
      roundElapsedMs: nextRoundElapsedMs,
      questionElapsedMs: 0,
      completedAt: isLastRound ? completedAt : state.completedAt,
    }
  }

  return {
    ...state,
    phase: 'question',
    visibilityReturnPhase: 'question',
    questionIndex: state.questionIndex + 1,
    roundElapsedMs: nextRoundElapsedMs,
    questionElapsedMs: 0,
    lastAnswer: null,
  }
}
