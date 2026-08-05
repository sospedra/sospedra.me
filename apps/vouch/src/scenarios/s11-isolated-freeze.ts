import { Client } from '../actors/client.ts'
import { Server } from '../actors/server.ts'
import { encodeBundle, type ResponseBundle } from '../protocol/bundle.ts'
import { hex } from '../protocol/bytes.ts'
import { PROTOCOL_VERSION, ZERO32 } from '../protocol/constants.ts'
import type { SignedHead } from '../protocol/evidence.ts'
import { buildGenesis, GENESIS_ROOT, seqRecords } from '../protocol/genesis.ts'
import { decodeLatestHead } from '../protocol/head.ts'
import { encodeOpenAccount, encodeTransfer, OP } from '../protocol/ops.ts'
import { GENESIS_CHAIN, PROGRAM } from '../protocol/program.ts'
import {
  encodeGetBalanceBody,
  encodeQueryRequest,
  REQ,
  requestHash,
} from '../protocol/query.ts'
import { decodeQueryReceipt, receiptSigningInput } from '../protocol/receipt.ts'
import { genesisTrust } from '../protocol/trust.ts'
import type { VerifyResult } from '../protocol/verify.ts'
import {
  accountIdFromRequest,
  batchSealStep,
  checkStep,
  describedAuthorEventStep,
  genesisAnchorsStep,
  headStatementStep,
} from './helpers.ts'
import { obj, type Scenario, type Trace, type TraceStep } from './trace.ts'

export const REQUIRED_LIMITATION_SENTENCE =
  'Rollback is prevented for returning clients; freezing is not.'

type BundleWithHead = Pick<ResponseBundle, 'latestHead' | 'latestHeadSignature'>

function requireSignedHead(bundle: BundleWithHead): SignedHead {
  if (bundle.latestHead === null || bundle.latestHeadSignature === null) {
    throw new Error('s11: expected a latest-head statement')
  }
  return { headBytes: bundle.latestHead, signature: bundle.latestHeadSignature }
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
        ...obj(`receipt-${round}`, 'query-receipt', receiptBytes, {
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
    label: `${round}: client verification ${result.ok ? 'ACCEPTS' : 'REJECTS'}; trust sits at sequence ${highestSequence}`,
    check: { name: `${round} bundle verification`, pass: result.ok },
  }
}

function run(): Trace {
  const world = buildGenesis()
  const server = new Server(world)

  const records = seqRecords(world, [
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
  for (const record of records) server.submit(record)
  const sealProof = server.sealBatch()

  const requestBytes = encodeQueryRequest({
    requestType: REQ.GET_BALANCE,
    requestVersion: 1,
    body: encodeGetBalanceBody({ accountId: 'bob' }),
  })

  const trust = genesisTrust({
    protocolVersion: PROTOCOL_VERSION,
    genesisRoot: GENESIS_ROOT,
    programChainHash: GENESIS_CHAIN,
    updateProgramId: PROGRAM.updateV1,
    queryProgramId: PROGRAM.queryV1,
    keyStateHash: ZERO32,
  })
  const client = new Client(trust, 's11-isolated-freeze-client')

  const { nonce: firstNonce } = client.request(requestBytes)
  const { receiptBytes: firstReceiptBytes } = server.execute(
    requestBytes,
    firstNonce,
  )
  const firstBundle = server.proofFor({
    receiptBytes: firstReceiptBytes,
    sinceSequence: 0n,
  })
  const firstSignedHead = requireSignedHead(firstBundle)
  const firstHead = decodeLatestHead(firstSignedHead.headBytes)
  const firstResult = client.acceptBundle(
    encodeBundle(firstBundle),
    firstHead.latestAsOfMs,
  )
  if (!firstResult.ok) {
    throw new Error('s11: expected round 1 ACCEPT')
  }

  const { nonce: secondNonce } = client.request(requestBytes)
  const { receiptBytes: secondReceiptBytes } = server.execute(
    requestBytes,
    secondNonce,
  )
  const secondBundle = server.proofFor({
    receiptBytes: secondReceiptBytes,
    sinceSequence: client.trust.highestSequence,
  })
  const secondSignedHead = requireSignedHead(secondBundle)
  const secondHead = decodeLatestHead(secondSignedHead.headBytes)
  const secondResult = client.acceptBundle(
    encodeBundle(secondBundle),
    secondHead.latestAsOfMs,
  )
  if (!secondResult.ok) {
    throw new Error('s11: expected round 2 ACCEPT')
  }

  const firstReceipt = decodeQueryReceipt(firstReceiptBytes)

  const steps: TraceStep[] = [
    genesisAnchorsStep(),
    ...records.map(describedAuthorEventStep),
    batchSealStep(
      sealProof,
      `the honest server seals the opening balances and transfer into a transition proof at sequence ${firstReceipt.stateSequence}, then never sequences another event`,
    ),
    queryRequestStep(requestBytes, firstNonce, 'round-1'),
    receiptStep(firstReceiptBytes, 'round-1'),
    headStatementStep(
      'head-round-1',
      'round-1: the server signs a fresh latest-head statement, honestly reflecting its current state',
      firstSignedHead,
    ),
    ...firstResult.checks.map((check) => checkStep(check, 'round-1')),
    acceptSummaryStep('round-1', firstResult, client.trust.highestSequence),
    queryRequestStep(
      requestBytes,
      secondNonce,
      'round-2 (server has stopped sequencing since round-1)',
    ),
    receiptStep(secondReceiptBytes, 'round-2'),
    headStatementStep(
      'head-round-2',
      'round-2: the server signs a second, later latest-head statement — still fresh, still honest, still claiming the identical sequence and root as round-1',
      secondSignedHead,
    ),
    ...secondResult.checks.map((check) => checkStep(check, 'round-2')),
    acceptSummaryStep('round-2', secondResult, client.trust.highestSequence),
  ]

  return {
    steps,
    checks: [...firstResult.checks, ...secondResult.checks],
    verdict: {
      kind: 'LIMITATION',
      note: `round-1 seals the last transition this server will ever produce, at sequence ${firstReceipt.stateSequence}. Round-2 queries again ${secondHead.latestAsOfMs - firstHead.latestAsOfMs}ms later by the server's own clock: the head is freshly signed and every one of the checks the verifier runs genuinely passes, yet the sequence is still ${firstReceipt.stateSequence}, because the server has simply stopped sequencing for this client. Nothing in local verification can distinguish a frozen server from one that is honestly caught up. ${REQUIRED_LIMITATION_SENTENCE}`,
    },
  }
}

export const scenario: Scenario = {
  meta: {
    id: 11,
    slug: 'isolated-freeze',
    title: 'Isolated freeze limitation',
    taxonomy: 'LIMITATION',
    specRefs: ['4', '6.4', '14.2', '17'],
    expected: 'LIMITATION',
  },
  run,
}
