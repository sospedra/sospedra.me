import { Client } from '../actors/client.ts'
import { Server } from '../actors/server.ts'
import { encodeBundle } from '../protocol/bundle.ts'
import { hex } from '../protocol/bytes.ts'
import { PROTOCOL_VERSION, ZERO32 } from '../protocol/constants.ts'
import {
  decodeAuthorEvent,
  type GlobalEventRecordV1,
  makeSignedEvent,
} from '../protocol/events.ts'
import { buildGenesis, GENESIS_ROOT } from '../protocol/genesis.ts'
import { decodeLatestHead } from '../protocol/head.ts'
import { decodeOpenAccount, encodeOpenAccount, OP } from '../protocol/ops.ts'
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
  RuleError,
  type TransparentTransitionProofV1,
} from '../protocol/transition.ts'
import { genesisTrust } from '../protocol/trust.ts'
import type { CheckLog } from '../protocol/verify.ts'
import { obj, type Scenario, type Trace, type TraceStep } from './trace.ts'

function requireRecord(server: Server): GlobalEventRecordV1 {
  const record = server.log.at(-1)
  if (!record) throw new Error('s03: expected a submitted record')
  return record
}

function requireRecordAt(
  records: GlobalEventRecordV1[],
  index: number,
): GlobalEventRecordV1 {
  const record = records.at(index)
  if (!record) throw new Error('s03: expected a record at that index')
  return record
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
  const open = decodeOpenAccount(event.payload)
  return {
    actor: 'author',
    kind: 'object',
    label: `alice opens account ${open.accountId} as author-sequence ${event.authorSequence}, global sequence ${record.globalSequence}`,
    objects: [
      {
        ...obj('author-event', 'author-event', record.authorEvent, {
          authorKeyId: hex(event.authorKeyId),
          authorSequence: event.authorSequence.toString(),
          globalSequence: record.globalSequence.toString(),
        }),
        hash: hex(record.eventHash),
      },
    ],
  }
}

function honestRefusalStep(rule: string): TraceStep {
  return {
    actor: 'server',
    kind: 'check',
    label:
      "the honest server refuses to resubmit alice's event 1 at global " +
      'sequence 2: her on-chain author-sequence is already 1',
    detail: `caught RuleError(${rule}) at submit time, before anything reached the log`,
    check: {
      name: 'author-sequence chain check (submit-time)',
      pass: false,
      error: rule,
    },
  }
}

function batchSealStep(proof: TransparentTransitionProofV1): TraceStep {
  const journal = decodeTransitionJournal(proof.journal)
  return {
    actor: 'server',
    kind: 'object',
    label:
      "the honest server seals alice's two real events into a transition proof",
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

function replaySwapStep(
  realSecondRecord: GlobalEventRecordV1,
  forgedRecord: GlobalEventRecordV1,
): TraceStep {
  return {
    actor: 'attacker',
    kind: 'act',
    label:
      "the malicious server discards alice's real second event and re-sequences " +
      'her event 1 verbatim as global sequence 2 instead, in the already-sealed proof',
    detail:
      `slot global sequence ${forgedRecord.globalSequence}: real event hash ` +
      `${hex(realSecondRecord.eventHash)} -> replayed event hash ${hex(forgedRecord.eventHash)}`,
    objects: [
      obj(
        'discarded-real-event',
        'author-event',
        realSecondRecord.authorEvent,
        {
          globalSequence: realSecondRecord.globalSequence.toString(),
        },
      ),
      obj('replayed-event', 'author-event', forgedRecord.authorEvent, {
        globalSequence: forgedRecord.globalSequence.toString(),
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
      'journal and accesses are untouched, only the replayed record changed',
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

function attemptReplaySubmit(
  server: Server,
  event1: {
    eventBytes: Uint8Array
    signature: Uint8Array
    eventHash: Uint8Array
  },
): string {
  try {
    server.submit({
      eventBytes: event1.eventBytes,
      signature: event1.signature,
      eventHash: event1.eventHash,
    })
  } catch (err) {
    if (!(err instanceof RuleError)) throw err
    return err.rule
  }
  throw new Error(
    's03: expected the honest server to refuse the replay at submit',
  )
}

function run(): Trace {
  const world = buildGenesis()
  const server = new Server(world)
  const alice = world.authors.alice

  const event1 = makeSignedEvent(
    alice,
    1n,
    ZERO32,
    OP.OPEN_ACCOUNT,
    encodeOpenAccount({ accountId: 'alice', initialBalance: 10_000n }),
  )
  server.submit({
    eventBytes: event1.eventBytes,
    signature: event1.signature,
    eventHash: event1.eventHash,
  })
  const record1 = requireRecord(server)

  const refusalRule = attemptReplaySubmit(server, event1)

  const event2 = makeSignedEvent(
    alice,
    2n,
    event1.eventHash,
    OP.OPEN_ACCOUNT,
    encodeOpenAccount({ accountId: 'bob', initialBalance: 0n }),
  )
  server.submit({
    eventBytes: event2.eventBytes,
    signature: event2.signature,
    eventHash: event2.eventHash,
  })
  const record2 = requireRecord(server)

  const sealProof = server.sealBatch()
  const realSecondRecord = requireRecordAt(sealProof.records, 1)
  const forgedRecord: GlobalEventRecordV1 = {
    globalSequence: realSecondRecord.globalSequence,
    eventHash: event1.eventHash,
    authorEvent: event1.eventBytes,
    authorSignature: event1.signature,
  }
  const forgedProof: TransparentTransitionProofV1 = {
    ...sealProof,
    records: sealProof.records.map((record, index) =>
      index === 1 ? forgedRecord : record,
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
  const client = new Client(trust, 's03-author-replay-client')
  const { nonce } = client.request(requestBytes)

  const { receiptBytes } = server.execute(requestBytes, nonce)
  const bundle = server.proofFor({
    receiptBytes,
    sinceSequence: trust.highestSequence,
  })
  const bundleBytes = encodeBundle(bundle)

  if (bundle.latestHead === null) {
    throw new Error('s03: expected a latest-head statement')
  }
  const head = decodeLatestHead(bundle.latestHead)
  const result = client.acceptBundle(bundleBytes, head.latestAsOfMs)
  if (result.ok) {
    throw new Error('s03: expected REJECT, got ACCEPT')
  }

  const steps: TraceStep[] = [
    genesisAnchorsStep(),
    authorEventStep(record1),
    honestRefusalStep(refusalRule),
    authorEventStep(record2),
    batchSealStep(sealProof),
    replaySwapStep(realSecondRecord, forgedRecord),
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
      note: `replaying alice's own event 1 at a later global sequence still carries author-sequence 1, so it cannot follow her own already-advanced chain; rule "${result.rule}" catches it during the client's transition replay`,
    },
  }
}

export const scenario: Scenario = {
  meta: {
    id: 3,
    slug: 'author-replay',
    title: 'Author-event replay',
    taxonomy: 'PREVENTED_BY_MATH',
    specRefs: ['6.1', '10', '11', '29.3'],
    expected: 'REJECT INVALID_PROOF (author-sequence)',
  },
  run,
}
