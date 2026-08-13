import { clamp } from 'es-toolkit'
import type {
  AnswerResult,
  DailyGeoChallenge,
  GeoCoordinate,
  PersistedGeoRun,
  Question,
  Round,
  RunKind,
} from './model'
import { roundQuestionForAttempt, roundTimeLimitMs } from './model'

export type GeoGamePhase =
  | 'idle'
  | 'countdown'
  | 'question'
  | 'feedback'
  | 'round-summary'
  | 'between-rounds-paused'
  | 'visibility-paused'
  | 'completed'

export type GeoGameOverlay = 'settings' | 'help' | null
export type CountdownReason = 'run-start' | 'round-start' | 'resume'
export type VisibilityReturnPhase = 'question' | 'feedback'

export type GeoGameState = {
  challenge: DailyGeoChallenge
  runKind: RunKind
  /**
   * Timed rounds recycle their finite section deck until the shared deadline.
   * Untimed practice keeps the finite, exhaustible deck.
   */
  timed: boolean
  phase: GeoGamePhase
  overlay: GeoGameOverlay
  countdownReason: CountdownReason | null
  visibilityReturnPhase: VisibilityReturnPhase
  roundIndex: number
  questionIndex: number
  answers: AnswerResult[]
  score: number
  currentStreak: number
  bestStreak: number
  roundElapsedMs: number
  questionElapsedMs: number
  startedAt: string | null
  completedAt: string | null
  lastAnswer: AnswerResult | null
}

export type GeoGameAction =
  | { type: 'START'; startedAt: string }
  | { type: 'COUNTDOWN_FINISHED' }
  | {
      type: 'SUBMIT_CHOICE'
      optionId: string
      elapsedMs: number
      roundElapsedMs?: number
      answeredAt: string
    }
  | {
      type: 'SUBMIT_MAP'
      coordinate: GeoCoordinate
      elapsedMs: number
      roundElapsedMs?: number
      answeredAt: string
    }
  | {
      type: 'SKIP_QUESTION'
      elapsedMs: number
      roundElapsedMs?: number
      answeredAt: string
    }
  | {
      type: 'ROUND_TIME_EXPIRED'
      roundElapsedMs: number
      answeredAt: string
    }
  | {
      type: 'FEEDBACK_FINISHED'
      completedAt: string
      roundElapsedMs?: number
    }
  | { type: 'ROUND_SUMMARY_FINISHED' }
  | { type: 'PAUSE_BETWEEN_ROUNDS' }
  | { type: 'RESUME_BETWEEN_ROUNDS' }
  | {
      type: 'VISIBILITY_HIDDEN'
      elapsedMs: number
      roundElapsedMs?: number
    }
  | { type: 'RESUME_FROM_VISIBILITY' }
  | { type: 'OPEN_OVERLAY'; overlay: Exclude<GeoGameOverlay, null> }
  | { type: 'CLOSE_OVERLAY' }

export type CreateGeoGameOptions = {
  runKind?: RunKind
  timed?: boolean
}

export const normalizeElapsed = (
  elapsedMs: number,
  limitMs: number,
): number | null => {
  if (!Number.isFinite(elapsedMs)) return null
  return clamp(elapsedMs, 0, Math.max(0, limitMs))
}

export const createGeoGameState = (
  challenge: DailyGeoChallenge,
  options: CreateGeoGameOptions = {},
): GeoGameState => ({
  challenge,
  runKind: options.runKind ?? 'official',
  timed: options.timed ?? true,
  phase: 'idle',
  overlay: null,
  countdownReason: null,
  visibilityReturnPhase: 'question',
  roundIndex: 0,
  questionIndex: 0,
  answers: [],
  score: 0,
  currentStreak: 0,
  bestStreak: 0,
  roundElapsedMs: 0,
  questionElapsedMs: 0,
  startedAt: null,
  completedAt: null,
  lastAnswer: null,
})

export const currentRound = (state: GeoGameState): Round | null =>
  state.challenge.rounds[state.roundIndex] ?? null

export const currentRoundTimeLimitMs = (state: GeoGameState) => {
  const round = currentRound(state)
  return round ? roundTimeLimitMs(round) : 0
}

export const currentQuestion = (state: GeoGameState): Question | null => {
  const round = currentRound(state)
  return round ? roundQuestionForAttempt(round, state.questionIndex) : null
}

export const hasAnsweredCurrentQuestion = (state: GeoGameState) => {
  const question = currentQuestion(state)
  const answer = state.lastAnswer
  return Boolean(
    question &&
      answer &&
      answer.questionId === question.id &&
      (answer.attemptIndex === undefined ||
        answer.attemptIndex === state.questionIndex),
  )
}

