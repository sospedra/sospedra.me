import { match } from 'ts-pattern'
import { skipQuestion, submitChoice, submitMap } from './answer-submission'
import {
  createGeoGameState,
  currentQuestion,
  freezeForVisibility,
  type GeoGameAction,
  type GeoGameState,
  restoreGeoGameState,
} from './game-state'
import { isIsoDateTime } from './model'
import { expireRound, finishFeedback } from './round-advance'

export type { GeoGameState }
export { createGeoGameState, currentQuestion, restoreGeoGameState }

export const geoGameReducer = (
  state: GeoGameState,
  action: GeoGameAction,
): GeoGameState => {
  return match(action)
    .returnType<GeoGameState>()
    .with({ type: 'START' }, ({ startedAt }) => {
      if (
        state.phase !== 'idle' ||
        !currentQuestion(state) ||
        !isIsoDateTime(startedAt)
      ) {
        return state
      }
      return {
        ...state,
        phase: 'countdown',
        countdownReason: 'run-start',
        startedAt,
      }
    })
    .with({ type: 'COUNTDOWN_FINISHED' }, () => {
      if (state.phase !== 'countdown') return state
      return {
        ...state,
        phase:
          state.countdownReason === 'resume'
            ? state.visibilityReturnPhase
            : 'question',
        countdownReason: null,
        lastAnswer:
          state.countdownReason === 'resume' &&
          state.visibilityReturnPhase === 'feedback'
            ? state.lastAnswer
            : null,
      }
    })
    .with({ type: 'SUBMIT_CHOICE' }, (action) => submitChoice(state, action))
    .with({ type: 'SUBMIT_MAP' }, (action) => submitMap(state, action))
    .with({ type: 'SKIP_QUESTION' }, (action) => skipQuestion(state, action))
    .with({ type: 'ROUND_TIME_EXPIRED' }, (action) =>
      expireRound(state, action.roundElapsedMs, action.answeredAt),
    )
    .with({ type: 'FEEDBACK_FINISHED' }, (action) =>
      finishFeedback(state, action.completedAt, action.roundElapsedMs),
    )
    .with({ type: 'ROUND_SUMMARY_FINISHED' }, () => {
      if (state.phase !== 'round-summary') return state
      if (state.roundIndex >= state.challenge.rounds.length - 1) {
        return {
          ...state,
          phase: 'completed',
          completedAt:
            state.completedAt ??
            state.lastAnswer?.answeredAt ??
            state.answers.at(-1)?.answeredAt ??
            state.startedAt,
        }
      }
      return {
        ...state,
        phase: 'countdown',
        countdownReason: 'round-start',
        roundIndex: state.roundIndex + 1,
        questionIndex: 0,
        roundElapsedMs: 0,
        questionElapsedMs: 0,
        visibilityReturnPhase: 'question',
        lastAnswer: null,
      }
    })
    .with({ type: 'PAUSE_BETWEEN_ROUNDS' }, () => {
      if (state.phase !== 'round-summary') return state
      return { ...state, phase: 'between-rounds-paused' }
    })
    .with({ type: 'RESUME_BETWEEN_ROUNDS' }, () => {
      if (state.phase !== 'between-rounds-paused') return state
      return { ...state, phase: 'round-summary' }
    })
    .with({ type: 'VISIBILITY_HIDDEN' }, (action) =>
      freezeForVisibility(state, action.elapsedMs, action.roundElapsedMs),
    )
    .with({ type: 'RESUME_FROM_VISIBILITY' }, () => {
      if (state.phase !== 'visibility-paused') return state
      return {
        ...state,
        phase: 'countdown',
        countdownReason: 'resume',
      }
    })
    .with({ type: 'OPEN_OVERLAY' }, ({ overlay }) => {
      if (
        state.overlay ||
        state.phase === 'question' ||
        state.phase === 'countdown'
      ) {
        return state
      }
      return { ...state, overlay }
    })
    .with({ type: 'CLOSE_OVERLAY' }, () => {
      if (!state.overlay) return state
      return { ...state, overlay: null }
    })
    .exhaustive()
}
