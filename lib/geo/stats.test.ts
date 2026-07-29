import assert from 'node:assert/strict'
import test from 'node:test'
import type {
  AnswerResult,
  DailyGeoChallenge,
  OfficialGeoRunRecord,
} from './model.ts'
import {
  calculateDailyPlayStreak,
  calculateRunStatistics,
  createOfficialRunRecord,
  personalBestFor,
  recordOfficialRun,
} from './stats.ts'

const challenge = {
  schemaVersion: 1,
  generatorVersion: 'test',
  rulesVersion: 'geo-test',
  id: 'geo:2026-07-29',
  publicationDate: '2026-07-29',
  seed: 'seed',
  sourceRevision: 'rev',
  cityOptions: [],
  rounds: [
    {
      id: 'round-capital',
      type: 'capital',
      questionLimitMs: 10_000,
      roundLimitMs: 60_000,
      questions: [{ id: 'capital-01' }, { id: 'capital-02' }],
    },
    {
      id: 'round-map',
      type: 'map',
      questionLimitMs: 15_000,
      roundLimitMs: 60_000,
      questions: [{ id: 'map-es-1' }],
    },
  ],
} as unknown as DailyGeoChallenge

const choiceAnswer = (patch: Partial<AnswerResult>): AnswerResult =>
  ({
    kind: 'choice',
    questionId: 'capital-01',
    roundId: 'round-capital',
    roundType: 'capital',
    difficulty: 1,
    elapsedMs: 2_000,
    questionLimitMs: 10_000,
    remainingMs: 8_000,
    correct: true,
    expired: false,
    baseScore: 900,
    streakBefore: 0,
    streakAfter: 1,
    streakMultiplier: 1,
    score: 900,
    answeredAt: '2026-07-29T10:00:00.000Z',
    selectedOptionId: 'a',
    correctOptionId: 'a',
    ...patch,
  }) as AnswerResult

const answers: AnswerResult[] = [
  choiceAnswer({}),
  choiceAnswer({
    questionId: 'capital-02',
    elapsedMs: 3_000,
    correct: false,
    baseScore: 0,
    score: 0,
    streakAfter: 0,
    selectedOptionId: 'b',
  }),
  choiceAnswer({
    kind: 'map-pin',
    questionId: 'map-es-1',
    roundId: 'round-map',
    roundType: 'map',
    elapsedMs: 4_000,
    score: 1_300,
    baseScore: 1_000,
    streakMultiplier: 1.3,
    submittedCoordinate: { latitude: 40, longitude: -3 },
    answerCoordinate: { latitude: 40.4, longitude: -3.7 },
    distanceKm: 42,
    distanceBand: 'within-100',
  } as Partial<AnswerResult>),
]

test('run statistics aggregate score, accuracy, streak and medians', () => {
  const statistics = calculateRunStatistics(challenge, answers)
  assert.equal(statistics.totalScore, 2_200)
  assert.equal(statistics.correctAnswers, 2)
  assert.equal(statistics.totalQuestions, 3)
  assert.ok(Math.abs(statistics.accuracyPercentage - 66.667) < 0.01)
  assert.equal(statistics.bestCorrectStreak, 1)
  assert.equal(statistics.medianChoiceResponseMs, 2_500)
  assert.equal(statistics.medianMapErrorKm, 42)
  assert.deepEqual(
    statistics.rounds.map((round) => [round.type, round.score]),
    [
      ['capital', 900],
      ['map', 1_300],
    ],
  )
})

test('answers outside the published challenge are ignored', () => {
  const alien = choiceAnswer({ questionId: 'smuggled', score: 9_999 })
  const statistics = calculateRunStatistics(challenge, [...answers, alien])
  assert.equal(statistics.totalScore, 2_200)
  assert.equal(statistics.totalQuestions, 3)
})

test('official record derives from the run statistics', () => {
  const record = createOfficialRunRecord({
    answers,
    challenge,
    completedAt: '2026-07-29T10:05:00.000Z',
  })
  assert.deepEqual(record, {
    challengeId: 'geo:2026-07-29',
    publicationDate: '2026-07-29',
    rulesVersion: 'geo-test',
    completedAt: '2026-07-29T10:05:00.000Z',
    totalScore: 2_200,
    correctAnswers: 2,
    totalQuestions: 3,
    bestStreak: 1,
  })
})

const runRecord = (patch: Partial<OfficialGeoRunRecord>) => ({
  challengeId: 'geo:2026-07-29',
  publicationDate: '2026-07-29',
  rulesVersion: 'geo-test',
  completedAt: '2026-07-29T10:05:00.000Z',
  totalScore: 1_000,
  correctAnswers: 1,
  totalQuestions: 2,
  bestStreak: 1,
  ...patch,
})

test('the first completed result for a challenge stays official', () => {
  const stats = { schemaVersion: 1 as const, runs: [] }
  const first = recordOfficialRun(stats, runRecord({ totalScore: 800 }))
  const replayed = recordOfficialRun(first, runRecord({ totalScore: 9_000 }))
  assert.equal(replayed.runs.length, 1)
  assert.equal(replayed.runs[0].totalScore, 800)
})

test('records sort by publication date', () => {
  const stats = { schemaVersion: 1 as const, runs: [] }
  const later = recordOfficialRun(stats, runRecord({}))
  const both = recordOfficialRun(
    later,
    runRecord({ challengeId: 'geo:2026-07-27', publicationDate: '2026-07-27' }),
  )
  assert.deepEqual(
    both.runs.map((run) => run.publicationDate),
    ['2026-07-27', '2026-07-29'],
  )
})

test('daily streak counts consecutive utc publication days', () => {
  const runs = [
    runRecord({ publicationDate: '2026-07-29' }),
    runRecord({ publicationDate: '2026-07-28' }),
    runRecord({ publicationDate: '2026-07-25' }),
  ]
  assert.equal(calculateDailyPlayStreak(runs), 2)
  assert.equal(calculateDailyPlayStreak([]), 0)
})

test('personal best filters by rules version', () => {
  const runs = [
    runRecord({ totalScore: 700 }),
    runRecord({ totalScore: 1_500 }),
    runRecord({ rulesVersion: 'geo-old', totalScore: 8_000 }),
  ]
  assert.equal(personalBestFor(runs, 'geo-test'), 1_500)
  assert.equal(personalBestFor(runs, 'geo-unknown'), null)
})
