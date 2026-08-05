import { Client } from '../actors/client.ts'
import { Server } from '../actors/server.ts'
import { encodeBundle } from '../protocol/bundle.ts'
import { hex } from '../protocol/bytes.ts'
import { PROTOCOL_VERSION, ZERO32 } from '../protocol/constants.ts'
import { buildGenesis, GENESIS_ROOT, seqRecords } from '../protocol/genesis.ts'
import { decodeLatestHead } from '../protocol/head.ts'
import { encodeOpenAccount, OP } from '../protocol/ops.ts'
import { GENESIS_CHAIN, PROGRAM } from '../protocol/program.ts'
import {
  encodeGetBalanceBody,
  encodeQueryRequest,
  REQ,
  requestHash,
} from '../protocol/query.ts'
import {
  decodeQueryReceipt,
  proofCacheKey,
  type QueryReceiptV1,
  receiptSigningInput,
} from '../protocol/receipt.ts'
import { type GenesisAnchors, genesisTrust } from '../protocol/trust.ts'
import {
  accountIdFromRequest,
  balanceOpenedAuthorEventStep,
  batchSealStep,
  checkStep,
  genesisAnchorsStep,
} from './helpers.ts'
import { obj, type Scenario, type Trace, type TraceStep } from './trace.ts'

function queryRequestStep(
  who: string,
  requestBytes: Uint8Array,
  nonce: Uint8Array,
): TraceStep {
  const accountId = accountIdFromRequest(requestBytes)
  return {
    actor: 'client',
    kind: 'act',
    label: `${who} requests get-balance(${accountId}) with its own fresh nonce`,
    detail: `nonce ${hex(nonce)}`,
    objects: [
      {
        ...obj(`query-request-${who}`, 'query-request', requestBytes, {
          who,
          requestType: String(REQ.GET_BALANCE),
          accountId,
        }),
        hash: hex(requestHash(requestBytes)),
      },
    ],
  }
}

function sharedQueryProofStep(
  who: string,
  queryProofBytes: Uint8Array,
  receipt: QueryReceiptV1,
): TraceStep {
  const cacheKey = proofCacheKey(
    receipt.queryProgramId,
    receipt.stateRoot,
    receipt.requestHash,
  )
  return {
    actor: 'server',
    kind: 'object',
    label: `${who} receives the query proof served straight from the server's proof cache`,
    detail:
      'the cache key hashes queryProgramId, stateRoot, and requestHash only -- never the nonce',
    objects: [
      obj(`query-proof-${who}`, 'query-proof', queryProofBytes, {
        who,
        proofCacheKey: hex(cacheKey),
      }),
    ],
  }
}

function receiptStep(who: string, receiptBytes: Uint8Array): TraceStep {
  const receipt = decodeQueryReceipt(receiptBytes)
  return {
    actor: 'server',
    kind: 'object',
    label: `server signs ${who}'s own receipt, bound to ${who}'s nonce`,
    objects: [
      {
        ...obj(`receipt-${who}`, 'query-receipt', receiptBytes, {
          who,
          receiptKeyId: hex(receipt.receiptKeyId),
          stateRoot: hex(receipt.stateRoot),
          stateSequence: receipt.stateSequence.toString(),
          requestHash: hex(receipt.requestHash),
          resultHash: hex(receipt.resultHash),
          queryProgramId: hex(receipt.queryProgramId),
          programChainHash: hex(receipt.programChainHash),
          nonce: hex(receipt.nonce),
          issuedAtMs: receipt.issuedAtMs.toString(),
          proofDeadlineMs: receipt.proofDeadlineMs.toString(),
        }),
        hash: hex(receiptSigningInput(receiptBytes)),
      },
    ],
  }
}

