import assert from 'node:assert/strict'
import { test } from 'node:test'
import semverToInt from '../src/index.ts'

const gen = (): number => Math.floor(Math.random() * 10 ** (Math.random() * 4))

test('transforms any valid semver format to an integer', () => {
  assert.equal(semverToInt('12.0.1'), 130000100001)
})

test('accepts a custom base for transforms', () => {
  assert.equal(semverToInt('9.83.100', 6), 10084100)
})

test('major versions do not overlap', () => {
  const greater = semverToInt('100.23.0')
  const lower = semverToInt('99.122.1')

  assert.ok(greater > lower)
})

test('minor versions do not overlap', () => {
  const greater = semverToInt('10.890.199')
  const lower = semverToInt('10.889.9999')

  assert.ok(greater > lower)
})

test('parses a custom base to an even integer', () => {
  const fromInt = semverToInt('12.345.6789', 6)
  const fromFloat = semverToInt('12.345.6789', 5.45)
  const fromOdd = semverToInt('12.345.6789', 5)

  assert.equal(fromInt, fromFloat)
  assert.equal(fromFloat, fromOdd)
  assert.equal(fromInt + fromFloat + fromOdd, fromInt * 3)
})

test('always returns an integer', () => {
  const fromRandom = semverToInt(`${gen()}.${gen()}.${gen()}`)

  assert.ok(Number.isInteger(fromRandom))
})

test('never overlaps', () => {
  const major = gen()
  const minor = gen()
  const patch = gen()

  const greater = semverToInt(`${major}.${minor + 1}.${patch + 1}`)
  const lower = semverToInt(`${major}.${minor}.${patch}`)

  assert.ok(greater > lower)
})
