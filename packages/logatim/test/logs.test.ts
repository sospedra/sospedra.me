import assert from 'node:assert/strict'
import { test } from 'node:test'
import { EOL } from '../src/constants.ts'
import logatim from '../src/index.ts'

const makeCustomError = (message: string): Error => {
  const error: Error = Object.create(Error.prototype)
  Error.captureStackTrace(error)
  error.message = message
  error.name = 'CustomError'
  return error
}

const dummies = {
  customError: { message: 'Logatim!', name: 'CustomError' },
  simpleObject: { cool: 1337, loga: 'tim' },
  listObject: [1, 3, 3, 7],
  deepObject: {
    go: { more: [1, 2, { deeper: 'FTW', loga: ['t', 'i', 'm'] }] },
  },
  simpleFunction: `Valar morghulis${EOL}`,
  composeFunction: `\u001b[1m[PREFIX 50] \u001b[34mValar dohaeris${EOL}`,
}

type ObjectDummy = 'customError' | 'simpleObject' | 'listObject' | 'deepObject'

const rawDummy = (key: ObjectDummy) => `${JSON.stringify(dummies[key])}${EOL}`

test('prints custom errors with all the variables', () => {
  try {
    throw makeCustomError('Logatim!')
  } catch (error) {
    assert.equal(logatim.raw(error), rawDummy('customError'))
  }
})

test('prints objects', () => {
  assert.equal(logatim.raw(dummies.simpleObject), rawDummy('simpleObject'))
  assert.equal(logatim.raw(dummies.listObject), rawDummy('listObject'))
  assert.equal(logatim.raw(dummies.deepObject), rawDummy('deepObject'))
})

test('accepts functions as output', () => {
  const simple = logatim.raw(() => 'Valar morghulis ')
  const compose = logatim
    .bold(() => `[PREFIX ${13 + 37}] `)
    .blue.raw('Valar dohaeris')

  assert.equal(simple, dummies.simpleFunction)
  assert.equal(compose, dummies.composeFunction)
})
