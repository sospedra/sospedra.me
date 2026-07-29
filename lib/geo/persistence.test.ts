import assert from 'node:assert/strict'
import test from 'node:test'
import type { DailyGeoChallenge } from './model.ts'
import {
  DEFAULT_GEO_SETTINGS,
  loadGeoRun,
  loadGeoSettings,
  loadGeoStats,
  type StorageLike,
  serializeGeoRun,
  validatePersistedGeoRun,
} from './persistence.ts'
import {
  createGeoGameState,
  type GeoGameState,
  geoGameReducer,
} from './reducer.ts'

const option = (id: string) => ({ id, label: { en: id, es: id } })

const challenge: DailyGeoChallenge = {
  schemaVersion: 1,
  generatorVersion: 'test',
  rulesVersion: 'geo-test',
  id: 'geo:2026-07-29',
  publicationDate: '2026-07-29',
  seed: 'seed',
  sourceRevision: 'rev',
  cityOptions: [],
  rules: {
    choice: { min: 500, max: 1000 },
    streak: { step: 0.1, cap: 1.5 },
    mapBands: [
      { maxKm: 100, score: 1000 },
      { maxKm: 300, score: 800 },
      { maxKm: 750, score: 600 },
      { maxKm: 1500, score: 400 },
      { maxKm: 3000, score: 200 },
      { maxKm: 20040, score: 0 },
    ],
    feedbackMs: 500,
    wrongFeedbackMs: 2500,
    roundSummaryMs: 3000,
  },
  rounds: [
    {
      id: 'round-capital',
      type: 'capital',
      questionLimitMs: 10_000,
      roundLimitMs: 60_000,
      questions: [
        {
          id: 'capital-01',
          type: 'capital',
          countryCode: 'ES',
          difficulty: 1,
          prompt: { en: 'Capital of Spain?', es: '¿Capital de España?' },
          options: [option('a'), option('b'), option('c'), option('d')],
          correctOptionId: 'a',
        },
        {
          id: 'capital-02',
          type: 'capital',
          countryCode: 'FR',
          difficulty: 2,
          prompt: { en: 'Capital of France?', es: '¿Capital de Francia?' },
          options: [option('e'), option('f'), option('g'), option('h')],
          correctOptionId: 'f',
        },
      ],
    },
    {
      id: 'round-map',
      type: 'map',
      questionLimitMs: 15_000,
      roundLimitMs: 60_000,
      questions: [
        {
          id: 'map-es-1',
          type: 'map',
          countryCode: 'ES',
          difficulty: 1,
          prompt: { en: 'Locate Madrid.', es: 'Localiza Madrid.' },
          answerCoordinate: { latitude: 40.4168, longitude: -3.7038 },
        },
      ],
    },
  ],
}

/**
 * Plays the whole fixture the way official runs happen in production: timed
 * rounds that only end when the shared clock expires. One hit, one miss, one
 * near-perfect pin.
 */
const playThrough = (): GeoGameState => {
  const at = (second: number) =>
    new Date(
      Date.parse('2026-07-29T10:00:00.000Z') + second * 1000,
    ).toISOString()
  const steps = [
    { type: 'START', startedAt: at(0) },
    { type: 'COUNTDOWN_FINISHED' },
    {
      type: 'SUBMIT_CHOICE',
      optionId: 'a',
      elapsedMs: 2_000,
      roundElapsedMs: 2_000,
      answeredAt: at(5),
    },
    { type: 'FEEDBACK_FINISHED', completedAt: at(6), roundElapsedMs: 2_500 },
    {
      type: 'SUBMIT_TEXT',
      optionId: null,
      submittedText: 'Atlantis',
      elapsedMs: 3_000,
      roundElapsedMs: 6_000,
      answeredAt: at(9),
    },
    { type: 'FEEDBACK_FINISHED', completedAt: at(12), roundElapsedMs: 8_500 },
    { type: 'ROUND_TIME_EXPIRED', roundElapsedMs: 60_000, answeredAt: at(60) },
    { type: 'ROUND_SUMMARY_FINISHED' },
    { type: 'COUNTDOWN_FINISHED' },
    {
      type: 'SUBMIT_MAP',
      coordinate: { latitude: 40.5, longitude: -3.6 },
      elapsedMs: 4_000,
      roundElapsedMs: 4_000,
      answeredAt: at(70),
    },
    { type: 'FEEDBACK_FINISHED', completedAt: at(73), roundElapsedMs: 5_000 },
    { type: 'ROUND_TIME_EXPIRED', roundElapsedMs: 60_000, answeredAt: at(125) },
    { type: 'ROUND_SUMMARY_FINISHED' },
  ] as const

  return steps.reduce<GeoGameState>(
    (state, action) => geoGameReducer(state, action),
    createGeoGameState(challenge),
  )
}

test('untimed completion never masquerades as an official save', () => {
  // Official runs are timed; the validator insists completed rounds show a
  // full round clock, so an untimed-style save must be rejected, not trusted.
  const state = playThrough()
  const serialized = serializeGeoRun(state)
  assert.ok(serialized)
  const shortClock = structuredClone(serialized)
  shortClock.roundElapsedMs = 5_000
  assert.equal(validatePersistedGeoRun(shortClock, challenge), null)
})

