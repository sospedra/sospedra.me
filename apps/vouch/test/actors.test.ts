import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Client } from '../src/actors/client.ts'
import { CLOCK_STEP_MS, Server } from '../src/actors/server.ts'
import { encodeBundle } from '../src/protocol/bundle.ts'
import { hex } from '../src/protocol/bytes.ts'
import { PROTOCOL_VERSION, ZERO32 } from '../src/protocol/constants.ts'
import type { GlobalEventRecordV1 } from '../src/protocol/events.ts'
import {
  buildGenesis,
  GENESIS_ROOT,
  type RecordSpec,
  seqRecords,
  type World,
} from '../src/protocol/genesis.ts'
import { decodeLatestHead, type LatestHeadV1 } from '../src/protocol/head.ts'
import { encodeOpenAccount, encodeTransfer, OP } from '../src/protocol/ops.ts'
import { GENESIS_CHAIN, PROGRAM } from '../src/protocol/program.ts'
import {
  decodeBalanceResult,
  decodeQueryJournal,
  decodeTransparentQueryProof,
  encodeBalanceResult,
  encodeGetBalanceBody,
  encodeQueryJournal,
  encodeQueryRequest,
  encodeTransparentQueryProof,
  REQ,
  resultHash,
} from '../src/protocol/query.ts'
import {
  decodeQueryReceipt,
  encodeQueryReceipt,
  proofCacheKey,
  receiptSigningInput,
} from '../src/protocol/receipt.ts'
import { genesisTrust } from '../src/protocol/trust.ts'
import { verifyBundle } from '../src/protocol/verify.ts'
import { makeHonestBundle } from './helpers.ts'

function genesisClientTrust() {
  return genesisTrust({
    protocolVersion: PROTOCOL_VERSION,
    genesisRoot: GENESIS_ROOT,
    programChainHash: GENESIS_CHAIN,
    updateProgramId: PROGRAM.updateV1,
    queryProgramId: PROGRAM.queryV1,
    keyStateHash: ZERO32,
  })
}

function openAndTransferRecords(world: World): GlobalEventRecordV1[] {
  return seqRecords(world, [
    [
      'alice',
      OP.OPEN_ACCOUNT,
      encodeOpenAccount({ accountId: 'alice', initialBalance: 10_000n }),
    ],
    [
      'alice',
      OP.OPEN_ACCOUNT,
      encodeOpenAccount({ accountId: 'bob', initialBalance: 0n }),
    ],
    [
      'alice',
      OP.TRANSFER,
      encodeTransfer({ from: 'alice', to: 'bob', amount: 1000n }),
    ],
  ])
}

function extraTransferRecords(
  world: World,
  count: number,
): GlobalEventRecordV1[] {
  const specs: RecordSpec[] = Array.from({ length: count }, () => [
    'alice',
    OP.TRANSFER,
    encodeTransfer({ from: 'alice', to: 'bob', amount: 10n }),
  ])
  return seqRecords(world, specs)
}

function balanceRequest(accountId: string): Uint8Array {
  return encodeQueryRequest({
    requestType: REQ.GET_BALANCE,
    requestVersion: 1,
    body: encodeGetBalanceBody({ accountId }),
  })
}

function requireHead(bundle: { latestHead: Uint8Array | null }): LatestHeadV1 {
  if (bundle.latestHead === null) {
    throw new Error('actors.test: expected a latest-head statement')
  }
  return decodeLatestHead(bundle.latestHead)
}

