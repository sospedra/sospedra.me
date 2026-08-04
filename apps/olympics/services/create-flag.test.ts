import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createFlag } from './create-flag.ts'

test('maps the special Tokyo 2020 team names', () => {
  assert.equal(createFlag('ROC'), '🇷🇺')
  assert.equal(createFlag('Republic of Korea'), '🇰🇷')
  assert.equal(createFlag('Great Britain'), '🇬🇧')
  assert.equal(createFlag('Chinese Taipei'), '🇹🇼')
  assert.equal(createFlag('Hong Kong, China'), '🇭🇰')
  assert.equal(createFlag("Côte d'Ivoire"), '🇨🇮')
})

test('falls back to country-emoji for plain country names', () => {
  assert.equal(createFlag('Spain'), '🇪🇸')
  assert.equal(createFlag('Japan'), '🇯🇵')
})
