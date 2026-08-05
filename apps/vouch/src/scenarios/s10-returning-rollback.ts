import { Client } from '../actors/client.ts'
import { Server } from '../actors/server.ts'
import { encodeBundle } from '../protocol/bundle.ts'
import { hex, u64be } from '../protocol/bytes.ts'
import { PROTOCOL_VERSION, ZERO32 } from '../protocol/constants.ts'
import type { GlobalEventRecordV1 } from '../protocol/events.ts'
import {
  buildGenesis,
  GENESIS_ROOT,
  type RecordSpec,
  seqRecords,
  type World,
} from '../protocol/genesis.ts'
import { decodeLatestHead, type LatestHeadV1 } from '../protocol/head.ts'
import { encodeOpenAccount, encodeTransfer, OP } from '../protocol/ops.ts'
import { GENESIS_CHAIN, PROGRAM } from '../protocol/program.ts'
import {
  encodeGetBalanceBody,
  encodeQueryRequest,
  REQ,
  requestHash,
} from '../protocol/query.ts'
import {
  decodeQueryReceipt,
  encodeQueryReceipt,
  receiptSigningInput,
} from '../protocol/receipt.ts'
import { decodeTransitionJournal } from '../protocol/transition.ts'
import { genesisTrust } from '../protocol/trust.ts'
import type { VerifyResult } from '../protocol/verify.ts'
import {
  accountIdFromRequest,
  batchSealStep,
  checkStep,
  describedAuthorEventStep,
  genesisAnchorsStep,
} from './helpers.ts'
import { obj, type Scenario, type Trace, type TraceStep } from './trace.ts'

const EXTRA_TRANSFER_COUNT = 3
const EXTRA_TRANSFER_AMOUNT = 10n

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
      encodeTransfer({ from: 'alice', to: 'bob', amount: 1_000n }),
    ],
  ])
}

function extraTransferRecords(world: World): GlobalEventRecordV1[] {
  const specs: RecordSpec[] = Array.from(
    { length: EXTRA_TRANSFER_COUNT },
    () => [
      'alice',
      OP.TRANSFER,
      encodeTransfer({
        from: 'alice',
        to: 'bob',
        amount: EXTRA_TRANSFER_AMOUNT,
      }),
    ],
  )
  return seqRecords(world, specs)
}

function balanceRequest(accountId: string): Uint8Array {
  return encodeQueryRequest({
    requestType: REQ.GET_BALANCE,
    requestVersion: 1,
    body: encodeGetBalanceBody({ accountId }),
  })
}

function requireHead(latestHead: Uint8Array | null): LatestHeadV1 {
  if (latestHead === null) {
    throw new Error('s10: expected a latest-head statement')
  }
  return decodeLatestHead(latestHead)
}

function queryRequestStep(
  requestBytes: Uint8Array,
  nonce: Uint8Array,
  round: string,
): TraceStep {
  const accountId = accountIdFromRequest(requestBytes)
  return {
    actor: 'client',
    kind: 'act',
    label: `${round}: client requests get-balance(${accountId}) with a fresh nonce`,
    detail: `nonce ${hex(nonce)}`,
    objects: [
      {
        ...obj('query-request', 'query-request', requestBytes, {
          requestType: String(REQ.GET_BALANCE),
          accountId,
        }),
        hash: hex(requestHash(requestBytes)),
      },
    ],
  }
}

function receiptStep(receiptBytes: Uint8Array, round: string): TraceStep {
  const receipt = decodeQueryReceipt(receiptBytes)
  return {
    actor: 'server',
    kind: 'object',
    label: `${round}: server signs an immediate query receipt for state sequence ${receipt.stateSequence}`,
    objects: [
      {
        ...obj('receipt', 'query-receipt', receiptBytes, {
          stateRoot: hex(receipt.stateRoot),
          stateSequence: receipt.stateSequence.toString(),
          resultHash: hex(receipt.resultHash),
          nonce: hex(receipt.nonce),
          issuedAtMs: receipt.issuedAtMs.toString(),
          proofDeadlineMs: receipt.proofDeadlineMs.toString(),
        }),
        hash: hex(receiptSigningInput(receiptBytes)),
      },
    ],
  }
}

function acceptSummaryStep(
  round: string,
  result: VerifyResult,
  highestSequence: bigint,
): TraceStep {
  return {
    actor: 'client',
    kind: 'check',
    label: `${round}: client verification ${result.ok ? 'ACCEPTS' : 'REJECTS'}; trust now persists at sequence ${highestSequence}`,
    check: { name: `${round} bundle verification`, pass: result.ok },
  }
}

function staleBundleStep(
  persistedSequence: bigint,
  staleSequence: bigint,
): TraceStep {
  return {
    actor: 'server',
    kind: 'act',
    label: `the server serves a fully valid bundle built at the old sequence ${staleSequence}, even though this returning client's persisted trust already sits at sequence ${persistedSequence}`,
    objects: [
      obj(
        'persisted-trust-sequence',
        'trust-sequence',
        u64be(persistedSequence),
        { highestSequence: persistedSequence.toString() },
      ),
      obj('stale-bundle-sequence', 'trust-sequence', u64be(staleSequence), {
        stateSequence: staleSequence.toString(),
      }),
    ],
  }
}

