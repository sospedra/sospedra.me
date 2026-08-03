import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createHistory,
  HISTORY_CAP,
  push,
  redo,
  type Snapshot,
  undo,
} from './history.ts'

const snap = (id: number, pixels = 4): Snapshot => ({
  data: new Uint8ClampedArray(pixels * 4).fill(id),
  w: pixels,
  h: 1,
})

test('undo and redo on an empty history return null', () => {
  const history = createHistory()
  assert.equal(undo(history, snap(0)), null)
  assert.equal(redo(history, snap(0)), null)
})

test('undo returns the last pushed snapshot and stores the current one', () => {
  const before = snap(1)
  const current = snap(2)
  const history = push(createHistory(), before)
  const restore = undo(history, current)
  assert.ok(restore)
  assert.equal(restore.snapshot, before)
  assert.equal(restore.history.past.length, 0)
  assert.equal(restore.history.future[0], current)
})

test('redo walks forward through what undo stored', () => {
  const base = snap(1)
  const edited = snap(2)
  const afterUndo = undo(push(createHistory(), base), edited)
  assert.ok(afterUndo)
  const restore = redo(afterUndo.history, afterUndo.snapshot)
  assert.ok(restore)
  assert.equal(restore.snapshot, edited)
  assert.equal(restore.history.past[0], base)
  assert.equal(restore.history.future.length, 0)
})

test('push clears the redo branch', () => {
  const afterUndo = undo(push(createHistory(), snap(1)), snap(2))
  assert.ok(afterUndo)
  const rewritten = push(afterUndo.history, snap(3))
  assert.equal(rewritten.future.length, 0)
  assert.equal(redo(rewritten, snap(3)), null)
})

test('the byte cap evicts the oldest snapshots first', () => {
  const cap = 3 * 16
  let history = createHistory(cap)
  for (const id of [1, 2, 3, 4]) history = push(history, snap(id))
  assert.equal(history.past.length, 3)
  assert.equal(history.past[0].data[0], 2)
})

test('a snapshot larger than the cap leaves no undo levels', () => {
  const history = push(createHistory(16), snap(1, 100))
  assert.equal(history.past.length, 0)
  assert.equal(undo(history, snap(2)), null)
})

test('the default cap holds 23 levels at the default canvas size', () => {
  assert.equal(Math.floor(HISTORY_CAP / (683 * 384 * 4)), 23)
})