function run(): Trace {
  const world = buildGenesis()
  const server = new Server(world)

  const records = seqRecords(world, [
    [
      'alice',
      OP.OPEN_ACCOUNT,
      encodeOpenAccount({ accountId: 'alice', initialBalance: 4_200n }),
    ],
  ])
  for (const record of records) server.submit(record)
  const sealProof = server.sealBatch()

  const requestBytes = encodeQueryRequest({
    requestType: REQ.GET_BALANCE,
    requestVersion: 1,
    body: encodeGetBalanceBody({ accountId: 'alice' }),
  })

  const anchors: GenesisAnchors = {
    protocolVersion: PROTOCOL_VERSION,
    genesisRoot: GENESIS_ROOT,
    programChainHash: GENESIS_CHAIN,
    updateProgramId: PROGRAM.updateV1,
    queryProgramId: PROGRAM.queryV1,
    keyStateHash: ZERO32,
  }
  const clientA = new Client(genesisTrust(anchors), 's06-shared-proof-client-a')
  const clientB = new Client(genesisTrust(anchors), 's06-shared-proof-client-b')

  const { nonce: nonceA } = clientA.request(requestBytes)
  const { nonce: nonceB } = clientB.request(requestBytes)

  const pinnedMs = server.clockMs
  const { receiptBytes: receiptBytesA } = server.execute(requestBytes, nonceA)
  server.clockMs = pinnedMs
  const { receiptBytes: receiptBytesB } = server.execute(requestBytes, nonceB)

  const bundleA = server.proofFor({
    receiptBytes: receiptBytesA,
    sinceSequence: clientA.trust.highestSequence,
  })
  const bundleB = server.proofFor({
    receiptBytes: receiptBytesB,
    sinceSequence: clientB.trust.highestSequence,
  })
  const bundleBytesA = encodeBundle(bundleA)
  const bundleBytesB = encodeBundle(bundleB)

  if (bundleA.latestHead === null || bundleB.latestHead === null) {
    throw new Error('s06: expected a latest-head statement')
  }
  const headA = decodeLatestHead(bundleA.latestHead)
  const headB = decodeLatestHead(bundleB.latestHead)

  const resultA = clientA.acceptBundle(bundleBytesA, headA.latestAsOfMs)
  if (!resultA.ok) {
    throw new Error(`s06: expected client A to ACCEPT, got ${resultA.error}`)
  }
  const resultB = clientB.acceptBundle(bundleBytesB, headB.latestAsOfMs)
  if (!resultB.ok) {
    throw new Error(`s06: expected client B to ACCEPT, got ${resultB.error}`)
  }

  const receiptA = decodeQueryReceipt(receiptBytesA)
  const receiptB = decodeQueryReceipt(receiptBytesB)

  const steps: TraceStep[] = [
    genesisAnchorsStep('genesis anchors pinned by both clients'),
    ...records.map(balanceOpenedAuthorEventStep),
    batchSealStep(
      sealProof,
      'the honest server seals the opening balance into a transition proof',
    ),
    queryRequestStep('client-a', requestBytes, nonceA),
    queryRequestStep('client-b', requestBytes, nonceB),
    sharedQueryProofStep('client-a', bundleA.queryProof, receiptA),
    sharedQueryProofStep('client-b', bundleB.queryProof, receiptB),
    receiptStep('client-a', receiptBytesA),
    receiptStep('client-b', receiptBytesB),
    ...resultA.checks.map((check) => checkStep(check, 'client-a')),
    ...resultB.checks.map((check) => checkStep(check, 'client-b')),
  ]

  return {
    steps,
    checks: [...resultA.checks, ...resultB.checks],
    verdict: {
      kind: 'ACCEPT',
      note: 'the proof cache key hashes only queryProgramId, stateRoot, and requestHash, never the nonce, so the one proof the server built for client A is handed to client B verbatim; each client is still bound to its own nonce by its own separately signed receipt, and both bundles verify',
    },
  }
}

export const scenario: Scenario = {
  meta: {
    id: 6,
    slug: 'shared-proof',
    title: 'Shared proof across nonce-bound receipts',
    taxonomy: 'PREVENTED_BY_MATH',
    specRefs: ['3.2', '13.1', '13.2', '17'],
    expected: 'ACCEPT (twice)',
  },
  run,
}
