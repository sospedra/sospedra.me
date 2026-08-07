import assert from 'node:assert/strict'
import { test } from 'node:test'
import { findGap } from './find-gap.ts'

test('findGap flags a two hour hole', () => {
  assert.equal(findGap('13:00', '15:00'), true)
  assert.equal(findGap('13:00', '15:10'), true)
  assert.equal(findGap('12:59', '14:59'), true)
})

test('findGap ignores holes under two hours', () => {
  assert.equal(findGap('13:50', '15:49'), false)
  assert.equal(findGap('13:00', '13:30'), false)
  assert.equal(findGap('13:00', '13:00'), false)
})

test('findGap ignores midnight rollover and garbage', () => {
  assert.equal(findGap('21:00', '00:15'), false)
  assert.equal(findGap('aa:bb', 'cc:dd'), false)
})