test('proofFor serves the receipt-key witness from the receipt snapshot, not the live tree', () => {
  const world = buildGenesis()
  const server = new Server(world)
  for (const record of openAndTransferRecords(world)) server.submit(record)
  server.sealBatch()

  const requestBytes = balanceRequest('bob')
  const client = new Client(genesisClientTrust(), 'finding1-client')

  const { nonce: firstNonce } = client.request(requestBytes)
  const { receiptBytes: firstReceiptBytes } = server.execute(
    requestBytes,
    firstNonce,
  )
  const firstBundle = server.proofFor({
    receiptBytes: firstReceiptBytes,
    sinceSequence: 0n,
  })
  const firstHead = requireHead(firstBundle)
  const firstAccept = client.acceptBundle(
    encodeBundle(firstBundle),
    firstHead.latestAsOfMs,
  )
  assert.equal(firstAccept.ok, true)
  assert.equal(client.trust.highestSequence, 3n)

  for (const record of extraTransferRecords(world, 3)) server.submit(record)
  server.sealBatch()

  const { nonce: secondNonce } = client.request(requestBytes)
  const { receiptBytes: secondReceiptBytes } = server.execute(
    requestBytes,
    secondNonce,
  )
  const secondBundle = server.proofFor({
    receiptBytes: secondReceiptBytes,
    sinceSequence: 3n,
  })
  const secondHead = requireHead(secondBundle)
  const secondAccept = client.acceptBundle(
    encodeBundle(secondBundle),
    secondHead.latestAsOfMs,
  )
  assert.equal(secondAccept.ok, true)
  assert.equal(client.trust.highestSequence, 6n)

  const { nonce: thirdNonce } = client.request(requestBytes)
  const firstReceipt = decodeQueryReceipt(firstReceiptBytes)
  const staleReceiptBytes = encodeQueryReceipt({
    ...firstReceipt,
    nonce: thirdNonce,
  })
  const staleBundle = server.proofFor({
    receiptBytes: staleReceiptBytes,
    sinceSequence: 0n,
  })
  const staleHead = requireHead(staleBundle)
  const result = client.acceptBundle(
    encodeBundle(staleBundle),
    staleHead.latestAsOfMs,
  )

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.error, 'ROLLBACK_DETECTED')
  const last = result.checks.at(-1)
  assert.equal(last?.step, 11)
  for (const check of result.checks.slice(0, -1)) assert.equal(check.pass, true)
})

test('proofFor can answer with a forged canonical result while the underlying proof stays honest', () => {
  const world = buildGenesis()
  const server = new Server(world)
  for (const record of openAndTransferRecords(world)) server.submit(record)
  server.sealBatch()

  const requestBytes = balanceRequest('bob')
  const nonce = new Uint8Array(16).fill(7)
  const { resultBytes, receiptBytes } = server.execute(requestBytes, nonce)
  const honestBalance = decodeBalanceResult(resultBytes)
  const forgedResultBytes = encodeBalanceResult({
    exists: true,
    balance: honestBalance.balance + 1000n,
  })

  const receipt = decodeQueryReceipt(receiptBytes)
  const forgedReceiptBytes = encodeQueryReceipt({
    ...receipt,
    resultHash: resultHash(forgedResultBytes),
  })

  const cacheKey = hex(
    proofCacheKey(
      receipt.queryProgramId,
      receipt.stateRoot,
      receipt.requestHash,
    ),
  )
  const cachedProofBytes = server.proofCache.get(cacheKey)
  assert.ok(cachedProofBytes)
  const cachedProof = decodeTransparentQueryProof(cachedProofBytes)
  const forgedJournal = {
    ...decodeQueryJournal(cachedProof.journal),
    resultHash: resultHash(forgedResultBytes),
  }
  server.proofCache.set(
    cacheKey,
    encodeTransparentQueryProof({
      ...cachedProof,
      journal: encodeQueryJournal(forgedJournal),
    }),
  )

  const trust = genesisClientTrust()

  const beforeOverride = server.proofFor({
    receiptBytes: forgedReceiptBytes,
    sinceSequence: 0n,
  })
  const beforeHead = requireHead(beforeOverride)
  const beforeResult = verifyBundle({
    expectedRequest: requestBytes,
    expectedNonce: nonce,
    bundleBytes: encodeBundle(beforeOverride),
    trust,
    nowMs: beforeHead.latestAsOfMs,
    requireFreshHead: true,
  })
  assert.equal(beforeResult.ok, false)
  if (!beforeResult.ok) {
    assert.equal(beforeResult.error, 'RESULT_HASH_MISMATCH')
    assert.equal(beforeResult.checks.length, 10)
  }

  server.resultOverrides.set(
    hex(receiptSigningInput(forgedReceiptBytes)),
    forgedResultBytes,
  )

  const afterOverride = server.proofFor({
    receiptBytes: forgedReceiptBytes,
    sinceSequence: 0n,
  })
  const afterHead = requireHead(afterOverride)
  const afterResult = verifyBundle({
    expectedRequest: requestBytes,
    expectedNonce: nonce,
    bundleBytes: encodeBundle(afterOverride),
    trust,
    nowMs: afterHead.latestAsOfMs,
    requireFreshHead: true,
  })
  assert.equal(afterResult.ok, false)
  if (!afterResult.ok) {
    assert.equal(afterResult.error, 'INVALID_PROOF')
    assert.equal(afterResult.rule, 'result')
    assert.equal(afterResult.checks.length, 12)
  }
})

