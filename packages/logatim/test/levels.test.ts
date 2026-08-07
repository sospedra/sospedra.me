import assert from 'node:assert/strict'
import { test } from 'node:test'
import logatim from '../src/index.ts'
import { assertLevelIsError } from './levels-prime.ts'

test('get and set methods exist and default to WARN', () => {
  assert.notEqual(logatim.getLevel, undefined)
  assert.notEqual(logatim.setLevel, undefined)

  assert.equal(logatim.getLevel(), 'WARN')

  logatim.setLevel('info')
  assert.equal(logatim.getLevel(), 'INFO')
})

test('methods under the current level are noops', () => {
  assert.equal(logatim.getLevel(), 'INFO')

  assert.notEqual(logatim.warn.name, 'noop')
  assert.equal(logatim.trace.name, 'noop')
})

test('level switches do not break logging', () => {
  assert.doesNotThrow(() => {
    logatim.warn('IGNORE: first one')
    logatim.info('IGNORE: lower level')
    logatim.setLevel('error')
    logatim.warn('IGNORE: no output')
    logatim.error('IGNORE: highest level')
    logatim.setLevel('info')
    logatim.info('IGNORE: last one')
    logatim.info('IGNORE: reply')
  })
})

test('debug works in node env', () => {
  logatim.setLevel('debug')

  assert.doesNotThrow(() => logatim.debug())
})

test('log methods are end-like functions', () => {
  logatim.setLevel(0)

  assert.equal(logatim.error(), undefined)
  assert.equal(logatim.warn(), undefined)
  assert.equal(logatim.info(), undefined)
  assert.equal(logatim.debug(), undefined)
  assert.equal(logatim.trace(), undefined)
})

test('setLevel is shared among app files', () => {
  logatim.setLevel('error')
  assert.equal(logatim.getLevel(), 'ERROR')

  assertLevelIsError()
})
