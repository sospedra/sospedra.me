import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  decodeBundle,
  encodeBundle,
  type ResponseBundle,
} from '../src/protocol/bundle.ts'
import {
  FRESHNESS,
  PROTOCOL_VERSION,
  ZERO32,
} from '../src/protocol/constants.ts'
import {
  buildGenesis,
  GENESIS_ROOT,
  seqRecords,
  type World,
} from '../src/protocol/genesis.ts'
import { hash } from '../src/protocol/hash.ts'
import {
  encodeLatestHead,
  type HeadIdV1,
  headSigningInput,
  type LatestHeadV1,
} from '../src/protocol/head.ts'
import { keypairFromLabel, sign } from '../src/protocol/keys.ts'
import { encodeOpenAccount, OP } from '../src/protocol/ops.ts'
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
import {
  CHAIN_KEY,
  encodeReceiptKeyV1,
  MIGRATION_KEY,
  receiptKeyKey,
  SEQUENCE_KEY,
} from '../src/protocol/state.ts'
import {
  batchHash,
  decodeTransitionJournal,
  encodeTransitionJournal,
  encodeTransparentTransitionProof,
  proveBatch,
  type TransitionJournalV1,
} from '../src/protocol/transition.ts'
import { genesisTrust } from '../src/protocol/trust.ts'
import type { VerifyErrorCode, VerifyResult } from '../src/protocol/verify.ts'
import { verifyBundle } from '../src/protocol/verify.ts'
import type { AccessV1 } from '../src/protocol/view.ts'
import {
  HONEST_ISSUED_AT_MS,
  type HonestBundleResult,
  makeHonestBundle,
} from './helpers.ts'

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

function assertRule(result: VerifyResult, rule: string): void {
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.rule, rule)
}

function verifyTampered(
  honest: HonestBundleResult,
  bundle: ResponseBundle,
): VerifyResult {
  return verifyBundle({
    expectedRequest: honest.expectedRequest,
    expectedNonce: honest.expectedNonce,
    bundleBytes: encodeBundle(bundle),
    trust: honest.trust,
    nowMs: honest.nowMs,
    requireFreshHead: true,
  })
}

type DoctoredReceiptKey = { witness: AccessV1; stateRoot: Uint8Array }

function doctorReceiptKey(world: World, value: Uint8Array): DoctoredReceiptKey {
  const key = receiptKeyKey(world.receiptKey.publicKey)
  const doctored = world.tree.clone()
  doctored.set(key, value)
  return {
    witness: {
      op: 1,
      key,
      value: doctored.get(key),
      witness: doctored.witness(key),
    },
    stateRoot: doctored.root(),
  }
}

function rebindReceiptKey(
  honest: HonestBundleResult,
  doctored: DoctoredReceiptKey,
): ResponseBundle {
  const forged: QueryReceiptV1 = {
    ...honest.receipt,
    stateRoot: doctored.stateRoot,
  }
  const { receiptBytes, signature } = reencodeReceipt(
    forged,
    honest.world.receiptKey,
  )
  return {
    ...honest.bundle,
    receipt: receiptBytes,
    receiptSignature: signature,
    receiptKeyWitness: doctored.witness,
  }
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

test('an appended zero-record segment cannot forge the active update program id', () => {
  const world = buildGenesis()
  const honest = makeHonestBundle(world)
  const zeroProof = proveBatch(world.tree, [], PROGRAM.updateV1)
  const forgedJournal = {
    ...decodeTransitionJournal(zeroProof.journal),
    updateProgramId: PROGRAM.updateV2,
  }
  const forgedProof = {
    ...zeroProof,
    journal: encodeTransitionJournal(forgedJournal),
  }
  const attackerBundle: ResponseBundle = {
    ...honest.bundle,
    transitions: [
      ...honest.bundle.transitions,
      encodeTransparentTransitionProof(forgedProof),
    ],
  }

  const result = verifyBundle({
    expectedRequest: honest.expectedRequest,
    expectedNonce: honest.expectedNonce,
    bundleBytes: encodeBundle(attackerBundle),
    trust: honest.trust,
    nowMs: honest.nowMs,
    requireFreshHead: true,
  })

  assertFailsAtStep(result, 14, 'INVALID_PROOF')
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.rule, 'wrong-era')
})

