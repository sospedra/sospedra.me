import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  decodeBundle,
  encodeBundle,
  type ResponseBundle,
} from '../src/protocol/bundle.ts'
import { PROTOCOL_VERSION, ZERO32 } from '../src/protocol/constants.ts'
import { buildGenesis, GENESIS_ROOT } from '../src/protocol/genesis.ts'
import {
  encodeLatestHead,
  type HeadIdV1,
  headSigningInput,
  type LatestHeadV1,
} from '../src/protocol/head.ts'
import { sign } from '../src/protocol/keys.ts'
import {
  decodeMigration,
  encodeMigration,
  GENESIS_CHAIN,
  PROGRAM,
} from '../src/protocol/program.ts'
import {
  decodeQueryReceipt,
  encodeQueryReceipt,
  type QueryReceiptV1,
  receiptSigningInput,
} from '../src/protocol/receipt.ts'
import { genesisTrust } from '../src/protocol/trust.ts'
import type { VerifyErrorCode, VerifyResult } from '../src/protocol/verify.ts'
import { verifyBundle } from '../src/protocol/verify.ts'
import type { AccessV1 } from '../src/protocol/view.ts'
import { HONEST_ISSUED_AT_MS, makeHonestBundle } from './helpers.ts'

function flipByte(bytes: Uint8Array): Uint8Array {
  const copy = bytes.slice()
  copy[0] ^= 1
  return copy
}

function assertFailsAtStep(
  result: VerifyResult,
  step: number,
  error: VerifyErrorCode,
): void {
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.error, error)
  assert.equal(result.checks.length, step)
  const last = result.checks.at(-1)
  assert.ok(last)
  assert.equal(last.step, step)
  assert.equal(last.pass, false)
  assert.equal(last.error, error)
  for (const [index, check] of result.checks.slice(0, -1).entries()) {
    assert.equal(check.step, index + 1)
    assert.equal(check.pass, true)
  }
}

function reencodeReceipt(
  receipt: QueryReceiptV1,
  signerLabel: { publicKey: Uint8Array; secretKey: Uint8Array },
): { receiptBytes: Uint8Array; signature: Uint8Array } {
  const receiptBytes = encodeQueryReceipt(receipt)
  const signature = sign(receiptSigningInput(receiptBytes), signerLabel)
  return { receiptBytes, signature }
}

test('honest bundle verifies end to end', () => {
  const honest = makeHonestBundle(buildGenesis())

  const result = verifyBundle({
    expectedRequest: honest.expectedRequest,
    expectedNonce: honest.expectedNonce,
    bundleBytes: honest.bundleBytes,
    trust: honest.trust,
    nowMs: honest.nowMs,
    requireFreshHead: true,
  })

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.checks.length, 19)
  assert.ok(result.checks.every((c) => c.pass || c.skipped))
  assert.deepEqual(
    result.checks.map((c) => c.step),
    Array.from({ length: 19 }, (_, i) => i + 1),
  )
  assert.equal(result.checks[17].skipped, true)
  assert.deepEqual(result.result, honest.bundle.canonicalResult)
  assert.equal(result.next.highestSequence, honest.receipt.stateSequence)
  assert.deepEqual(result.next.acceptedRoot, honest.receipt.stateRoot)
  assert.deepEqual(result.evidence, [])
})

test('flipped result byte -> RESULT_HASH_MISMATCH', () => {
  const honest = makeHonestBundle(buildGenesis())
  const bundle: ResponseBundle = {
    ...honest.bundle,
    canonicalResult: flipByte(honest.bundle.canonicalResult),
  }

  const result = verifyBundle({
    expectedRequest: honest.expectedRequest,
    expectedNonce: honest.expectedNonce,
    bundleBytes: encodeBundle(bundle),
    trust: honest.trust,
    nowMs: honest.nowMs,
    requireFreshHead: true,
  })

  assertFailsAtStep(result, 10, 'RESULT_HASH_MISMATCH')
})

test('wrong nonce -> NONCE_MISMATCH', () => {
  const honest = makeHonestBundle(buildGenesis())

  const result = verifyBundle({
    expectedRequest: honest.expectedRequest,
    expectedNonce: new Uint8Array([1, 2, 3, 4, 5]),
    bundleBytes: honest.bundleBytes,
    trust: honest.trust,
    nowMs: honest.nowMs,
    requireFreshHead: true,
  })

  assertFailsAtStep(result, 6, 'NONCE_MISMATCH')
})

