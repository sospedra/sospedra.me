import { haversineDistanceKm, isGeoCoordinate } from './distance'
import type {
  AnswerResult,
  ChoiceAnswerResult,
  DailyGeoChallenge,
  GeoCoordinate,
  MapMode,
  MapPinAnswerResult,
  MapQuestion,
  MapRegionAnswerResult,
  PersistedGeoRun,
  Question,
  Round,
  RunKind,
} from './model'
import {
  mapRegionAlternativeFor,
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
  mapMode: MapMode
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
  /**
   * Authoritative elapsed time on the current round's shared clock.
   */
  roundElapsedMs: number
  /**
   * Elapsed response time for the active prompt.
   */
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
      type: 'SUBMIT_REGION'
      optionId: string
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
  /**
   * Backward-compatible action name dispatched by the current game shell.
   * It has round-expiry semantics.
   */
  | { type: 'TIME_EXPIRED'; elapsedMs: number; answeredAt: string }
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
  mapMode?: MapMode
}

const isIsoDateTime = (value: string) => Number.isFinite(Date.parse(value))

const normalizeElapsed = (elapsedMs: number, limitMs: number) => {
  if (!Number.isFinite(elapsedMs)) return Math.max(0, limitMs)
  return Math.min(Math.max(0, elapsedMs), Math.max(0, limitMs))
}

