import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  configKey,
  decodeAccount,
  effectiveConfig,
  encodeAccount,
} from '../src/protocol/state.ts'

test('account roundtrip', () => {
  const b = encodeAccount({ balance: 1500n })
  assert.deepEqual(decodeAccount(b), { balance: 1500n })
})

test('decode rejects trailing byte', () => {
  const b = encodeAccount({ balance: 1n })
  assert.throws(() => decodeAccount(new Uint8Array([...b, 0])))
})

test('config timelock resolution', () => {
  const c = { current: 250n, next: 500n, nextActivation: 10n }
  assert.equal(effectiveConfig(c, 9n), 250n)
  assert.equal(effectiveConfig(c, 10n), 500n)
  assert.equal(effectiveConfig({ ...c, nextActivation: 0n }, 99n), 250n)
})

test('config key bytes', () => {
  assert.equal(
    new TextDecoder().decode(configKey('fee_basis_points')),
    'config/fee_basis_points',
  )
})
