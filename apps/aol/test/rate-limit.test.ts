import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ByteBudget, PeerScores, TokenBuckets } from '../src/mesh/rate-limit.ts'

test('token bucket allows the burst and drops the next frame', () => {
  const buckets = new TokenBuckets({ capacity: 10, windowMs: 10_000 })
  const results = Array.from({ length: 11 }, () => buckets.take('peer-a', 0))
  assert.deepEqual(results.slice(0, 10), Array(10).fill(true))
  assert.equal(results[10], false)
})

test('token bucket refills continuously', () => {
  const buckets = new TokenBuckets({ capacity: 10, windowMs: 10_000 })
  Array.from({ length: 10 }, () => buckets.take('peer-a', 0))
  assert.equal(buckets.take('peer-a', 999), false)
  assert.equal(buckets.take('peer-a', 1000), true)
  assert.equal(buckets.take('peer-a', 1001), false)
})

test('token buckets are independent per key', () => {
  const buckets = new TokenBuckets({ capacity: 1, windowMs: 10_000 })
  assert.equal(buckets.take('peer-a', 0), true)
  assert.equal(buckets.take('peer-a', 0), false)
  assert.equal(buckets.take('peer-b', 0), true)
})

test('byte budget gates on total bytes per second', () => {
  const budget = new ByteBudget(1000)
  assert.equal(budget.take(600, 0), true)
  assert.equal(budget.take(600, 0), false)
  assert.equal(budget.take(400, 0), true)
  assert.equal(budget.take(500, 500), true)
  assert.equal(budget.take(1, 500), false)
})

test('peer scores decrement per drop', () => {
  const scores = new PeerScores()
  assert.equal(scores.get('peer-a'), 0)
  assert.equal(scores.penalize('peer-a'), -1)
  assert.equal(scores.penalize('peer-a'), -2)
  assert.equal(scores.get('peer-b'), 0)
})
