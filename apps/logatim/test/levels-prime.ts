import assert from 'node:assert/strict'
import logatim from '../src/index.ts'

export const assertLevelIsError = () => {
  assert.equal(logatim.getLevel(), 'ERROR')
}
