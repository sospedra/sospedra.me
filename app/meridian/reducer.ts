import { haversineDistanceKm, isGeoCoordinate } from 'services/distance'
import type {
  AnswerResult,
  ChoiceAnswerResult,
  DailyGeoChallenge,
  GeoCoordinate,
  MapPinAnswerResult,
  PersistedGeoRun,
  Question,
  Round,
  RunKind,
} from './model'
import {
  isIsoDateTime,
  roundQuestionForAttempt,
  roundTimeLimitMs,
} from './model'
import { scoreChoiceAnswer, scoreMapAnswer } from './scoring'

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

export interface GeoGameState {
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
      type: 'SUBMIT_TEXT'
      optionId: string | null
      submittedText: string
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

export interface CreateGeoGameOptions {
  runKind?: RunKind
  timed?: boolean
}

const normalizeElapsed = (
  elapsedMs: number,
  limitMs: number,
): number | null => {
  if (!Number.isFinite(elapsedMs)) return null
  return Math.min(Math.max(0, elapsedMs), Math.max(0, limitMs))
}

const assertNever = (value: never): never => {
  throw new Error(`Unhandled geo action: ${JSON.stringify(value)}`)
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

const currentRoundTimeLimitMs = (state: GeoGameState) => {
  const round = currentRound(state)
  return round ? roundTimeLimitMs(round) : 0
}

export const currentQuestion = (state: GeoGameState): Question | null => {
  const round = currentRound(state)
  return round ? roundQuestionForAttempt(round, state.questionIndex) : null
}

const hasAnsweredCurrentQuestion = (state: GeoGameState) => {
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

interface AnswerAttempt {
  elapsedMs: number
  roundElapsedMs?: number
  answeredAt: string
}

interface AnswerWindow {
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

const submitChoice = (
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

const submitText = (
  state: GeoGameState,
  action: Extract<GeoGameAction, { type: 'SUBMIT_TEXT' }>,
) => {
  const answerWindow = canAnswer(state, action)
  if (!answerWindow) return state
  const { question, round } = answerWindow
  const normalizedText = action.submittedText.trim()
  if (
    question.type === 'map' ||
    normalizedText.length === 0 ||
    (action.optionId !== null &&
      !question.options.some((option) => option.id === action.optionId))
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
    submittedText: normalizedText,
  }

  return appendAnswer(state, answer)
}

const submitMap = (
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

const skipQuestion = (
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

const expireRound = (
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

const finishFeedback = (
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

export const restoreGeoGameState = (
  challenge: DailyGeoChallenge,
  persisted: PersistedGeoRun,
  options: Pick<CreateGeoGameOptions, 'runKind' | 'timed'> = {},
): GeoGameState => {
  const initial = createGeoGameState(challenge, {
    runKind: options.runKind,
    timed: options.timed,
  })
  const hasRoundClockMetadata =
    persisted.roundElapsedMs !== undefined ||
    persisted.roundComplete !== undefined ||
    persisted.feedbackPending !== undefined
  const legacyPosition = firstUnansweredPosition(challenge, persisted.answers)
  const position = hasRoundClockMetadata
    ? {
        roundIndex: persisted.roundIndex,
        questionIndex: persisted.questionIndex,
      }
    : legacyPosition
  const completed =
    persisted.status === 'completed' ||
    (!hasRoundClockMetadata && !legacyPosition)
  const round = position
    ? challenge.rounds[position.roundIndex]
    : challenge.rounds[persisted.roundIndex]
  const restoredRoundElapsed =
    normalizeElapsed(
      persisted.roundElapsedMs ?? 0,
      round ? roundTimeLimitMs(round) : 0,
    ) ?? 0
  const restoredQuestionElapsed =
    normalizeElapsed(
      persisted.questionElapsedMs ?? 0,
      round ? roundTimeLimitMs(round) : 0,
    ) ?? 0
  const roundComplete = !completed && (persisted.roundComplete ?? false)
  const feedbackPending =
    !completed && !roundComplete && (persisted.feedbackPending ?? false)
  const restoredRoundId = round?.id
  const lastRoundAnswer =
    [...persisted.answers]
      .reverse()
      .find((answer) => answer.roundId === restoredRoundId) ?? null

  return {
    ...initial,
    phase: completed
      ? 'completed'
      : roundComplete
        ? 'round-summary'
        : 'visibility-paused',
    visibilityReturnPhase: feedbackPending ? 'feedback' : 'question',
    roundIndex: position?.roundIndex ?? persisted.roundIndex,
    questionIndex: position?.questionIndex ?? persisted.questionIndex,
    answers: [...persisted.answers],
    score: persisted.score,
    currentStreak: persisted.currentStreak,
    bestStreak: persisted.bestStreak,
    roundElapsedMs: restoredRoundElapsed,
    questionElapsedMs: restoredQuestionElapsed,
    startedAt: persisted.startedAt,
    completedAt:
      persisted.completedAt ??
      (completed ? (persisted.answers.at(-1)?.answeredAt ?? null) : null),
    lastAnswer: roundComplete || feedbackPending ? lastRoundAnswer : null,
  }
}

export const geoGameReducer = (
  state: GeoGameState,
  action: GeoGameAction,
): GeoGameState => {
  switch (action.type) {
    case 'START':
      if (
        state.phase !== 'idle' ||
        !currentQuestion(state) ||
        !isIsoDateTime(action.startedAt)
      ) {
        return state
      }
      return {
        ...state,
        phase: 'countdown',
        countdownReason: 'run-start',
        startedAt: action.startedAt,
      }
    case 'COUNTDOWN_FINISHED':
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
    case 'SUBMIT_CHOICE':
      return submitChoice(state, action)
    case 'SUBMIT_TEXT':
      return submitText(state, action)
    case 'SUBMIT_MAP':
      return submitMap(state, action)
    case 'SKIP_QUESTION':
      return skipQuestion(state, action)
    case 'ROUND_TIME_EXPIRED':
      return expireRound(state, action.roundElapsedMs, action.answeredAt)
    case 'FEEDBACK_FINISHED':
      return finishFeedback(state, action.completedAt, action.roundElapsedMs)
    case 'ROUND_SUMMARY_FINISHED':
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
    case 'PAUSE_BETWEEN_ROUNDS':
      if (state.phase !== 'round-summary') return state
      return { ...state, phase: 'between-rounds-paused' }
    case 'RESUME_BETWEEN_ROUNDS':
      if (state.phase !== 'between-rounds-paused') return state
      return { ...state, phase: 'round-summary' }
    case 'VISIBILITY_HIDDEN':
      return freezeForVisibility(state, action.elapsedMs, action.roundElapsedMs)
    case 'RESUME_FROM_VISIBILITY':
      if (state.phase !== 'visibility-paused') return state
      return {
        ...state,
        phase: 'countdown',
        countdownReason: 'resume',
      }
    case 'OPEN_OVERLAY':
      if (
        state.overlay ||
        state.phase === 'question' ||
        state.phase === 'countdown'
      ) {
        return state
      }
      return { ...state, overlay: action.overlay }
    case 'CLOSE_OVERLAY':
      if (!state.overlay) return state
      return { ...state, overlay: null }
    default:
      return assertNever(action)
  }
}
