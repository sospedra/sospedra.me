import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ascii, hex } from '../src/protocol/bytes.ts'
import { EMPTY, rootAfter, Smt, verifyWitness } from '../src/protocol/smt.ts'

test('empty tree root is the protocol constant', () => {
  assert.equal(hex(new Smt().root()), hex(EMPTY[0]))
})

test('insert changes root deterministically, order-independent storage', () => {
  const a = new Smt()
  a.set(ascii('k1'), ascii('v1'))
  a.set(ascii('k2'), ascii('v2'))
  const b = new Smt()
  b.set(ascii('k2'), ascii('v2'))
  b.set(ascii('k1'), ascii('v1'))
  assert.equal(hex(a.root()), hex(b.root()))
  assert.notEqual(hex(a.root()), hex(EMPTY[0]))
})

test('membership witness verifies, wrong value fails', () => {
  const t = new Smt()
  t.set(ascii('k1'), ascii('v1'))
  t.set(ascii('k2'), ascii('v2'))
  const w = t.witness(ascii('k1'))
  assert.ok(verifyWitness(t.root(), ascii('k1'), ascii('v1'), w))
  assert.ok(!verifyWitness(t.root(), ascii('k1'), ascii('WRONG'), w))
})

test('non-membership witness verifies', () => {
  const t = new Smt()
  t.set(ascii('k1'), ascii('v1'))
  const w = t.witness(ascii('absent'))
  assert.equal(w.leaf, null)
  assert.ok(verifyWitness(t.root(), ascii('absent'), null, w))
})

test('rootAfter matches a real update', () => {
  const t = new Smt()
  t.set(ascii('k1'), ascii('v1'))
  const w = t.witness(ascii('k1'))
  t.set(ascii('k1'), ascii('v9'))
  assert.equal(hex(rootAfter(w, ascii('v9'))), hex(t.root()))
})

test('update through witness composes across keys', () => {
  const t = new Smt()
  t.set(ascii('k1'), ascii('v1'))
  const w2 = t.witness(ascii('k2'))
  t.set(ascii('k2'), ascii('v2'))
  assert.equal(hex(rootAfter(w2, ascii('v2'))), hex(t.root()))
})
