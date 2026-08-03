import assert from 'node:assert/strict'
import test from 'node:test'
import type { AnswerResult, DailyGeoChallenge } from './model.ts'
import { formatGeoShareCard, mapDistanceBandShareSymbol } from './share.ts'

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

const answers = [
  {
    kind: 'choice',
    questionId: 'capital-01',
    roundId: 'round-capital',
    roundType: 'capital',
    correct: true,
    score: 1_000,
  },
  {
    kind: 'choice',
    questionId: 'capital-02',
    roundId: 'round-capital',
    roundType: 'capital',
    correct: false,
    score: 0,
  },
  {
    kind: 'map-pin',
    questionId: 'map-es-1',
    roundId: 'round-map',
    roundType: 'map',
    correct: true,
    score: 1_300,
    distanceKm: 42,
    distanceBand: 'within-100',
  },
] as unknown as AnswerResult[]

test('share card lays out title, round symbols and totals', () => {
  const card = formatGeoShareCard({
    challenge,
    answers,
    locale: 'en',
    challengeNumber: 7,
  })
  assert.equal(
    card,
    ['GEO DAILY #7 🌍', 'Capitals  🟩⬛', 'Map       🎯', '2/3 · 2,300'].join(
      '\n',
    ),
  )
})

test('map symbols follow the distance bands', () => {
  assert.equal(mapDistanceBandShareSymbol('within-100'), '🎯')
  assert.equal(mapDistanceBandShareSymbol('within-300'), '🟢')
  assert.equal(mapDistanceBandShareSymbol('within-3000'), '🔴')
  assert.equal(mapDistanceBandShareSymbol('miss'), '⬛')
  assert.equal(mapDistanceBandShareSymbol('expired'), '⬛')
})

test('rounds without answers render a placeholder line', () => {
  const card = formatGeoShareCard({
    challenge,
    answers: [],
    locale: 'en',
    challengeNumber: 7,
  })
  assert.ok(card.includes('Capitals  —'))
  assert.ok(card.includes('0/0 · 0'))
})

test('spanish cards localize title and number formatting', () => {
  const card = formatGeoShareCard({
    challenge,
    answers,
    locale: 'es',
    challengeNumber: 7,
  })
  assert.ok(card.startsWith('GEO DIARIO #7 🌍'))
  assert.ok(card.endsWith('2/3 · 2300'))
})