test('an appended honest zero-record segment still verifies and keeps the update program id', () => {
  const world = buildGenesis()
  const honest = makeHonestBundle(world)
  const zeroProof = proveBatch(world.tree, [], PROGRAM.updateV1)
  const bundle: ResponseBundle = {
    ...honest.bundle,
    transitions: [
      ...honest.bundle.transitions,
      encodeTransparentTransitionProof(zeroProof),
    ],
  }

  const result = verifyBundle({
    expectedRequest: honest.expectedRequest,
    expectedNonce: honest.expectedNonce,
    bundleBytes: encodeBundle(bundle),
    trust: honest.trust,
    nowMs: honest.nowMs,
    requireFreshHead: true,
  })

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.deepEqual(result.next.activeUpdateProgramId, PROGRAM.updateV1)
  assert.equal(result.next.highestSequence, honest.receipt.stateSequence)
  assert.deepEqual(result.next.acceptedRoot, honest.receipt.stateRoot)
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

test('trust state with an unsupported protocol version is rejected at verifier entry', () => {
  const honest = makeHonestBundle(buildGenesis())
  const trust = { ...honest.trust, protocolVersion: PROTOCOL_VERSION + 1 }

  const result = verifyBundle({
    expectedRequest: honest.expectedRequest,
    expectedNonce: honest.expectedNonce,
    bundleBytes: honest.bundleBytes,
    trust,
    nowMs: honest.nowMs,
    requireFreshHead: true,
  })

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.error, 'UNSUPPORTED_PROTOCOL_VERSION')
  assert.deepEqual(result.checks, [])
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

test('an attached head with a sequence behind the receipt is ROLLBACK_DETECTED', () => {
  const honest = makeHonestBundle(buildGenesis())
  const laggingHeadId: HeadIdV1 = {
    sequence: honest.receipt.stateSequence - 2n,
    stateRoot: honest.receipt.stateRoot,
    updateProgramId: PROGRAM.updateV1,
    queryProgramId: honest.receipt.queryProgramId,
    programChainHash: honest.receipt.programChainHash,
  }
  const laggingHead: LatestHeadV1 = {
    head: laggingHeadId,
    latestAsOfMs: HONEST_ISSUED_AT_MS,
    headKeyId: honest.world.receiptKey.publicKey,
  }
  const laggingHeadBytes = encodeLatestHead(laggingHead)
  const laggingHeadSignature = sign(
    headSigningInput(laggingHeadBytes),
    honest.world.receiptKey,
  )
  const bundle: ResponseBundle = {
    ...honest.bundle,
    latestHead: laggingHeadBytes,
    latestHeadSignature: laggingHeadSignature,
  }

  const result = verifyBundle({
    expectedRequest: honest.expectedRequest,
    expectedNonce: honest.expectedNonce,
    bundleBytes: encodeBundle(bundle),
    trust: honest.trust,
    nowMs: honest.nowMs,
    requireFreshHead: true,
  })

  assertFailsAtStep(result, 16, 'ROLLBACK_DETECTED')
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.rule, 'head-sequence')
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

test('a future-dated attached head is rejected even when requireFreshHead is false', () => {
  const honest = makeHonestBundle(buildGenesis())
  const headId: HeadIdV1 = {
    sequence: honest.receipt.stateSequence,
    stateRoot: honest.receipt.stateRoot,
    updateProgramId: PROGRAM.updateV1,
    queryProgramId: honest.receipt.queryProgramId,
    programChainHash: honest.receipt.programChainHash,
  }
  const futureHead: LatestHeadV1 = {
    head: headId,
    latestAsOfMs: honest.nowMs + FRESHNESS.clockSkewMs + 1_000n,
    headKeyId: honest.world.receiptKey.publicKey,
  }
  const headBytes = encodeLatestHead(futureHead)
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
    requireFreshHead: false,
  })

  assertFailsAtStep(result, 16, 'FUTURE_HEAD')
})

test('requireFreshHead false still validates signature and future bound, only staleness is skipped', () => {
  const honest = makeHonestBundle(buildGenesis())

  const result = verifyBundle({
    expectedRequest: honest.expectedRequest,
    expectedNonce: honest.expectedNonce,
    bundleBytes: honest.bundleBytes,
    trust: honest.trust,
    nowMs: honest.nowMs + 1_000_000n,
    requireFreshHead: false,
  })

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.checks.length, 19)
  const step16 = result.checks[15]
  assert.equal(step16.step, 16)
  assert.equal(step16.pass, true)
  assert.equal(step16.skipped, undefined)
  assert.equal(result.next.lastLatestAsOfMs, HONEST_ISSUED_AT_MS)
})

test('requireFreshHead false with no attached head still skips step 16', () => {
  const honest = makeHonestBundle(buildGenesis(), { includeHead: false })

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

test('a receipt-key witness carrying a set access instead of a read is rejected', () => {
  const honest = makeHonestBundle(buildGenesis())

  const result = verifyTampered(honest, {
    ...honest.bundle,
    receiptKeyWitness: {
      ...honest.bundle.receiptKeyWitness,
      op: 2,
      value: null,
    },
  })

  assertFailsAtStep(result, 4, 'INVALID_PROOF')
  assertRule(result, 'receipt-key-op')
})

test('a receipt-key witness proving some other key is rejected', () => {
  const world = buildGenesis()
  const honest = makeHonestBundle(world)
  const otherKey = receiptKeyKey(world.authors.alice.publicKey)

  const result = verifyTampered(honest, {
    ...honest.bundle,
    receiptKeyWitness: {
      op: 1,
      key: otherKey,
      value: world.tree.get(otherKey),
      witness: world.tree.witness(otherKey),
    },
  })

  assertFailsAtStep(result, 4, 'INVALID_PROOF')
  assertRule(result, 'receipt-key-target')
})

test('a receipt naming a key the state never authorized is rejected', () => {
  const world = buildGenesis()
  const honest = makeHonestBundle(world)
  const stranger = keypairFromLabel('receipt-stranger')
  const forged: QueryReceiptV1 = {
    ...honest.receipt,
    receiptKeyId: stranger.publicKey,
  }
  const { receiptBytes, signature } = reencodeReceipt(forged, stranger)
  const strangerKey = receiptKeyKey(stranger.publicKey)

  const result = verifyTampered(honest, {
    ...honest.bundle,
    receipt: receiptBytes,
    receiptSignature: signature,
    receiptKeyWitness: {
      op: 1,
      key: strangerKey,
      value: world.tree.get(strangerKey),
      witness: world.tree.witness(strangerKey),
    },
  })

  assertFailsAtStep(result, 4, 'UNAUTHORIZED_KEY')
  assertRule(result, 'receipt-key-absent')
})

test('a witnessed receipt-key record that does not decode is rejected', () => {
  const world = buildGenesis()
  const honest = makeHonestBundle(world)
  const doctored = doctorReceiptKey(world, new Uint8Array([0xff]))

  const result = verifyTampered(honest, rebindReceiptKey(honest, doctored))

  assertFailsAtStep(result, 4, 'MALFORMED_CANONICAL_OBJECT')
  assertRule(result, 'receipt-key-decode')
})

test('a receipt-key authorized only after the proven sequence is rejected', () => {
  const world = buildGenesis()
  const honest = makeHonestBundle(world)
  const doctored = doctorReceiptKey(
    world,
    encodeReceiptKeyV1({
      status: 1,
      sinceSequence: honest.receipt.stateSequence + 1n,
    }),
  )

  const result = verifyTampered(honest, rebindReceiptKey(honest, doctored))

  assertFailsAtStep(result, 4, 'UNAUTHORIZED_KEY')
  assertRule(result, 'receipt-key-since')
})

test('an undecodable query proof is rejected at step 12', () => {
  const honest = makeHonestBundle(buildGenesis())

  const result = verifyTampered(honest, {
    ...honest.bundle,
    queryProof: new Uint8Array([7, 7, 7]),
  })

  assertFailsAtStep(result, 12, 'INVALID_PROOF')
  assertRule(result, 'query-proof-decode')
})

test('an undecodable transition segment is rejected at step 14', () => {
  const honest = makeHonestBundle(buildGenesis())

  const result = verifyTampered(honest, {
    ...honest.bundle,
    transitions: [new Uint8Array([7, 7, 7])],
  })

  assertFailsAtStep(result, 14, 'INVALID_PROOF')
  assertRule(result, 'transition-decode')
})

test('a trust sequence that disagrees with the trust root breaks the segment link', () => {
  const honest = makeHonestBundle(buildGenesis())

  const result = verifyBundle({
    expectedRequest: honest.expectedRequest,
    expectedNonce: honest.expectedNonce,
    bundleBytes: honest.bundleBytes,
    trust: { ...honest.trust, highestSequence: 1n },
    nowMs: honest.nowMs,
    requireFreshHead: true,
  })

  assertFailsAtStep(result, 14, 'INVALID_PROOF')
  assertRule(result, 'continuity')
})

test('an era change with no migration attached is rejected', () => {
  const honest = makeHonestBundle(buildGenesis(), { migrateToV2: true })

  const result = verifyTampered(honest, { ...honest.bundle, migrations: [] })

  assertFailsAtStep(result, 15, 'INVALID_PROGRAM_CHAIN')
  assertRule(result, 'migration-missing')
})

test('an era change backed by an undecodable migration is rejected', () => {
  const honest = makeHonestBundle(buildGenesis(), { migrateToV2: true })

  const result = verifyTampered(honest, {
    ...honest.bundle,
    migrations: [new Uint8Array([7, 7, 7])],
  })

  assertFailsAtStep(result, 15, 'INVALID_PROGRAM_CHAIN')
  assertRule(result, 'migration-decode')
})

test('a migration whose next update program is not the one the era ran is rejected', () => {
  const honest = makeHonestBundle(buildGenesis(), { migrateToV2: true })
  const migration = decodeMigration(honest.bundle.migrations[0])

  const result = verifyTampered(honest, {
    ...honest.bundle,
    migrations: [
      encodeMigration({ ...migration, nextUpdateProgramId: PROGRAM.updateV1 }),
    ],
  })

  assertFailsAtStep(result, 15, 'INVALID_PROGRAM_CHAIN')
  assertRule(result, 'migration-update-id')
})

test('a migration whose next query program is not the one the era ran is rejected', () => {
  const honest = makeHonestBundle(buildGenesis(), { migrateToV2: true })
  const migration = decodeMigration(honest.bundle.migrations[0])

  const result = verifyTampered(honest, {
    ...honest.bundle,
    migrations: [
      encodeMigration({ ...migration, nextQueryProgramId: PROGRAM.queryV1 }),
    ],
  })

  assertFailsAtStep(result, 15, 'INVALID_PROGRAM_CHAIN')
  assertRule(result, 'migration-query-id')
})

test('a tampered head signature is rejected', () => {
  const honest = makeHonestBundle(buildGenesis())
  const headSignature = honest.bundle.latestHeadSignature
  assert.ok(headSignature)

  const result = verifyTampered(honest, {
    ...honest.bundle,
    latestHeadSignature: flipByte(headSignature),
  })

  assertFailsAtStep(result, 16, 'INVALID_SIGNATURE')
  assertRule(result, 'head-signature')
})

test('a head signed by a key other than the receipt key is rejected', () => {
  const honest = makeHonestBundle(buildGenesis())
  const stranger = keypairFromLabel('head-stranger')
  const headId: HeadIdV1 = {
    sequence: honest.receipt.stateSequence,
    stateRoot: honest.receipt.stateRoot,
    updateProgramId: PROGRAM.updateV1,
    queryProgramId: honest.receipt.queryProgramId,
    programChainHash: honest.receipt.programChainHash,
  }
  const strangerHead: LatestHeadV1 = {
    head: headId,
    latestAsOfMs: HONEST_ISSUED_AT_MS,
    headKeyId: stranger.publicKey,
  }
  const headBytes = encodeLatestHead(strangerHead)

  const result = verifyTampered(honest, {
    ...honest.bundle,
    latestHead: headBytes,
    latestHeadSignature: sign(headSigningInput(headBytes), stranger),
  })

  assertFailsAtStep(result, 16, 'UNAUTHORIZED_KEY')
  assertRule(result, 'head-key-era')
})

test('requireFreshHead true with no attached head is STALE_HEAD', () => {
  const honest = makeHonestBundle(buildGenesis(), { includeHead: false })

  const result = verifyTampered(honest, honest.bundle)

  assertFailsAtStep(result, 16, 'STALE_HEAD')
  assertRule(result, 'head-absent')
})

test('an undecodable latest head is rejected', () => {
  const honest = makeHonestBundle(buildGenesis())
  const headSignature = honest.bundle.latestHeadSignature
  assert.ok(headSignature)

  const result = verifyTampered(honest, {
    ...honest.bundle,
    latestHead: new Uint8Array([7, 7, 7]),
    latestHeadSignature: headSignature,
  })

  assertFailsAtStep(result, 16, 'MALFORMED_CANONICAL_OBJECT')
  assertRule(result, 'head-decode')
})

test('a proof over undecodable witnessed state fails typed, not MALFORMED_TRANSPORT', () => {
  const honest = makeHonestBundle(buildGenesis())
  const doctored = buildGenesis()
  doctored.tree.set(MIGRATION_KEY, new Uint8Array([0xff]))
  const records = seqRecords(doctored, [
    [
      'alice',
      OP.OPEN_ACCOUNT,
      encodeOpenAccount({ accountId: 'carol', initialBalance: 0n }),
    ],
  ])
  const startRoot = doctored.tree.root()
  const readAccess = (key: Uint8Array): AccessV1 => ({
    op: 1,
    key,
    value: doctored.tree.get(key),
    witness: doctored.tree.witness(key),
  })
  const journal: TransitionJournalV1 = {
    startRoot,
    endRoot: startRoot,
    startSequence: 0n,
    endSequence: 1n,
    batchHash: batchHash(records),
    updateProgramId: PROGRAM.updateV1,
    activeQueryProgramId: PROGRAM.queryV1,
    programChainHash: GENESIS_CHAIN,
  }
  const segment = encodeTransparentTransitionProof({
    journal: encodeTransitionJournal(journal),
    records,
    accesses: [
      readAccess(SEQUENCE_KEY),
      readAccess(SEQUENCE_KEY),
      readAccess(CHAIN_KEY),
      readAccess(MIGRATION_KEY),
    ],
  })

  const result = verifyBundle({
    expectedRequest: honest.expectedRequest,
    expectedNonce: honest.expectedNonce,
    bundleBytes: encodeBundle({ ...honest.bundle, transitions: [segment] }),
    trust: { ...honest.trust, acceptedRoot: startRoot },
    nowMs: honest.nowMs,
    requireFreshHead: true,
  })

  assertFailsAtStep(result, 14, 'INVALID_PROOF')
  assertRule(result, 'unexpected')
})

test('the accepted trust state binds the proven receipt-key record', () => {
  const honest = makeHonestBundle(buildGenesis())
  const receiptKeyValue = honest.bundle.receiptKeyWitness.value
  assert.ok(receiptKeyValue)

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
  const expected = hash('key-state', receiptKeyValue)
  assert.deepEqual(result.next.activeKeyStateHash, expected)
  assert.notDeepEqual(
    result.next.activeKeyStateHash,
    honest.trust.activeKeyStateHash,
  )
})