test('a played run serializes and validates round-trip', () => {
  const state = playThrough()
  assert.equal(state.phase, 'completed')
  assert.equal(state.answers.length, 3)

  const serialized = serializeGeoRun(state)
  assert.ok(serialized)
  assert.equal(serialized.status, 'completed')
  assert.equal(serialized.rulesVersion, 'geo-test')

  const restored = validatePersistedGeoRun(serialized, challenge)
  assert.ok(restored, 'a freshly serialized run must validate')
  assert.equal(restored.score, state.score)
  assert.equal(restored.answers.length, 3)
})

test('tampered saves are rejected', () => {
  const serialized = serializeGeoRun(playThrough())
  assert.ok(serialized)

  const inflatedAnswer = structuredClone(serialized)
  inflatedAnswer.answers[0] = { ...inflatedAnswer.answers[0], score: 99_999 }
  assert.equal(validatePersistedGeoRun(inflatedAnswer, challenge), null)

  const reordered = structuredClone(serialized)
  reordered.answers = [
    reordered.answers[2],
    reordered.answers[0],
    reordered.answers[1],
  ]
  assert.equal(validatePersistedGeoRun(reordered, challenge), null)

  const alienQuestion = structuredClone(serialized)
  alienQuestion.answers[0] = {
    ...alienQuestion.answers[0],
    questionId: 'smuggled',
  }
  assert.equal(validatePersistedGeoRun(alienQuestion, challenge), null)

  const staleRules = structuredClone(serialized)
  staleRules.rulesVersion = 'geo-old'
  assert.equal(validatePersistedGeoRun(staleRules, challenge), null)
})

test('legacy region answers invalidate the whole save', () => {
  const serialized = serializeGeoRun(playThrough())
  assert.ok(serialized)
  const legacy = structuredClone(serialized) as unknown as Record<
    string,
    unknown
  >
  ;(legacy.answers as Record<string, unknown>[])[2] = {
    ...(legacy.answers as Record<string, unknown>[])[2],
    kind: 'map-region',
    selectedOptionId: 'region-europe',
    correctOptionId: 'region-europe',
  }
  assert.equal(validatePersistedGeoRun(legacy, challenge), null)
})

const storageOf = (entries: Record<string, string>): StorageLike => ({
  getItem: (key) => entries[key] ?? null,
  setItem: (key, value) => {
    entries[key] = value
  },
  removeItem: (key) => {
    delete entries[key]
  },
})

test('settings parse tolerates legacy fields and rejects garbage', () => {
  const legacy = storageOf({
    'games:geo:v1:settings': JSON.stringify({
      schemaVersion: 1,
      sound: false,
      reducedMotion: true,
      highContrast: true,
      mapMode: 'region',
    }),
  })
  const parsed = loadGeoSettings(legacy)
  assert.equal(parsed.status, 'ok')
  assert.deepEqual(parsed.value, {
    schemaVersion: 1,
    sound: false,
    reducedMotion: true,
  })

  const garbage = storageOf({ 'games:geo:v1:settings': '{"sound": "loud"}' })
  const fallback = loadGeoSettings(garbage)
  assert.equal(fallback.status, 'invalid')
  assert.deepEqual(fallback.value, DEFAULT_GEO_SETTINGS)
})

test('stats parse keeps legacy records and drops broken ones', () => {
  const record = {
    challengeId: 'geo:2026-07-28',
    publicationDate: '2026-07-28',
    rulesVersion: 'geo-v7',
    mapMode: 'pin',
    completedAt: '2026-07-28T10:00:00.000Z',
    totalScore: 4200,
    correctAnswers: 10,
    totalQuestions: 12,
    bestStreak: 6,
  }
  const stored = storageOf({
    'games:geo:v1:stats': JSON.stringify({
      schemaVersion: 1,
      runs: [record],
    }),
  })
  const loaded = loadGeoStats(stored)
  assert.equal(loaded.status, 'ok')
  assert.equal(loaded.value.runs.length, 1)
  assert.equal(loaded.value.runs[0].totalScore, 4200)
  assert.equal('mapMode' in loaded.value.runs[0], false)
})

test('loading a run distinguishes missing, invalid and valid saves', () => {
  const state = playThrough()
  const serialized = serializeGeoRun(state)
  assert.ok(serialized)

  const empty = loadGeoRun(storageOf({}), challenge)
  assert.equal(empty.status, 'missing')

  const corrupted = loadGeoRun(
    storageOf({ 'games:geo:v1:run:2026-07-29': 'not json{' }),
    challenge,
  )
  assert.equal(corrupted.status, 'invalid')

  const valid = loadGeoRun(
    storageOf({
      'games:geo:v1:run:2026-07-29': JSON.stringify(serialized),
    }),
    challenge,
  )
  assert.equal(valid.status, 'ok')
  assert.equal(valid.value?.answers.length, 3)
})