function run(): Trace {
  const world = buildGenesis()
  const server = new Server(world)
  const requestBytes = balanceRequest('bob')

  const trust = genesisTrust({
    protocolVersion: PROTOCOL_VERSION,
    genesisRoot: GENESIS_ROOT,
    programChainHash: GENESIS_CHAIN,
    updateProgramId: PROGRAM.updateV1,
    queryProgramId: PROGRAM.queryV1,
    keyStateHash: ZERO32,
  })
  const client = new Client(trust, 's10-returning-rollback-client')

  const firstRecords = openAndTransferRecords(world)
  for (const record of firstRecords) server.submit(record)
  const sealProof1 = server.sealBatch()
  const sequence3 = decodeTransitionJournal(sealProof1.journal).endSequence

  const { nonce: firstNonce } = client.request(requestBytes)
  const { receiptBytes: firstReceiptBytes } = server.execute(
    requestBytes,
    firstNonce,
  )
  const firstBundle = server.proofFor({
    receiptBytes: firstReceiptBytes,
    sinceSequence: 0n,
  })
  const firstHead = requireHead(firstBundle.latestHead)
  const firstResult = client.acceptBundle(
    encodeBundle(firstBundle),
    firstHead.latestAsOfMs,
  )
  if (!firstResult.ok) {
    throw new Error('s10: expected round 1 ACCEPT')
  }

  const secondRecords = extraTransferRecords(world)
  for (const record of secondRecords) server.submit(record)
  const sealProof2 = server.sealBatch()
  const sequence6 = decodeTransitionJournal(sealProof2.journal).endSequence

  const { nonce: secondNonce } = client.request(requestBytes)
  const { receiptBytes: secondReceiptBytes } = server.execute(
    requestBytes,
    secondNonce,
  )
  const secondBundle = server.proofFor({
    receiptBytes: secondReceiptBytes,
    sinceSequence: sequence3,
  })
  const secondHead = requireHead(secondBundle.latestHead)
  const secondResult = client.acceptBundle(
    encodeBundle(secondBundle),
    secondHead.latestAsOfMs,
  )
  if (!secondResult.ok) {
    throw new Error('s10: expected round 2 ACCEPT')
  }

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
  const staleHead = requireHead(staleBundle.latestHead)
  const thirdResult = client.acceptBundle(
    encodeBundle(staleBundle),
    staleHead.latestAsOfMs,
  )
  if (thirdResult.ok) {
    throw new Error('s10: expected round 3 REJECT')
  }

  const steps: TraceStep[] = [
    genesisAnchorsStep(),
    ...firstRecords.map(describedAuthorEventStep),
    batchSealStep(
      sealProof1,
      `the honest server seals the opening balances and first transfer into a transition proof, reaching sequence ${sequence3}`,
    ),
    queryRequestStep(requestBytes, firstNonce, 'round 1'),
    receiptStep(firstReceiptBytes, 'round 1'),
    ...firstResult.checks.map((check) => checkStep(check, 'round 1')),
    acceptSummaryStep('round 1', firstResult, client.trust.highestSequence),
    ...secondRecords.map(describedAuthorEventStep),
    batchSealStep(
      sealProof2,
      `the honest server seals three more transfers into a second transition proof, reaching sequence ${sequence6}`,
    ),
    queryRequestStep(requestBytes, secondNonce, 'round 2'),
    receiptStep(secondReceiptBytes, 'round 2'),
    ...secondResult.checks.map((check) => checkStep(check, 'round 2')),
    acceptSummaryStep('round 2', secondResult, client.trust.highestSequence),
    queryRequestStep(
      requestBytes,
      thirdNonce,
      'round 3 (the server replays a stale snapshot)',
    ),
    staleBundleStep(client.trust.highestSequence, sequence3),
    receiptStep(staleReceiptBytes, 'round 3 (stale)'),
    ...thirdResult.checks.map((check) => checkStep(check, 'round 3')),
  ]

  return {
    steps,
    checks: [
      ...firstResult.checks,
      ...secondResult.checks,
      ...thirdResult.checks,
    ],
    verdict: {
      kind: 'REJECT',
      error: thirdResult.error,
      note: `the stale bundle is internally valid in every respect the first ten checks cover: signature, receipt-key witness, request hash, and result hash all check out; only its position in history fails, because its stateSequence ${sequence3} sits behind the client's own already-persisted trust at sequence ${client.trust.highestSequence}, so ${thirdResult.error} catches it before any transition proof is even walked`,
    },
  }
}

export const scenario: Scenario = {
  meta: {
    id: 10,
    slug: 'returning-rollback',
    title: 'Returning-client rollback',
    taxonomy: 'PREVENTED_BY_MATH',
    specRefs: ['6.1', '13', '17', '18'],
    expected: 'REJECT ROLLBACK_DETECTED',
  },
  run,
}