test('zeroed receipt signature -> INVALID_SIGNATURE', () => {
  const honest = makeHonestBundle(buildGenesis())
  const bundle: ResponseBundle = {
    ...honest.bundle,
    receiptSignature: new Uint8Array(64),
  }

  const result = verifyBundle({
    expectedRequest: honest.expectedRequest,
    expectedNonce: honest.expectedNonce,
    bundleBytes: encodeBundle(bundle),
    trust: honest.trust,
    nowMs: honest.nowMs,
    requireFreshHead: true,
  })

  assertFailsAtStep(result, 5, 'INVALID_SIGNATURE')
})

test('trust ahead of receipt -> ROLLBACK_DETECTED', () => {
  const honest = makeHonestBundle(buildGenesis())
  const trust = {
    ...honest.trust,
    highestSequence: honest.receipt.stateSequence + 1n,
  }

  const result = verifyBundle({
    expectedRequest: honest.expectedRequest,
    expectedNonce: honest.expectedNonce,
    bundleBytes: honest.bundleBytes,
    trust,
    nowMs: honest.nowMs,
    requireFreshHead: true,
  })

  assertFailsAtStep(result, 11, 'ROLLBACK_DETECTED')
})

test('missing transition link -> INVALID_PROOF continuity', () => {
  const honest = makeHonestBundle(buildGenesis())
  const bundle: ResponseBundle = {
    ...honest.bundle,
    transitions: honest.bundle.transitions.slice(1),
  }

  const result = verifyBundle({
    expectedRequest: honest.expectedRequest,
    expectedNonce: honest.expectedNonce,
    bundleBytes: encodeBundle(bundle),
    trust: honest.trust,
    nowMs: honest.nowMs,
    requireFreshHead: true,
  })

  assertFailsAtStep(result, 14, 'INVALID_PROOF')
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.rule, 'continuity')
})

test('stale head -> STALE_HEAD', () => {
  const honest = makeHonestBundle(buildGenesis())

  const result = verifyBundle({
    expectedRequest: honest.expectedRequest,
    expectedNonce: honest.expectedNonce,
    bundleBytes: honest.bundleBytes,
    trust: honest.trust,
    nowMs: honest.nowMs + 1_000_000n,
    requireFreshHead: true,
  })

  assertFailsAtStep(result, 16, 'STALE_HEAD')
})

test('future head -> FUTURE_HEAD', () => {
  const honest = makeHonestBundle(buildGenesis())

  const result = verifyBundle({
    expectedRequest: honest.expectedRequest,
    expectedNonce: honest.expectedNonce,
    bundleBytes: honest.bundleBytes,
    trust: honest.trust,
    nowMs: honest.nowMs - 1_000_000n,
    requireFreshHead: true,
  })

  assertFailsAtStep(result, 16, 'FUTURE_HEAD')
})

test('revoked receipt key -> UNAUTHORIZED_KEY', () => {
  const honest = makeHonestBundle(buildGenesis(), { revokeReceiptKey: true })

  const result = verifyBundle({
    expectedRequest: honest.expectedRequest,
    expectedNonce: honest.expectedNonce,
    bundleBytes: honest.bundleBytes,
    trust: honest.trust,
    nowMs: honest.nowMs,
    requireFreshHead: true,
  })

  assertFailsAtStep(result, 4, 'UNAUTHORIZED_KEY')
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.rule, 'receipt-key-status')
})

test('forged receipt key witness -> INVALID_PROOF', () => {
  const honest = makeHonestBundle(buildGenesis())
  const forgedWitness: AccessV1 = {
    ...honest.bundle.receiptKeyWitness,
    value: honest.bundle.receiptKeyWitness.value
      ? flipByte(honest.bundle.receiptKeyWitness.value)
      : null,
  }
  assert.ok(forgedWitness.value)
  const bundle: ResponseBundle = {
    ...honest.bundle,
    receiptKeyWitness: forgedWitness,
  }

  const result = verifyBundle({
    expectedRequest: honest.expectedRequest,
    expectedNonce: honest.expectedNonce,
    bundleBytes: encodeBundle(bundle),
    trust: honest.trust,
    nowMs: honest.nowMs,
    requireFreshHead: true,
  })

  assertFailsAtStep(result, 4, 'INVALID_PROOF')
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.rule, 'receipt-key-witness')
})

test('journal/receipt disagreement -> JOURNAL_MISMATCH', () => {
  const honest = makeHonestBundle(buildGenesis())
  const forgedReceipt: QueryReceiptV1 = {
    ...honest.receipt,
    programChainHash: flipByte(honest.receipt.programChainHash),
  }
  const { receiptBytes, signature } = reencodeReceipt(
    forgedReceipt,
    honest.world.receiptKey,
  )
  const bundle: ResponseBundle = {
    ...honest.bundle,
    receipt: receiptBytes,
    receiptSignature: signature,
  }

  const result = verifyBundle({
    expectedRequest: honest.expectedRequest,
    expectedNonce: honest.expectedNonce,
    bundleBytes: encodeBundle(bundle),
    trust: honest.trust,
    nowMs: honest.nowMs,
    requireFreshHead: true,
  })

  assertFailsAtStep(result, 13, 'JOURNAL_MISMATCH')
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.rule, 'program-chain-hash')
})

