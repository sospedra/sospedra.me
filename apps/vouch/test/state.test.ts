import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  configKey,
  decodeAccount,
  decodePendingMigrationV1,
  effectiveConfig,
  encodeAccount,
  encodePendingMigrationV1,
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

test('pending migration encode rejects present=0 with non-empty migration', () => {
  assert.throws(() =>
    encodePendingMigrationV1({ present: 0, migration: new Uint8Array([1]) }),
  )
})

test('pending migration decode rejects present=0 with non-empty migration', () => {
  const valid = encodePendingMigrationV1({
    present: 1,
    migration: new Uint8Array([1]),
  })
  const tampered = new Uint8Array([0, 0, ...valid.slice(2)])
  assert.throws(() => decodePendingMigrationV1(tampered))
})

test('pending migration encode rejects invalid present value', () => {
  assert.throws(() =>
    encodePendingMigrationV1({ present: 2, migration: new Uint8Array() }),
  )
})