export const freezeForVisibility = (
  state: GeoGameState,
  elapsedMs: number,
  roundElapsedMs?: number,
): GeoGameState => {
  if (state.phase === 'countdown') {
    return { ...state, phase: 'visibility-paused' }
  }
  if (state.phase !== 'question' && state.phase !== 'feedback') return state

  const limitMs = currentRoundTimeLimitMs(state)
  const reportedElapsedMs = normalizeElapsed(elapsedMs, limitMs) ?? 0
  const reportedRoundElapsedMs =
    normalizeElapsed(roundElapsedMs ?? 0, limitMs) ?? 0
  return {
    ...state,
    phase: 'visibility-paused',
    visibilityReturnPhase: state.phase,
    roundElapsedMs: Math.max(
      state.roundElapsedMs,
      reportedElapsedMs,
      reportedRoundElapsedMs,
    ),
    questionElapsedMs: Math.max(state.questionElapsedMs, reportedElapsedMs),
  }
}

export const firstUnansweredPosition = (
  challenge: DailyGeoChallenge,
  answers: readonly AnswerResult[],
) => {
  const answeredIds = new Set(answers.map((answer) => answer.questionId))

  for (
    let roundIndex = 0;
    roundIndex < challenge.rounds.length;
    roundIndex += 1
  ) {
    const round = challenge.rounds[roundIndex]
    for (
      let questionIndex = 0;
      questionIndex < round.questions.length;
      questionIndex += 1
    ) {
      if (!answeredIds.has(round.questions[questionIndex].id)) {
        return { roundIndex, questionIndex }
      }
    }
  }

  return null
}

const hasRoundClockMetadata = (persisted: PersistedGeoRun): boolean =>
  persisted.roundElapsedMs !== undefined ||
  persisted.roundComplete !== undefined ||
  persisted.feedbackPending !== undefined

const restoredPhase = (
  completed: boolean,
  roundComplete: boolean,
): GeoGameState['phase'] => {
  if (completed) return 'completed'
  if (roundComplete) return 'round-summary'
  return 'visibility-paused'
}

const restoredCompletedAt = (
  persisted: PersistedGeoRun,
  completed: boolean,
): string | null =>
  persisted.completedAt ??
  (completed ? (persisted.answers.at(-1)?.answeredAt ?? null) : null)

type RestoredRunFacts = {
  position: { roundIndex: number; questionIndex: number } | null
  completed: boolean
  roundLimitMs: number
  roundComplete: boolean
  feedbackPending: boolean
  lastRoundAnswer: AnswerResult | null
}

const restoredRunFacts = (
  challenge: DailyGeoChallenge,
  persisted: PersistedGeoRun,
): RestoredRunFacts => {
  const timedRecord = hasRoundClockMetadata(persisted)
  const legacyPosition = firstUnansweredPosition(challenge, persisted.answers)
  const position = timedRecord
    ? {
        roundIndex: persisted.roundIndex,
        questionIndex: persisted.questionIndex,
      }
    : legacyPosition
  const completed =
    persisted.status === 'completed' || (!timedRecord && !legacyPosition)
  const round = position
    ? challenge.rounds[position.roundIndex]
    : challenge.rounds[persisted.roundIndex]
  const roundComplete = !completed && (persisted.roundComplete ?? false)
  return {
    position,
    completed,
    roundLimitMs: round ? roundTimeLimitMs(round) : 0,
    roundComplete,
    feedbackPending:
      !completed && !roundComplete && (persisted.feedbackPending ?? false),
    lastRoundAnswer:
      [...persisted.answers]
        .reverse()
        .find((answer) => answer.roundId === round?.id) ?? null,
  }
}

export const restoreGeoGameState = (
  challenge: DailyGeoChallenge,
  persisted: PersistedGeoRun,
  options: Pick<CreateGeoGameOptions, 'runKind' | 'timed'> = {},
): GeoGameState => {
  const initial = createGeoGameState(challenge, {
    runKind: options.runKind,
    timed: options.timed,
  })
  const facts = restoredRunFacts(challenge, persisted)
  return {
    ...initial,
    phase: restoredPhase(facts.completed, facts.roundComplete),
    visibilityReturnPhase: facts.feedbackPending ? 'feedback' : 'question',
    roundIndex: facts.position?.roundIndex ?? persisted.roundIndex,
    questionIndex: facts.position?.questionIndex ?? persisted.questionIndex,
    answers: [...persisted.answers],
    score: persisted.score,
    currentStreak: persisted.currentStreak,
    bestStreak: persisted.bestStreak,
    roundElapsedMs:
      normalizeElapsed(persisted.roundElapsedMs ?? 0, facts.roundLimitMs) ?? 0,
    questionElapsedMs:
      normalizeElapsed(persisted.questionElapsedMs ?? 0, facts.roundLimitMs) ??
      0,
    startedAt: persisted.startedAt,
    completedAt: restoredCompletedAt(persisted, facts.completed),
    lastAnswer:
      facts.roundComplete || facts.feedbackPending
        ? facts.lastRoundAnswer
        : null,
  }
}
