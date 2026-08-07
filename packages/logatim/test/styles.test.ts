import assert from 'node:assert/strict'
import { test } from 'node:test'
import logatim from '../src/index.ts'

const dummies = {
  server: {
    none: 'raw\u001b[49m\u001b[0m',
    single: '\u001b[31mraw\u001b[49m\u001b[0m',
    last: '\u001b[31m\u001b[34mraw\u001b[49m\u001b[0m',
    set: '\u001b[1m\u001b[32mraw\u001b[49m\u001b[0m',
    bg: '\u001b[34m\u001b[43mraw\u001b[49m\u001b[0m',
    combo:
      '\u001b[34m\u001b[41m\u001b[1m\u001b[9m\u001b[42m\u001b[37mraw\u001b[49m\u001b[0m',
    concat: '\u001b[31mR\u001b[32mG\u001b[34mB\u001b[49m\u001b[0m',
  },
  browser: {
    none: ['raw'],
    single: ['%craw', 'color: #e74c3c'],
    last: ['%craw', 'color: #e74c3c;color: #3498db'],
    set: ['%craw', 'font-weight: 900;color: #2ecc71'],
    bg: ['%craw', 'color: #3498db;background-color: #f1c40f'],
    follow: [
      '%cfo%cllowme',
      'color: #3498db',
      'color: #2ecc71;font-weight: 900',
    ],
    empty: ['%cemp%cty', 'color: #3498db', 'font-weight: 900'],
    combo: [
      '%craw',
      'color: #3498db;background-color: #e74c3c;font-weight: 900;text-decoration: line-through;background-color: #2ecc71;color: #fff',
    ],
    concat: ['%cR%cG%cB', 'color: #e74c3c', 'color: #2ecc71', 'color: #3498db'],
  },
}

test('server style', () => {
  const none = logatim.raw('raw')
  const single = logatim.red.raw('raw')
  const last = logatim.red.blue.raw('raw')
  const set = logatim.bold.green.raw('raw')
  const bg = logatim.blue.bgYellow.raw('raw')
  const combo = logatim.blue.bgRed.bold.strikethrough.bgGreen.white.raw('raw')
  const concat = logatim.red('R').green('G').blue('B').raw()

  assert.equal(none, dummies.server.none)
  assert.equal(single, dummies.server.single)
  assert.equal(last, dummies.server.last)
  assert.equal(set, dummies.server.set)
  assert.equal(bg, dummies.server.bg)
  assert.equal(combo, dummies.server.combo)
  assert.equal(concat, dummies.server.concat)
  assert.notDeepEqual(concat, logatim)
})

test('browser style', () => {
  logatim.setEnv('browser')

  const none = logatim.raw('raw')
  const single = logatim.red.raw('raw')
  const last = logatim.red.blue.raw('raw')
  const set = logatim.bold.green.raw('raw')
  const bg = logatim.blue.bgYellow.raw('raw')
  const follow = logatim.blue('fo').green.bold('llow').raw('me')
  const empty = logatim.blue('emp').bold('ty').raw()
  const combo = logatim.blue.bgRed.bold.strikethrough.bgGreen.white.raw('raw')
  const concat = logatim.red('R').green('G').blue('B').raw()

  assert.deepEqual(none, dummies.browser.none)
  assert.deepEqual(single, dummies.browser.single)
  assert.deepEqual(last, dummies.browser.last)
  assert.deepEqual(set, dummies.browser.set)
  assert.deepEqual(bg, dummies.browser.bg)
  assert.deepEqual(combo, dummies.browser.combo)
  assert.deepEqual(follow, dummies.browser.follow)
  assert.deepEqual(empty, dummies.browser.empty)
  assert.deepEqual(concat, dummies.browser.concat)
  assert.notDeepEqual(concat, logatim)
})
