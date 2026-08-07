import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FALLBACK_ICON, sportIcon } from './sport-icon.ts'

test('sportIcon maps sports regardless of case and accents', () => {
  assert.equal(sportIcon('Tenis'), '/icons/tennis.png')
  assert.equal(sportIcon('Fútbol'), '/icons/football.png')
  assert.equal(sportIcon('FÚTBOL SALA'), '/icons/football.png')
  assert.equal(sportIcon('Boxeo'), '/icons/boxing.png')
  assert.equal(sportIcon('MotoGP'), '/icons/moto.png')
  assert.equal(sportIcon('Baloncesto'), '/icons/basketball.png')
})

test('sportIcon prefers the longer keyword in list order', () => {
  assert.equal(sportIcon('Tenis de mesa'), '/icons/ping-pong.png')
})

test('sportIcon matches acronyms on the raw input only', () => {
  assert.equal(sportIcon('MMA'), '/icons/boxing.png')
  assert.equal(sportIcon('NBA'), '/icons/basketball.png')
  assert.equal(sportIcon('NFL'), '/icons/american-football.png')
  assert.equal(sportIcon('nba'), FALLBACK_ICON)
})

test('sportIcon falls back for unknown sports', () => {
  assert.equal(sportIcon('Aguas Abiertas'), FALLBACK_ICON)
  assert.equal(sportIcon(''), FALLBACK_ICON)
})
