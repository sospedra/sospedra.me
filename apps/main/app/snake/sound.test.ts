import assert from 'node:assert/strict'
import test from 'node:test'
import type { Phase } from './engine.ts'
import { transitionSound } from './sound.ts'

const at = (phase: Phase, score = 0, top = 0) => ({ phase, score, top })

test('a score gain inside one phase plays the eat cue', () => {
  assert.equal(transitionSound(at('running'), at('running', 5)), 'eat')
  assert.equal(transitionSound(at('running', 5), at('running', 5)), null)
})

test('entering the over phase plays the game-over jingle', () => {
  assert.equal(transitionSound(at('running', 9, 20), at('over', 9, 20)), 'over')
})

test('dying on a new high score plays the record fanfare instead', () => {
  assert.equal(
    transitionSound(at('running', 21, 20), at('over', 21, 21)),
    'record',
  )
})

test('the first death with any score is a record', () => {
  assert.equal(transitionSound(at('running', 3), at('over', 3, 3)), 'record')
})

test('a scoreless first death is a plain game over', () => {
  assert.equal(transitionSound(at('running'), at('over')), 'over')
})

test('pausing and resuming both play the pause blip', () => {
  assert.equal(transitionSound(at('running'), at('paused')), 'pause')
  assert.equal(transitionSound(at('paused'), at('running')), 'pause')
})

test('starting a run from the menu plays the start cue', () => {
  assert.equal(transitionSound(at('menu'), at('running')), 'start')
})

test('menu-family moves fall back to the key click', () => {
  assert.equal(transitionSound(at('menu'), at('level')), 'key')
  assert.equal(transitionSound(at('level'), at('menu')), 'key')
  assert.equal(transitionSound(at('over'), at('menu')), 'key')
})