export const createGeoGameState = (
  challenge: DailyGeoChallenge,
  options: CreateGeoGameOptions = {},
): GeoGameState => ({
  challenge,
  runKind: options.runKind ?? 'official',
  timed: options.timed ?? true,
  mapMode: options.mapMode ?? 'pin',
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

  const roundElapsedMs = normalizeElapsed(
    answer.roundElapsedMs ?? answer.elapsedMs,
    roundTimeLimitMs(round),
  )
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

const answerBase = (
  state: GeoGameState,
  round: Round,
  question: Question,
  elapsedMs: number,
  answeredAt: string,
  roundElapsedMs: number,
  score: {
    baseScore: number
    streakMultiplier: number
    score: number
    remainingMs: number
  },
  correct: boolean,
  expired: boolean,
) => ({
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
) => ({
  responseElapsedMs: normalizeElapsed(elapsedMs, roundTimeLimitMs(round)),
  roundElapsedMs: normalizeElapsed(
    Math.max(state.roundElapsedMs, elapsedMs, roundElapsedMs ?? 0),
    roundTimeLimitMs(round),
  ),
})

const submitChoice = (
  state: GeoGameState,
  optionId: string,
  elapsedMs: number,
  roundElapsedMs: number | undefined,
  answeredAt: string,
) => {
  const round = currentRound(state)
  const question = currentQuestion(state)
  if (
    state.phase !== 'question' ||
    !round ||
    !question ||
    question.type === 'map' ||
    hasAnsweredCurrentQuestion(state) ||
    !question.options.some((option) => option.id === optionId) ||
    !isIsoDateTime(answeredAt)
  ) {
    return state
  }

  const clocks = answerClocks(state, round, elapsedMs, roundElapsedMs)
  if (clocks.roundElapsedMs >= roundTimeLimitMs(round)) {
    return expireRound(state, clocks.roundElapsedMs, answeredAt)
  }
  const correct = optionId === question.correctOptionId
  const score = scoreChoiceAnswer({
    correct,
    elapsedMs: clocks.responseElapsedMs,
    questionLimitMs: round.questionLimitMs,
    correctStreak: state.currentStreak,
    rules: state.challenge.rules,
  })
  const answer: ChoiceAnswerResult = {
    ...answerBase(
      state,
      round,
      question,
      clocks.responseElapsedMs,
      answeredAt,
      clocks.roundElapsedMs,
      score,
      correct,
      false,
    ),
    kind: 'choice',
    selectedOptionId: optionId,
    correctOptionId: question.correctOptionId,
  }

  return appendAnswer(state, answer)
}

const submitText = (
  state: GeoGameState,
  optionId: string | null,
  submittedText: string,
  elapsedMs: number,
  roundElapsedMs: number | undefined,
  answeredAt: string,
) => {
  const round = currentRound(state)
  const question = currentQuestion(state)
  const normalizedText = submittedText.trim()
  if (
    state.phase !== 'question' ||
    !round ||
    !question ||
    question.type === 'map' ||
    hasAnsweredCurrentQuestion(state) ||
    normalizedText.length === 0 ||
    (optionId !== null &&
      !question.options.some((option) => option.id === optionId)) ||
    !isIsoDateTime(answeredAt)
  ) {
    return state
  }

  const clocks = answerClocks(state, round, elapsedMs, roundElapsedMs)
  if (clocks.roundElapsedMs >= roundTimeLimitMs(round)) {
    return expireRound(state, clocks.roundElapsedMs, answeredAt)
  }
  const correct = optionId === question.correctOptionId
  const score = scoreChoiceAnswer({
    correct,
    elapsedMs: clocks.responseElapsedMs,
    questionLimitMs: round.questionLimitMs,
    correctStreak: state.currentStreak,
    rules: state.challenge.rules,
  })
  const answer: ChoiceAnswerResult = {
    ...answerBase(
      state,
      round,
      question,
      clocks.responseElapsedMs,
      answeredAt,
      clocks.roundElapsedMs,
      score,
      correct,
      false,
    ),
    kind: 'choice',
    selectedOptionId: optionId,
    correctOptionId: question.correctOptionId,
    submittedText: normalizedText,
  }

  return appendAnswer(state, answer)
}

const submitRegion = (
  state: GeoGameState,
  optionId: string,
  elapsedMs: number,
  roundElapsedMs: number | undefined,
  answeredAt: string,
) => {
  const round = currentRound(state)
  const question = currentQuestion(state)
  const alternative =
    question?.type === 'map' ? mapRegionAlternativeFor(question) : null
  if (
    state.phase !== 'question' ||
    state.mapMode !== 'region' ||
    !round ||
    !question ||
    question.type !== 'map' ||
    !alternative ||
    hasAnsweredCurrentQuestion(state) ||
    !alternative.options.some((option) => option.id === optionId) ||
    !isIsoDateTime(answeredAt)
  ) {
    return state
  }

  const clocks = answerClocks(state, round, elapsedMs, roundElapsedMs)
  if (clocks.roundElapsedMs >= roundTimeLimitMs(round)) {
    return expireRound(state, clocks.roundElapsedMs, answeredAt)
  }
  const correct = optionId === alternative.correctOptionId
  const score = scoreChoiceAnswer({
    correct,
    elapsedMs: clocks.responseElapsedMs,
    questionLimitMs: round.questionLimitMs,
    correctStreak: state.currentStreak,
    rules: state.challenge.rules,
  })
  const answer: MapRegionAnswerResult = {
    ...answerBase(
      state,
      round,
      question,
      clocks.responseElapsedMs,
      answeredAt,
      clocks.roundElapsedMs,
      score,
      correct,
      false,
    ),
    kind: 'map-region',
    selectedOptionId: optionId,
    correctOptionId: alternative.correctOptionId,
  }

  return appendAnswer(state, answer)
}

const submitMap = (
  state: GeoGameState,
  coordinate: GeoCoordinate,
  elapsedMs: number,
  roundElapsedMs: number | undefined,
  answeredAt: string,
) => {
  const round = currentRound(state)
  const question = currentQuestion(state)
  if (
    state.phase !== 'question' ||
    state.mapMode !== 'pin' ||
    !round ||
    !question ||
    question.type !== 'map' ||
    hasAnsweredCurrentQuestion(state) ||
    !isGeoCoordinate(coordinate) ||
    !isIsoDateTime(answeredAt)
  ) {
    return state
  }

  const clocks = answerClocks(state, round, elapsedMs, roundElapsedMs)
  if (clocks.roundElapsedMs >= roundTimeLimitMs(round)) {
    return expireRound(state, clocks.roundElapsedMs, answeredAt)
  }
  const distanceKm = haversineDistanceKm(coordinate, question.answerCoordinate)
  const mapScore = scoreMapAnswer(
    distanceKm,
    state.currentStreak,
    state.challenge.rules,
  )
  const correct = mapScore.baseScore > 0
  const answer: MapPinAnswerResult = {
    ...answerBase(
      state,
      round,
      question,
      clocks.responseElapsedMs,
      answeredAt,
      clocks.roundElapsedMs,
      {
        ...mapScore,
        remainingMs: Math.max(
          0,
          round.questionLimitMs - clocks.responseElapsedMs,
        ),
      },
      correct,
      false,
    ),
    kind: 'map-pin',
    submittedCoordinate: coordinate,
    answerCoordinate: question.answerCoordinate,
    distanceKm,
    distanceBand: mapScore.distanceBand,
  }

  return appendAnswer(state, answer)
}

const skipQuestion = (
  state: GeoGameState,
  elapsedMs: number,
  roundElapsedMs: number | undefined,
  answeredAt: string,
): GeoGameState => {
  const round = currentRound(state)
  const question = currentQuestion(state)
  if (
    state.phase !== 'question' ||
    !round ||
    !question ||
    hasAnsweredCurrentQuestion(state) ||
    !isIsoDateTime(answeredAt)
  ) {
    return state
  }

  const clocks = answerClocks(state, round, elapsedMs, roundElapsedMs)
  if (clocks.roundElapsedMs >= roundTimeLimitMs(round)) {
    return expireRound(state, clocks.roundElapsedMs, answeredAt)
  }
  const score = scoreChoiceAnswer({
    correct: false,
    elapsedMs: clocks.responseElapsedMs,
    questionLimitMs: round.questionLimitMs,
    correctStreak: state.currentStreak,
    rules: state.challenge.rules,
  })
  const base = {
    ...answerBase(
      state,
      round,
      question,
      clocks.responseElapsedMs,
      answeredAt,
      clocks.roundElapsedMs,
      score,
      false,
      false,
    ),
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

  const alternative = mapRegionAlternativeFor(question)
  if (state.mapMode === 'region') {
    if (!alternative) return state
    const answer: MapRegionAnswerResult = {
      ...base,
      kind: 'map-region',
      selectedOptionId: null,
      correctOptionId: alternative.correctOptionId,
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
  const nextRoundElapsedMs = normalizeElapsed(
    Math.max(state.roundElapsedMs, roundElapsedMs ?? 0),
    roundTimeLimitMs(round),
  )
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

const firstUnansweredPosition = (
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
    mapMode: persisted.mapMode ?? 'pin',
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
  const restoredRoundElapsed = normalizeElapsed(
    persisted.roundElapsedMs ?? 0,
    round ? roundTimeLimitMs(round) : 0,
  )
  const restoredQuestionElapsed = normalizeElapsed(
    persisted.questionElapsedMs ?? 0,
    round ? roundTimeLimitMs(round) : 0,
  )
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
      return submitChoice(
        state,
        action.optionId,
        action.elapsedMs,
        action.roundElapsedMs,
        action.answeredAt,
      )
    case 'SUBMIT_TEXT':
      return submitText(
        state,
        action.optionId,
        action.submittedText,
        action.elapsedMs,
        action.roundElapsedMs,
        action.answeredAt,
      )
    case 'SUBMIT_MAP':
      return submitMap(
        state,
        action.coordinate,
        action.elapsedMs,
        action.roundElapsedMs,
        action.answeredAt,
      )
    case 'SUBMIT_REGION':
      return submitRegion(
        state,
        action.optionId,
        action.elapsedMs,
        action.roundElapsedMs,
        action.answeredAt,
      )
    case 'SKIP_QUESTION':
      return skipQuestion(
        state,
        action.elapsedMs,
        action.roundElapsedMs,
        action.answeredAt,
      )
    case 'ROUND_TIME_EXPIRED':
      return expireRound(state, action.roundElapsedMs, action.answeredAt)
    case 'TIME_EXPIRED':
      return expireRound(state, action.elapsedMs, action.answeredAt)
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
      if (
        state.phase !== 'question' &&
        state.phase !== 'feedback' &&
        state.phase !== 'countdown'
      )
        return state
      return {
        ...state,
        phase: 'visibility-paused',
        visibilityReturnPhase:
          state.phase === 'feedback'
            ? 'feedback'
            : state.phase === 'question'
              ? 'question'
              : state.visibilityReturnPhase,
        roundElapsedMs:
          state.phase === 'question' || state.phase === 'feedback'
            ? normalizeElapsed(
                Math.max(
                  state.roundElapsedMs,
                  action.elapsedMs,
                  action.roundElapsedMs ?? 0,
                ),
                currentRoundTimeLimitMs(state),
              )
            : state.roundElapsedMs,
        questionElapsedMs:
          state.phase === 'question' || state.phase === 'feedback'
            ? normalizeElapsed(
                Math.max(state.questionElapsedMs, action.elapsedMs),
                currentRoundTimeLimitMs(state),
              )
            : state.questionElapsedMs,
      }
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
  }
}

export const isMapQuestion = (question: Question): question is MapQuestion =>
  question.type === 'map'
