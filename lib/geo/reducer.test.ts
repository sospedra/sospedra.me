import assert from 'node:assert/strict'
import test from 'node:test'
import type {
  ChoiceQuestion,
  DailyGeoChallenge,
  PersistedGeoRun,
  Round,
} from './model.ts'
import { GEO_ROUND_LIMIT_MS, roundTimeLimitMs } from './model.ts'
import { serializeGeoRun, validatePersistedGeoRun } from './persistence.ts'
import {
  createGeoGameState,
  currentQuestion,
  type GeoGameState,
  geoGameReducer,
  restoreGeoGameState,
} from './reducer.ts'
import {
  createManualClock,
  createRoundTimer,
  pauseRoundTimer,
  readRoundTimer,
  resumeRoundTimer,
  startRoundTimer,
} from './timer.ts'

const STARTED_AT = '2026-07-27T10:00:00.000Z'

const makeQuestion = (
  roundIndex: number,
  questionIndex: number,
): ChoiceQuestion => ({
  id: `r${roundIndex}-q${questionIndex}`,
  type: 'shape',
  countryCode: `${roundIndex}${questionIndex}`,
  difficulty: questionIndex === 0 ? 1 : questionIndex === 1 ? 3 : 4,
  prompt: {
    en: `Country ${roundIndex}-${questionIndex}`,
    es: `País ${roundIndex}-${questionIndex}`,
  },
  options: [
    {
      id: `correct-${roundIndex}-${questionIndex}`,
      label: { en: 'Correct', es: 'Correcta' },
    },
    {
      id: `wrong-${roundIndex}-${questionIndex}`,
      label: { en: 'Wrong', es: 'Incorrecta' },
    },
  ],
  correctOptionId: `correct-${roundIndex}-${questionIndex}`,
})

const makeRound = (
  roundIndex: number,
  questionCount: number,
  roundLimitMs: number | undefined = GEO_ROUND_LIMIT_MS,
): Round => ({
  id: `round-${roundIndex}`,
  type: 'shape',
  questionLimitMs: 10_000,
  ...(roundLimitMs === undefined ? {} : { roundLimitMs }),
  questions: Array.from({ length: questionCount }, (_value, questionIndex) =>
    makeQuestion(roundIndex, questionIndex),
  ),
})

const makeChallenge = (...questionCounts: number[]): DailyGeoChallenge => ({
  schemaVersion: 1,
  generatorVersion: 'test-generator',
  rulesVersion: 'test-rules',
  id: 'test-challenge',
  publicationDate: '2026-07-27',
  seed: 'test-seed',
  sourceRevision: 'test-source',
  cityOptions: [],
  rounds: questionCounts.map((questionCount, roundIndex) =>
    makeRound(roundIndex, questionCount),
  ),
})

const startRun = (
  challenge: DailyGeoChallenge,
  options: Parameters<typeof createGeoGameState>[1] = {},
): GeoGameState => {
  const started = geoGameReducer(createGeoGameState(challenge, options), {
    type: 'START',
    startedAt: STARTED_AT,
  })
  return geoGameReducer(started, { type: 'COUNTDOWN_FINISHED' })
}

const answerAndAdvance = (
  state: GeoGameState,
  sequence: number,
): GeoGameState => {
  const question = currentQuestion(state)
  assert.ok(question && question.type !== 'map')
  const roundElapsedMs = sequence * 1_000
  const answeredAt = new Date(
    Date.parse(STARTED_AT) + roundElapsedMs,
  ).toISOString()
  const feedback = geoGameReducer(state, {
    type: 'SUBMIT_CHOICE',
    optionId: question.correctOptionId,
    elapsedMs: 500,
    roundElapsedMs,
    answeredAt,
  })
  assert.equal(feedback.phase, 'feedback')

  return geoGameReducer(feedback, {
    type: 'FEEDBACK_FINISHED',
    completedAt: answeredAt,
    roundElapsedMs,
  })
}

test('uses a fixed 60-second fallback regardless of deck length', () => {
  assert.equal(roundTimeLimitMs(makeRound(0, 1, undefined)), 60_000)
  assert.equal(roundTimeLimitMs(makeRound(0, 50, undefined)), 60_000)
})

test('keeps one shared clock across pauses instead of resetting per question', () => {
  const clock = createManualClock()
  let timer = startRoundTimer(createRoundTimer(60_000), clock.now())
  clock.advanceBy(12_000)
  timer = pauseRoundTimer(timer, clock.now())
  clock.advanceBy(5_000)
  timer = resumeRoundTimer(timer, clock.now())
  clock.advanceBy(8_000)

  const reading = readRoundTimer(timer, clock.now())
  assert.equal(reading.elapsedMs, 20_000)
  assert.equal(reading.remainingMs, 40_000)
  assert.equal(reading.expired, false)
})

