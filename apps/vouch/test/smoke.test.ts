import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MAGIC } from '../src/protocol/constants.ts'

test('protocol magic', () => {
  assert.equal(new TextDecoder().decode(MAGIC), 'VOUCH')
})
