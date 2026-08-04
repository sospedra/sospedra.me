import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SeqWindows } from '../src/mesh/seq-window.ts'

const SRC = 'aa'.repeat(32)

test('first sequence from an unknown source is accepted', () => {
  const windows = new SeqWindows()
  assert.equal(windows.check(SRC, 5000), true)
  windows.commit(SRC, 5000, 0)
  assert.equal(windows.size, 1)
})

test('a committed sequence is a duplicate afterwards', () => {
  const windows = new SeqWindows()
  windows.commit(SRC, 100, 0)
  assert.equal(windows.check(SRC, 100), false)
})

test('sequences below last minus 64 are rejected', () => {
  const windows = new SeqWindows()
  windows.commit(SRC, 1000, 0)
  assert.equal(windows.check(SRC, 935), false)
  assert.equal(windows.check(SRC, 936), true)
})

test('sequences beyond last plus 1024 are rejected', () => {
  const windows = new SeqWindows()
  windows.commit(SRC, 1000, 0)
  assert.equal(windows.check(SRC, 2024), true)
  assert.equal(windows.check(SRC, 2025), false)
})

test('out-of-order sequences inside the window are accepted once', () => {
  const windows = new SeqWindows()
  windows.commit(SRC, 100, 0)
  assert.equal(windows.check(SRC, 98), true)
  windows.commit(SRC, 98, 0)
  assert.equal(windows.check(SRC, 98), false)
  assert.equal(windows.check(SRC, 99), true)
})

test('the window advances with the highest committed sequence', () => {
  const windows = new SeqWindows()
  windows.commit(SRC, 100, 0)
  windows.commit(SRC, 1100, 0)
  assert.equal(windows.check(SRC, 1035), false)
  assert.equal(windows.check(SRC, 1036), true)
})

test('idle sources are forgotten after the idle ttl', () => {
  const windows = new SeqWindows()
  windows.commit(SRC, 100, 0)
  windows.prune(599_000)
  assert.equal(windows.check(SRC, 100), false)
  windows.prune(600_001)
  assert.equal(windows.check(SRC, 100), true)
  assert.equal(windows.size, 0)
})
