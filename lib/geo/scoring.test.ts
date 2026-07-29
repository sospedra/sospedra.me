import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_GEO_CHALLENGE_RULES,
  mapBaseScoreForDistance,
  scoreChoiceAnswer,
  scoreMapAnswer,
  streakMultiplierFor,
} from './scoring.ts'

test('choice score spans min to max by remaining time', () => {
  const instant = scoreChoiceAnswer({
    correct: true,
    elapsedMs: 0,
    questionLimitMs: 10_000,
    correctStreak: 0,
  })
  assert.equal(instant.baseScore, 1000)
  assert.equal(instant.score, 1000)
  assert.equal(instant.speedRatio, 1)

  const atLimit = scoreChoiceAnswer({
    correct: true,
    elapsedMs: 10_000,
    questionLimitMs: 10_000,
    correctStreak: 0,
  })
  assert.equal(atLimit.baseScore, 500)
  assert.equal(atLimit.remainingMs, 0)

  const halfway = scoreChoiceAnswer({
    correct: true,
    elapsedMs: 5_000,
    questionLimitMs: 10_000,
    correctStreak: 0,
  })
  assert.equal(halfway.baseScore, 750)
})

test('wrong answers score zero but keep clock readings', () => {
  const wrong = scoreChoiceAnswer({
    correct: false,
    elapsedMs: 2_000,
    questionLimitMs: 10_000,
    correctStreak: 3,
  })
  assert.equal(wrong.baseScore, 0)
  assert.equal(wrong.score, 0)
  assert.equal(wrong.remainingMs, 8_000)
  assert.equal(wrong.streakMultiplier, 1.3)
})

test('streak multiplier steps by 0.1 and caps at 1.5', () => {
  assert.equal(streakMultiplierFor(0), 1)
  assert.equal(streakMultiplierFor(2), 1.2)
  assert.equal(streakMultiplierFor(5), 1.5)
  assert.equal(streakMultiplierFor(9), 1.5)
  assert.equal(streakMultiplierFor(-3), 1)
  assert.equal(streakMultiplierFor(2.9), 1.2)
})

test('streak multiplies the rounded base score', () => {
  const boosted = scoreChoiceAnswer({
    correct: true,
    elapsedMs: 0,
    questionLimitMs: 10_000,
    correctStreak: 2,
  })
  assert.equal(boosted.score, 1200)

  const capped = scoreChoiceAnswer({
    correct: true,
    elapsedMs: 10_000,
    questionLimitMs: 10_000,
    correctStreak: 40,
  })
  assert.equal(capped.score, 750)
})

test('degenerate clocks fall back to the slow end', () => {
  const invalidElapsed = scoreChoiceAnswer({
    correct: true,
    elapsedMs: Number.NaN,
    questionLimitMs: 10_000,
    correctStreak: 0,
  })
  assert.equal(invalidElapsed.baseScore, 500)

  const zeroLimit = scoreChoiceAnswer({
    correct: true,
    elapsedMs: 0,
    questionLimitMs: 0,
    correctStreak: 0,
  })
  assert.equal(zeroLimit.baseScore, 500)
  assert.equal(zeroLimit.speedRatio, 0)
})

test('custom choice rules replace the default range', () => {
  const custom = scoreChoiceAnswer({
    correct: true,
    elapsedMs: 0,
    questionLimitMs: 10_000,
    correctStreak: 0,
    rules: {
      ...DEFAULT_GEO_CHALLENGE_RULES,
      choice: { min: 100, max: 200 },
    },
  })
  assert.equal(custom.baseScore, 200)
})

test('map bands are inclusive at their edges', () => {
  assert.deepEqual(mapBaseScoreForDistance(0), {
    baseScore: 1000,
    distanceBand: 'within-100',
  })
  assert.deepEqual(mapBaseScoreForDistance(100), {
    baseScore: 1000,
    distanceBand: 'within-100',
  })
  assert.deepEqual(mapBaseScoreForDistance(100.01), {
    baseScore: 800,
    distanceBand: 'within-300',
  })
  assert.deepEqual(mapBaseScoreForDistance(3000), {
    baseScore: 200,
    distanceBand: 'within-3000',
  })
})

test('beyond the scoring bands everything is a miss', () => {
  assert.deepEqual(mapBaseScoreForDistance(3000.01), {
    baseScore: 0,
    distanceBand: 'miss',
  })
  assert.deepEqual(mapBaseScoreForDistance(25_000), {
    baseScore: 0,
    distanceBand: 'miss',
  })
  assert.deepEqual(mapBaseScoreForDistance(-5), {
    baseScore: 0,
    distanceBand: 'miss',
  })
  assert.deepEqual(mapBaseScoreForDistance(Number.NaN), {
    baseScore: 0,
    distanceBand: 'miss',
  })
})

test('map score applies the streak multiplier', () => {
  const perfect = scoreMapAnswer(50, 3)
  assert.equal(perfect.baseScore, 1000)
  assert.equal(perfect.distanceBand, 'within-100')
  assert.equal(perfect.score, 1300)

  const miss = scoreMapAnswer(9_000, 3)
  assert.equal(miss.score, 0)
  assert.equal(miss.distanceBand, 'miss')
})
