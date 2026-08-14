import assert from 'node:assert/strict'
import test from 'node:test'
import { createSpikeCounter } from './shake.ts'

test('a lone flick does not fire', () => {
  const spike = createSpikeCounter()
  assert.equal(spike(0), false)
  assert.equal(spike(180), false)
})

test('sustained hard shaking fires on the eighth counted spike', () => {
  const spike = createSpikeCounter()
  const results = Array.from({ length: 8 }, (_, i) => spike(i * 200))
  assert.deepEqual(results, [
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    true,
  ])
})

test('one second of 60Hz samples counts only seven spikes', () => {
  const spike = createSpikeCounter()
  const fired = Array.from({ length: 66 }, (_, i) => spike(i * 16))
  assert.equal(fired.some(Boolean), false)
  assert.equal(spike(1120), true)
})

test('slow shaking never stacks eight spikes in the window', () => {
  const spike = createSpikeCounter()
  const fired = Array.from({ length: 20 }, (_, i) => spike(i * 300))
  assert.equal(fired.some(Boolean), false)
})

test('the counter resets after firing', () => {
  const spike = createSpikeCounter()
  const results = Array.from({ length: 8 }, (_, i) => spike(i * 200))
  assert.equal(results.at(-1), true)
  assert.equal(spike(1600), false)
})
