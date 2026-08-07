import assert from 'node:assert/strict'
import { test } from 'node:test'
import { competitionFlag } from './competition-flag.ts'

test('competitionFlag maps competitions to flags', () => {
  assert.equal(competitionFlag('Champions League'), '🇪🇺')
  assert.equal(competitionFlag('LaLiga EA Sports'), '🇪🇸')
  assert.equal(competitionFlag('Premier League'), '🇬🇧')
  assert.equal(competitionFlag('Serie A'), '🇮🇹')
  assert.equal(competitionFlag('Taça de Portugal'), '🇵🇹')
})

test('competitionFlag matches the first keyword in list order', () => {
  assert.equal(competitionFlag('Supercopa de Italia'), '🇮🇹')
  assert.equal(competitionFlag('Supercopa de España'), '🇪🇸')
})

test('competitionFlag returns null for unknown competitions', () => {
  assert.equal(competitionFlag('MASTERS MONTREAL'), null)
  assert.equal(competitionFlag('BRASILEIRAO'), null)
  assert.equal(competitionFlag(''), null)
})
