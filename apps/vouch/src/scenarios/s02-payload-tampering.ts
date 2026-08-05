import { Client } from '../actors/client.ts'
import { Server } from '../actors/server.ts'
import { encodeBundle } from '../protocol/bundle.ts'
import { hex } from '../protocol/bytes.ts'
import { PROTOCOL_VERSION, ZERO32 } from '../protocol/constants.ts'
import {
  decodeAuthorEvent,
  encodeAuthorEvent,
  eventHash,
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

function requireRecord(
  records: GlobalEventRecordV1[],
  index: number,
): GlobalEventRecordV1 {
  const record = records.at(index)
  if (!record) throw new Error('s02: expected a record at that index')
  return record
}

function tryDescribeTransfer(payload: Uint8Array): Record<string, string> {
  try {
    const transfer = decodeTransfer(payload)
    return {
      from: transfer.from,
      to: transfer.to,
      amount: transfer.amount.toString(),
    }
  } catch {
    return { from: '(corrupted)', to: '(corrupted)', amount: '(corrupted)' }
  }
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
    label: 'the honest server seals the pending batch into a transition proof',
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

function payloadDiffStep(
  originalPayload: Uint8Array,
  tamperedPayload: Uint8Array,
): TraceStep {
  return {
    actor: 'attacker',
    kind: 'act',
    label:
      "attacker flips byte 0 of the sealed transfer's payload inside the " +
      'sequenced record, then edits the already-sealed transition proof to carry it',
    detail: `payload byte 0: 0x${originalPayload[0].toString(16)} -> 0x${tamperedPayload[0].toString(16)}`,
    objects: [
      obj('original-payload', 'transfer-payload', originalPayload, {
        ...tryDescribeTransfer(originalPayload),
      }),
      obj('tampered-payload', 'transfer-payload', tamperedPayload, {
        ...tryDescribeTransfer(tamperedPayload),
      }),
    ],
  }
}

function maliciousSealStep(proof: TransparentTransitionProofV1): TraceStep {
  const journal = decodeTransitionJournal(proof.journal)
  return {
    actor: 'server',
    kind: 'object',
    label:
      'the malicious server hands out the doctored transition proof anyway; ' +
      'journal and accesses are untouched, only the record bytes changed',
    objects: [
      {
        ...obj('malicious-seal', 'transition-journal', proof.journal, {
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
  const { accountId } = decodeGetBalanceBody(
    decodeQueryRequest(requestBytes).body,
  )
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
    label:
      'server signs an honest immediate query receipt (the tree itself was never tampered)',
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

  const transferIndex = 2
  const originalRecord = requireRecord(sealProof.records, transferIndex)
  const originalEvent = decodeAuthorEvent(originalRecord.authorEvent)
  const originalPayload = originalEvent.payload
  const tamperedPayload = originalPayload.with(0, originalPayload[0] ^ 0xff)
  const tamperedEventBytes = encodeAuthorEvent({
    ...originalEvent,
    payload: tamperedPayload,
  })
  const tamperedRecord: GlobalEventRecordV1 = {
    globalSequence: originalRecord.globalSequence,
    eventHash: eventHash(tamperedEventBytes, originalRecord.authorSignature),
    authorEvent: tamperedEventBytes,
    authorSignature: originalRecord.authorSignature,
  }
  const forgedProof: TransparentTransitionProofV1 = {
    ...sealProof,
    records: sealProof.records.map((record, index) =>
      index === transferIndex ? tamperedRecord : record,
    ),
  }
  const sealIndex = server.sealedTransitions.length - 1
  server.sealedTransitions[sealIndex] = forgedProof

  const requestBytes = encodeQueryRequest({
    requestType: REQ.GET_BALANCE,
    requestVersion: 1,
    body: encodeGetBalanceBody({ accountId: 'alice' }),
  })

  const trust = genesisTrust({
    protocolVersion: PROTOCOL_VERSION,
    genesisRoot: GENESIS_ROOT,
    programChainHash: GENESIS_CHAIN,
    updateProgramId: PROGRAM.updateV1,
    queryProgramId: PROGRAM.queryV1,
    keyStateHash: ZERO32,
  })
  const client = new Client(trust, 's02-payload-tampering-client')
  const { nonce } = client.request(requestBytes)

  const { receiptBytes } = server.execute(requestBytes, nonce)
  const bundle = server.proofFor({
    receiptBytes,
    sinceSequence: trust.highestSequence,
  })
  const bundleBytes = encodeBundle(bundle)

  if (bundle.latestHead === null) {
    throw new Error('s02: expected a latest-head statement')
  }
  const head = decodeLatestHead(bundle.latestHead)
  const result = client.acceptBundle(bundleBytes, head.latestAsOfMs)
  if (result.ok) {
    throw new Error('s02: expected REJECT, got ACCEPT')
  }

  const steps: TraceStep[] = [
    genesisAnchorsStep(),
    ...records.map(authorEventStep),
    batchSealStep(sealProof),
    payloadDiffStep(originalPayload, tamperedPayload),
    maliciousSealStep(forgedProof),
    queryRequestStep(requestBytes, nonce),
    receiptStep(receiptBytes),
    ...result.checks.map(checkStep),
  ]

  return {
    steps,
    checks: result.checks,
    verdict: {
      kind: 'REJECT',
      error: result.error,
      note: `the tampered payload changes the signed bytes, so the author signature no longer verifies; rule "${result.rule}" catches it during the client's transition replay`,
    },
  }
}

export const scenario: Scenario = {
  meta: {
    id: 2,
    slug: 'payload-tampering',
    title: 'Signed payload tampering',
    taxonomy: 'PREVENTED_BY_MATH',
    specRefs: ['6.1', '10', '11', '29.3'],
    expected: 'REJECT INVALID_PROOF (author-signature)',
  },
  run,
}
