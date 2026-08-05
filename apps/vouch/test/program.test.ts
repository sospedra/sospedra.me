import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hex } from '../src/protocol/bytes.ts'
import {
  chainNext,
  GENESIS_CHAIN,
  PROGRAM,
  programId,
} from '../src/protocol/program.ts'

test('program ids are stable and distinct', () => {
  assert.equal(hex(PROGRAM.updateV1), hex(programId('vouch-update-v1')))
  assert.notEqual(hex(PROGRAM.updateV1), hex(PROGRAM.updateV2))
})

test('chain advances deterministically and binds activation', () => {
  const a = chainNext(GENESIS_CHAIN, PROGRAM.updateV2, PROGRAM.queryV2, 12n)
  const b = chainNext(GENESIS_CHAIN, PROGRAM.updateV2, PROGRAM.queryV2, 13n)
  assert.notEqual(hex(a), hex(b))
})
