import assert from 'node:assert/strict'
import { test } from 'node:test'
import { KickTally, majorityOf } from '../src/mesh/votes.ts'

test('majorityOf is floor(n/2)+1', () => {
  assert.equal(majorityOf(1), 1)
  assert.equal(majorityOf(2), 2)
  assert.equal(majorityOf(3), 2)
  assert.equal(majorityOf(8), 5)
  assert.equal(majorityOf(9), 5)
})

test('distinct voters accumulate, duplicates count once', () => {
  const tally = new KickTally(1000)
  assert.equal(tally.add('ana', 'mallory', 0), 1)
  assert.equal(tally.add('ana', 'mallory', 10), 1)
  assert.equal(tally.add('bob', 'mallory', 20), 2)
})

test('votes expire after the window', () => {
  const tally = new KickTally(1000)
  tally.add('ana', 'mallory', 0)
  assert.equal(tally.tally('mallory', 999), 1)
  assert.equal(tally.tally('mallory', 1000), 0)
})

test('a fresh vote refreshes the voter expiry', () => {
  const tally = new KickTally(1000)
  tally.add('ana', 'mallory', 0)
  tally.add('ana', 'mallory', 900)
  assert.equal(tally.tally('mallory', 1500), 1)
})

test('prune drops expired voters and empty targets', () => {
  const tally = new KickTally(1000)
  tally.add('ana', 'mallory', 0)
  tally.add('bob', 'trent', 500)
  tally.prune(1200)
  assert.equal(tally.tally('mallory', 1200), 0)
  assert.equal(tally.tally('trent', 1200), 1)
})

test('clear forgets a target entirely', () => {
  const tally = new KickTally(1000)
  tally.add('ana', 'mallory', 0)
  tally.clear('mallory')
  assert.equal(tally.tally('mallory', 1), 0)
})

test('tallies are per target', () => {
  const tally = new KickTally(1000)
  tally.add('ana', 'mallory', 0)
  tally.add('bob', 'mallory', 0)
  assert.equal(tally.tally('trent', 1), 0)
  assert.equal(tally.tally('mallory', 1), 2)
})