test('unknown query program id -> INVALID_PROGRAM_CHAIN', () => {
  const honest = makeHonestBundle(buildGenesis(), { migrateToV2: true })
  const migration = decodeMigration(honest.bundle.migrations[0])
  const forgedMigration = encodeMigration({
    ...migration,
    nextQueryProgramId: new Uint8Array(32).fill(0xee),
  })
  const bundle: ResponseBundle = {
    ...honest.bundle,
    migrations: [forgedMigration],
  }

  const result = verifyBundle({
    expectedRequest: honest.expectedRequest,
    expectedNonce: honest.expectedNonce,
    bundleBytes: encodeBundle(bundle),
    trust: honest.trust,
    nowMs: honest.nowMs,
    requireFreshHead: true,
  })

  assertFailsAtStep(result, 15, 'INVALID_PROGRAM_CHAIN')
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.rule, 'migration-unknown-program')
})

test('malformed bundle bytes -> MALFORMED_TRANSPORT', () => {
  const trust = genesisTrust({
    protocolVersion: PROTOCOL_VERSION,
    genesisRoot: GENESIS_ROOT,
    programChainHash: GENESIS_CHAIN,
    updateProgramId: PROGRAM.updateV1,
    queryProgramId: PROGRAM.queryV1,
    keyStateHash: ZERO32,
  })

  const result = verifyBundle({
    expectedRequest: new Uint8Array(0),
    expectedNonce: new Uint8Array(0),
    bundleBytes: new Uint8Array([1, 2, 3]),
    trust,
    nowMs: 0n,
    requireFreshHead: false,
  })

  assertFailsAtStep(result, 1, 'MALFORMED_TRANSPORT')
})

test('head at equal sequence with a different root -> JOURNAL_MISMATCH', () => {
  const honest = makeHonestBundle(buildGenesis())
  const headId: HeadIdV1 = {
    sequence: honest.receipt.stateSequence,
    stateRoot: flipByte(honest.receipt.stateRoot),
    updateProgramId: PROGRAM.updateV1,
    queryProgramId: honest.receipt.queryProgramId,
    programChainHash: honest.receipt.programChainHash,
  }
  const forgedHead: LatestHeadV1 = {
    head: headId,
    latestAsOfMs: HONEST_ISSUED_AT_MS,
    headKeyId: honest.world.receiptKey.publicKey,
  }
  const headBytes = encodeLatestHead(forgedHead)
  const headSignature = sign(
    headSigningInput(headBytes),
    honest.world.receiptKey,
  )
  const bundle: ResponseBundle = {
    ...honest.bundle,
    latestHead: headBytes,
    latestHeadSignature: headSignature,
  }

  const result = verifyBundle({
    expectedRequest: honest.expectedRequest,
    expectedNonce: honest.expectedNonce,
    bundleBytes: encodeBundle(bundle),
    trust: honest.trust,
    nowMs: honest.nowMs,
    requireFreshHead: true,
  })

  assertFailsAtStep(result, 16, 'JOURNAL_MISMATCH')
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.rule, 'head-root')
})

test('a genuine migration walk from v1 to v2 accepts end to end', () => {
  const honest = makeHonestBundle(buildGenesis(), { migrateToV2: true })

  const result = verifyBundle({
    expectedRequest: honest.expectedRequest,
    expectedNonce: honest.expectedNonce,
    bundleBytes: honest.bundleBytes,
    trust: honest.trust,
    nowMs: honest.nowMs,
    requireFreshHead: true,
  })

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.checks.length, 19)
  assert.ok(result.checks.every((c) => c.pass || c.skipped))
  assert.deepEqual(result.next.activeUpdateProgramId, PROGRAM.updateV2)
  assert.deepEqual(result.next.activeQueryProgramId, PROGRAM.queryV2)
  assert.equal(result.next.highestSequence, honest.receipt.stateSequence)
})