test('keeps serving and recycles only the hard tail until time expires', () => {
  let state = startRun(makeChallenge(7))

  for (let sequence = 1; sequence <= 7; sequence += 1) {
    state = answerAndAdvance(state, sequence)
  }

  assert.equal(state.phase, 'question')
  assert.equal(state.questionIndex, 7)
  assert.equal(state.answers.length, 7)
  assert.equal(state.roundElapsedMs, 7_000)
  assert.equal(currentQuestion(state)?.id, 'r0-q2')

  for (let sequence = 8; sequence <= 12; sequence += 1) {
    state = answerAndAdvance(state, sequence)
  }

  assert.equal(state.phase, 'question')
  assert.equal(state.questionIndex, 12)
  assert.equal(state.answers.length, 12)
  assert.deepEqual(
    state.answers.map((answer) => answer.attemptIndex),
    Array.from({ length: 12 }, (_value, index) => index),
  )
  assert.ok(state.answers.slice(7).every((answer) => answer.difficulty === 4))

  const earlyExpiry = geoGameReducer(state, {
    type: 'ROUND_TIME_EXPIRED',
    roundElapsedMs: 59_999,
    answeredAt: '2026-07-27T10:00:59.999Z',
  })
  assert.strictEqual(earlyExpiry, state)

  state = geoGameReducer(state, {
    type: 'ROUND_TIME_EXPIRED',
    roundElapsedMs: 60_000,
    answeredAt: '2026-07-27T10:01:00.000Z',
  })
  assert.equal(state.phase, 'round-summary')
  assert.equal(state.roundElapsedMs, 60_000)
})

test('untimed practice still ends when its finite deck is exhausted', () => {
  const challenge = makeChallenge(3)
  let state = startRun(challenge, { runKind: 'practice', timed: false })

  for (let sequence = 1; sequence <= 3; sequence += 1) {
    state = answerAndAdvance(state, sequence)
  }

  assert.equal(state.phase, 'round-summary')
  assert.equal(state.questionIndex, 2)
  assert.equal(state.answers.length, 3)
  assert.equal(state.roundElapsedMs, 3_000)
})

test('accepts expiry only at the shared round deadline', () => {
  const state = startRun(makeChallenge(12))
  const early = geoGameReducer(state, {
    type: 'ROUND_TIME_EXPIRED',
    roundElapsedMs: 59_999,
    answeredAt: '2026-07-27T10:00:59.999Z',
  })

  assert.strictEqual(early, state)

  const expired = geoGameReducer(state, {
    type: 'ROUND_TIME_EXPIRED',
    roundElapsedMs: 60_000,
    answeredAt: '2026-07-27T10:01:00.000Z',
  })
  assert.equal(expired.phase, 'round-summary')
  assert.equal(expired.roundElapsedMs, 60_000)
  assert.equal(expired.answers.length, 0)
  assert.equal(expired.currentStreak, 0)
})

test('deadline during feedback preserves the accepted answer and seals once', () => {
  const active = startRun(makeChallenge(3))
  const question = currentQuestion(active)
  assert.ok(question && question.type !== 'map')
  const feedback = geoGameReducer(active, {
    type: 'SUBMIT_CHOICE',
    optionId: question.correctOptionId,
    elapsedMs: 500,
    roundElapsedMs: 59_900,
    answeredAt: '2026-07-27T10:00:59.900Z',
  })
  assert.equal(feedback.phase, 'feedback')
  assert.equal(feedback.currentStreak, 1)

  const expired = geoGameReducer(feedback, {
    type: 'FEEDBACK_FINISHED',
    completedAt: '2026-07-27T10:01:00.000Z',
    roundElapsedMs: 60_000,
  })
  assert.equal(expired.phase, 'round-summary')
  assert.equal(expired.answers.length, 1)
  assert.equal(expired.questionIndex, 0)
  assert.equal(expired.currentStreak, 1)

  const staleExpiry = geoGameReducer(expired, {
    type: 'ROUND_TIME_EXPIRED',
    roundElapsedMs: 60_000,
    answeredAt: '2026-07-27T10:01:00.001Z',
  })
  assert.strictEqual(staleExpiry, expired)

  const serialized = serializeGeoRun(expired)
  assert.ok(serialized)
  assert.ok(validatePersistedGeoRun(serialized, expired.challenge))
})