test('signedHead still auto-ticks the clock when called with no argument', () => {
  const world = buildGenesis()
  const server = new Server(world)
  const before = server.clockMs
  const { headBytes } = server.signedHead()
  assert.equal(server.clockMs, before + CLOCK_STEP_MS)
  const head = decodeLatestHead(headBytes)
  assert.equal(head.latestAsOfMs, before)
})

test('signedHead can pin an explicit latestAsOfMs so two heads share a timestamp', () => {
  const world = buildGenesis()
  const server = new Server(world)
  for (const record of openAndTransferRecords(world)) server.submit(record)
  server.sealBatch()

  const pinnedMs = server.clockMs
  const headA = server.signedHead(pinnedMs)
  server.chainHash = new Uint8Array(32).fill(0xee)
  const headB = server.signedHead(pinnedMs)

  assert.equal(server.clockMs, pinnedMs)

  const decodedA = decodeLatestHead(headA.headBytes)
  const decodedB = decodeLatestHead(headB.headBytes)
  assert.equal(decodedA.latestAsOfMs, pinnedMs)
  assert.equal(decodedB.latestAsOfMs, pinnedMs)
  assert.notDeepEqual(
    decodedA.head.programChainHash,
    decodedB.head.programChainHash,
  )
})

test('the Server/Client actor path agrees with the test-helper bundle builder on receipt fields', () => {
  const helperResult = makeHonestBundle(buildGenesis())
  const helperVerify = verifyBundle({
    expectedRequest: helperResult.expectedRequest,
    expectedNonce: helperResult.expectedNonce,
    bundleBytes: helperResult.bundleBytes,
    trust: helperResult.trust,
    nowMs: helperResult.nowMs,
    requireFreshHead: true,
  })
  assert.equal(helperVerify.ok, true)

  const actorWorld = buildGenesis()
  const server = new Server(actorWorld)
  for (const record of openAndTransferRecords(actorWorld)) server.submit(record)
  server.sealBatch()
  const requestBytes = balanceRequest('bob')
  const client = new Client(genesisClientTrust(), 'parity-client')
  const { nonce } = client.request(requestBytes)
  const { receiptBytes } = server.execute(requestBytes, nonce)
  const bundle = server.proofFor({ receiptBytes, sinceSequence: 0n })
  const head = requireHead(bundle)
  const actorVerify = client.acceptBundle(
    encodeBundle(bundle),
    head.latestAsOfMs,
  )
  assert.equal(actorVerify.ok, true)

  const actorReceipt = decodeQueryReceipt(bundle.receipt)
  assert.deepEqual(actorReceipt.stateRoot, helperResult.receipt.stateRoot)
  assert.equal(actorReceipt.stateSequence, helperResult.receipt.stateSequence)
  assert.deepEqual(actorReceipt.requestHash, helperResult.receipt.requestHash)
  assert.deepEqual(actorReceipt.resultHash, helperResult.receipt.resultHash)
})
