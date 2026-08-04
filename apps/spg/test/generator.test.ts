import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createGenerator } from '../src/spg/generator.ts'
import { stubs } from './stubs.ts'

test('returns null without sentences', () => {
  assert.equal(createGenerator()(), null)
})

test('transforms with the default options', () => {
  assert.equal(
    createGenerator([stubs.large])(),
    'this.is.my.long.sentence.to.try',
  )
  assert.equal(
    createGenerator([stubs.medium])(),
    'a.bit.more.short.but.medium.long',
  )
  assert.equal(createGenerator([stubs.small])(), 'super.short')
  assert.equal(
    createGenerator([stubs.elision])(),
    "itsn't.a.thing.we'll.understand",
  )
  assert.equal(
    createGenerator([stubs.html])(),
    '<p><b>Björk.Guðmundsdóttir</b>',
  )
  assert.equal(createGenerator([stubs.extract])(), '<p><b>Rapid.Evolution</b>')
  assert.equal(
    createGenerator([stubs.unicode])(),
    'Björk.Guðmundsdóttir.OTF.(/bjɜːrk/',
  )
})

test('takes a number as the target length', () => {
  assert.equal(
    createGenerator([stubs.large])(40),
    'this.is.my.long.sentence.to.try.and.to.check.the.length',
  )
})

test('keeps whole words past the target length', () => {
  assert.equal(createGenerator([stubs.large])(10), 'this.is.my.long')
})

test('never leaves spaces with the symbols option', () => {
  const generate = createGenerator([stubs.large])

  for (let round = 0; round < 50; round++) {
    const password = generate({ symbols: true })

    assert.ok(password !== null)
    assert.ok(!password.includes(' '))
  }
})
