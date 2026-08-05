import { Client } from '../actors/client.ts'
import { Server } from '../actors/server.ts'
import { encodeBundle } from '../protocol/bundle.ts'
import { hex } from '../protocol/bytes.ts'
import { PROTOCOL_VERSION, ZERO32 } from '../protocol/constants.ts'
import {
  decodeAuthorEvent,
  type GlobalEventRecordV1,
} from '../protocol/events.ts'
import { buildGenesis, GENESIS_ROOT, seqRecords } from '../protocol/genesis.ts'
import { decodeLatestHead } from '../protocol/head.ts'
import {
  decodeOpenAccount,
  decodeTransfer,
  encodeOpenAccount,
  encodeTransfer,
  OP,
} from '../protocol/ops.ts'
import { GENESIS_CHAIN, PROGRAM } from '../protocol/program.ts'
import {
  decodeGetBalanceBody,
  decodeQueryRequest,
  encodeGetBalanceBody,
  encodeQueryRequest,
  REQ,
  requestHash,
} from '../protocol/query.ts'
import { decodeQueryReceipt, receiptSigningInput } from '../protocol/receipt.ts'
import {
  decodeTransitionJournal,
  type TransparentTransitionProofV1,
} from '../protocol/transition.ts'
import { genesisTrust } from '../protocol/trust.ts'
import type { CheckLog } from '../protocol/verify.ts'
import { obj, type Scenario, type Trace, type TraceStep } from './trace.ts'

export const SPEC_ACCEPTANCE_CLAIM =
  'The accepted state descends from the pinned genesis through valid, ' +
  'authenticated state transitions AND result = ' +
  'active_published_program(accepted_state, normalized_request).'

const EVENT_DESCRIBERS: Record<number, (payload: Uint8Array) => string> = {
  [OP.OPEN_ACCOUNT]: (payload) =>
    `alice opens account ${decodeOpenAccount(payload).accountId}`,
  [OP.TRANSFER]: (payload) => {
    const transfer = decodeTransfer(payload)
    return `alice transfers ${transfer.amount} to ${transfer.to}`
  },
}

function describeEvent(record: GlobalEventRecordV1): string {
  const event = decodeAuthorEvent(record.authorEvent)
  return EVENT_DESCRIBERS[event.operation]?.(event.payload) ?? 'author event'
}

function genesisAnchorsStep(): TraceStep {
  return {
    actor: 'server',
    kind: 'object',
    label: 'genesis anchors pinned by the client',
    objects: [
      obj('genesis-anchors', 'genesis-anchors', GENESIS_ROOT, {
        genesisRoot: hex(GENESIS_ROOT),
        updateProgramId: hex(PROGRAM.updateV1),
        queryProgramId: hex(PROGRAM.queryV1),
        programChainHash: hex(GENESIS_CHAIN),
      }),
    ],
  }
}

function authorEventStep(record: GlobalEventRecordV1): TraceStep {
  const event = decodeAuthorEvent(record.authorEvent)
  return {
    actor: 'author',
    kind: 'object',
    label: describeEvent(record),
    objects: [
      {
        ...obj('author-event', 'author-event', record.authorEvent, {
          authorKeyId: hex(event.authorKeyId),
          authorSequence: event.authorSequence.toString(),
          globalSequence: record.globalSequence.toString(),
          operation: event.operation.toString(),
        }),
        hash: hex(record.eventHash),
      },
    ],
  }
}

function batchSealStep(proof: TransparentTransitionProofV1): TraceStep {
  const journal = decodeTransitionJournal(proof.journal)
  return {
    actor: 'server',
    kind: 'object',
    label: 'server seals the pending batch into a transition proof',
    objects: [
      {
        ...obj('batch-seal', 'transition-journal', proof.journal, {
          startRoot: hex(journal.startRoot),
          endRoot: hex(journal.endRoot),
          startSequence: journal.startSequence.toString(),
          endSequence: journal.endSequence.toString(),
          updateProgramId: hex(journal.updateProgramId),
        }),
        hash: hex(journal.batchHash),
      },
    ],
  }
}

function queryRequestStep(
  requestBytes: Uint8Array,
  nonce: Uint8Array,
): TraceStep {
  const body = decodeQueryRequest(requestBytes).body
  const { accountId } = decodeGetBalanceBody(body)
  return {
    actor: 'client',
    kind: 'act',
    label: `client requests get-balance(${accountId}) with a fresh nonce`,
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

function receiptStep(receiptBytes: Uint8Array): TraceStep {
  const receipt = decodeQueryReceipt(receiptBytes)
  return {
    actor: 'server',
    kind: 'object',
    label: 'server signs an immediate query receipt',
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

function checkStep(check: CheckLog): TraceStep {
  return {
    actor: 'client',
    kind: 'check',
    label: check.name,
    detail: check.skipped ? 'skipped' : undefined,
    check: { name: check.name, pass: check.pass, error: check.error },
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
      encodeTransfer({ from: 'alice', to: 'bob', amount: 1000n }),
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
  const client = new Client(trust, 's04-honest-query-client')
  const { nonce } = client.request(requestBytes)

  const { receiptBytes } = server.execute(requestBytes, nonce)
  const bundle = server.proofFor({
    receiptBytes,
    sinceSequence: trust.highestSequence,
  })
  const bundleBytes = encodeBundle(bundle)

  if (bundle.latestHead === null) {
    throw new Error('s04: expected a latest-head statement')
  }
  const head = decodeLatestHead(bundle.latestHead)
  const result = client.acceptBundle(bundleBytes, head.latestAsOfMs)
  if (!result.ok) {
    throw new Error(`s04: expected ACCEPT, got ${result.error}`)
  }

  const steps: TraceStep[] = [
    genesisAnchorsStep(),
    ...records.map(authorEventStep),
    batchSealStep(sealProof),
    queryRequestStep(requestBytes, nonce),
    receiptStep(receiptBytes),
    ...result.checks.map(checkStep),
  ]

  return {
    steps,
    checks: result.checks,
    verdict: { kind: 'ACCEPT', note: SPEC_ACCEPTANCE_CLAIM },
  }
}

export const scenario: Scenario = {
  meta: {
    id: 4,
    slug: 'honest-query',
    title: 'Honest final query',
    taxonomy: 'PREVENTED_BY_MATH',
    specRefs: ['1', '10', '12', '13', '17'],
    expected: 'ACCEPT',
  },
  run,
}