test('a poisoned head ahead of the receipt does not brick the next honest bundle', () => {
  const world = buildGenesis()
  const honest = makeHonestBundle(world)

  const poisonedHeadId: HeadIdV1 = {
    sequence: honest.receipt.stateSequence + 5n,
    stateRoot: flipByte(honest.receipt.stateRoot),
    updateProgramId: PROGRAM.updateV1,
    queryProgramId: honest.receipt.queryProgramId,
    programChainHash: honest.receipt.programChainHash,
  }
  const poisonedHead: LatestHeadV1 = {
    head: poisonedHeadId,
    latestAsOfMs: HONEST_ISSUED_AT_MS,
    headKeyId: honest.world.receiptKey.publicKey,
  }
  const poisonedHeadBytes = encodeLatestHead(poisonedHead)
  const poisonedHeadSignature = sign(
    headSigningInput(poisonedHeadBytes),
    honest.world.receiptKey,
  )
  const poisonedBundle: ResponseBundle = {
    ...honest.bundle,
    latestHead: poisonedHeadBytes,
    latestHeadSignature: poisonedHeadSignature,
  }

  const first = verifyBundle({
    expectedRequest: honest.expectedRequest,
    expectedNonce: honest.expectedNonce,
    bundleBytes: encodeBundle(poisonedBundle),
    trust: honest.trust,
    nowMs: honest.nowMs,
    requireFreshHead: true,
  })

  assert.equal(first.ok, true)
  if (!first.ok) return
  assert.equal(first.next.highestSequence, honest.receipt.stateSequence)
  assert.deepEqual(first.next.acceptedRoot, honest.receipt.stateRoot)

  const followUp = makeHonestBundle(world, { followUpOnly: true })
  const second = verifyBundle({
    expectedRequest: followUp.expectedRequest,
    expectedNonce: followUp.expectedNonce,
    bundleBytes: followUp.bundleBytes,
    trust: first.next,
    nowMs: followUp.nowMs,
    requireFreshHead: true,
  })

  assert.equal(second.ok, true)
})

test('a query-only migration straddling a batch boundary still accepts', () => {
  const honest = makeHonestBundle(buildGenesis(), { migrateQueryOnly: true })

  const result = verifyBundle({
    expectedRequest: honest.expectedRequest,
    expectedNonce: honest.expectedNonce,
    bundleBytes: honest.bundleBytes,
    trust: honest.trust,
    nowMs: honest.nowMs,
    requireFreshHead: true,
  })

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.checks.length, 19)
  assert.deepEqual(result.next.activeUpdateProgramId, PROGRAM.updateV1)
  assert.deepEqual(result.next.activeQueryProgramId, PROGRAM.queryV2)
})

test('a balance overflow during the transition walk fails typed, not MALFORMED_TRANSPORT', () => {
  const honest = makeHonestBundle(buildGenesis(), { overflowTransfer: true })

  const result = verifyBundle({
    expectedRequest: honest.expectedRequest,
    expectedNonce: honest.expectedNonce,
    bundleBytes: honest.bundleBytes,
    trust: honest.trust,
    nowMs: honest.nowMs,
    requireFreshHead: true,
  })

  assertFailsAtStep(result, 14, 'INVALID_PROOF')
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.rule, 'balance-overflow')
})

test('a bundle carrying a different canonical request is rejected', () => {
  const honest = makeHonestBundle(buildGenesis())
  const bundle: ResponseBundle = {
    ...honest.bundle,
    canonicalRequest: flipByte(honest.bundle.canonicalRequest),
  }

  const result = verifyBundle({
    expectedRequest: honest.expectedRequest,
    expectedNonce: honest.expectedNonce,
    bundleBytes: encodeBundle(bundle),
    trust: honest.trust,
    nowMs: honest.nowMs,
    requireFreshHead: true,
  })

  assertFailsAtStep(result, 8, 'REQUEST_HASH_MISMATCH')
})

test('a caller that does not require a fresh head gets an honestly skipped step 16', () => {
  const honest = makeHonestBundle(buildGenesis())

  const result = verifyBundle({
    expectedRequest: honest.expectedRequest,
    expectedNonce: honest.expectedNonce,
    bundleBytes: honest.bundleBytes,
    trust: honest.trust,
    nowMs: honest.nowMs,
    requireFreshHead: false,
  })

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.checks.length, 19)
  const step16 = result.checks[15]
  assert.equal(step16.step, 16)
  assert.equal(step16.pass, false)
  assert.equal(step16.skipped, true)
  const step18 = result.checks[17]
  assert.equal(step18.step, 18)
  assert.equal(step18.pass, false)
  assert.equal(step18.skipped, true)
})

test('decodeBundle round trips an encoded bundle', () => {
  const honest = makeHonestBundle(buildGenesis())
  assert.deepEqual(decodeBundle(honest.bundleBytes), honest.bundle)
})

test('decodeQueryReceipt round trips an encoded receipt', () => {
  const honest = makeHonestBundle(buildGenesis())
  assert.deepEqual(decodeQueryReceipt(honest.bundle.receipt), honest.receipt)
})