test('never moves the shared clock backward during feedback or visibility pauses', () => {
  const state = startRun(makeChallenge(8))
  const question = currentQuestion(state)
  assert.ok(question && question.type !== 'map')
  const feedback = geoGameReducer(state, {
    type: 'SUBMIT_CHOICE',
    optionId: question.correctOptionId,
    elapsedMs: 2_000,
    roundElapsedMs: 15_000,
    answeredAt: '2026-07-27T10:00:15.000Z',
  })
  const advanced = geoGameReducer(feedback, {
    type: 'FEEDBACK_FINISHED',
    completedAt: '2026-07-27T10:00:15.100Z',
    roundElapsedMs: 14_000,
  })
  assert.equal(advanced.roundElapsedMs, 15_000)

  const paused = geoGameReducer(advanced, {
    type: 'VISIBILITY_HIDDEN',
    elapsedMs: 500,
    roundElapsedMs: 10_000,
  })
  assert.equal(paused.roundElapsedMs, 15_000)
  assert.equal(paused.questionElapsedMs, 500)
})

test('serializes and safely restores progress beyond five questions', () => {
  const challenge = makeChallenge(9)
  let state = startRun(challenge)
  for (let sequence = 1; sequence <= 6; sequence += 1) {
    state = answerAndAdvance(state, sequence)
  }

  const serialized = serializeGeoRun(state)
  assert.ok(serialized)
  const validated = validatePersistedGeoRun(serialized, challenge)
  assert.ok(validated)
  const restored = restoreGeoGameState(challenge, validated)

  assert.equal(restored.phase, 'visibility-paused')
  assert.equal(restored.visibilityReturnPhase, 'question')
  assert.equal(restored.questionIndex, 6)
  assert.equal(restored.answers.length, 6)
  assert.equal(restored.roundElapsedMs, 6_000)
})

test('restores both valid round endings and rejects premature completion', () => {
  const challenge = makeChallenge(8)
  let active = startRun(challenge)
  for (let sequence = 1; sequence <= 6; sequence += 1) {
    active = answerAndAdvance(active, sequence)
  }

  const activeSave = serializeGeoRun(active)
  assert.ok(activeSave)
  const premature: PersistedGeoRun = {
    ...activeSave,
    roundComplete: true,
    roundElapsedMs: 59_000,
  }
  assert.equal(validatePersistedGeoRun(premature, challenge), null)

  const expired = geoGameReducer(active, {
    type: 'ROUND_TIME_EXPIRED',
    roundElapsedMs: 60_000,
    answeredAt: '2026-07-27T10:01:00.000Z',
  })
  const expiredSave = serializeGeoRun(expired)
  assert.ok(expiredSave)
  const validatedExpired = validatePersistedGeoRun(expiredSave, challenge)
  assert.ok(validatedExpired)
  assert.equal(
    restoreGeoGameState(challenge, validatedExpired).phase,
    'round-summary',
  )

  let exhausted = startRun(challenge)
  for (let sequence = 1; sequence <= 9; sequence += 1) {
    exhausted = answerAndAdvance(exhausted, sequence)
  }
  const exhaustedSave = serializeGeoRun(exhausted)
  assert.ok(exhaustedSave)
  const validatedExhausted = validatePersistedGeoRun(exhaustedSave, challenge)
  assert.ok(validatedExhausted)
  assert.equal(validatedExhausted.roundElapsedMs, 9_000)
  assert.equal(
    restoreGeoGameState(challenge, validatedExhausted).phase,
    'visibility-paused',
  )
  assert.equal(validatedExhausted.questionIndex, 9)
  assert.equal(validatedExhausted.answers.at(-1)?.questionId, 'r0-q2')
  assert.equal(
    currentQuestion(restoreGeoGameState(challenge, validatedExhausted))?.id,
    'r0-q3',
  )
})

test('seals a visibility-pause save taken exactly at the deadline', () => {
  const challenge = makeChallenge(8)
  let state = startRun(challenge)
  state = answerAndAdvance(state, 1)
  assert.equal(state.currentStreak, 1)

  const pausedAtDeadline = geoGameReducer(state, {
    type: 'VISIBILITY_HIDDEN',
    elapsedMs: 250,
    roundElapsedMs: 60_000,
  })
  assert.equal(pausedAtDeadline.phase, 'visibility-paused')

  const serialized = serializeGeoRun(pausedAtDeadline)
  assert.ok(serialized)
  assert.equal(serialized.roundComplete, true)
  assert.equal(serialized.feedbackPending, false)
  assert.equal(serialized.currentStreak, 0)

  const validated = validatePersistedGeoRun(serialized, challenge)
  assert.ok(validated)
  assert.equal(restoreGeoGameState(challenge, validated).phase, 'round-summary')
})
