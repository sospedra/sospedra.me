import { Client } from '../actors/client.ts'
import { Server } from '../actors/server.ts'
import { encodeBundle, type ResponseBundle } from '../protocol/bundle.ts'
import { hex } from '../protocol/bytes.ts'
import { PROTOCOL_VERSION, ZERO32 } from '../protocol/constants.ts'
import {
  decodeAuthorEvent,
  type GlobalEventRecordV1,
} from '../protocol/events.ts'
import { buildGenesis, GENESIS_ROOT, seqRecords } from '../protocol/genesis.ts'
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
  type TransparentTransitionProofV1,
} from '../protocol/transition.ts'
import { type GenesisAnchors, genesisTrust } from '../protocol/trust.ts'
import type { CheckLog } from '../protocol/verify.ts'
import { obj, type Scenario, type Trace, type TraceStep } from './trace.ts'

const ZERO_SIGNATURE = new Uint8Array(64)

function genesisAnchorsStep(): TraceStep {
  return {
    actor: 'server',
    kind: 'object',
    label: 'genesis anchors pinned by both clients',
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
    label: `alice opens account ${open.accountId} with balance ${open.initialBalance}`,
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

function batchSealStep(proof: TransparentTransitionProofV1): TraceStep {
  const journal = decodeTransitionJournal(proof.journal)
  return {
    actor: 'server',
    kind: 'object',
    label:
      'the honest server seals the opening balance into a transition proof',
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

function accountIdFromRequest(requestBytes: Uint8Array): string {
  return decodeGetBalanceBody(decodeQueryRequest(requestBytes).body).accountId
}

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

function receiptStep(receiptBytes: Uint8Array): TraceStep {
  const receipt = decodeQueryReceipt(receiptBytes)
  return {
    actor: 'server',
    kind: 'object',
    label:
      "server signs an honest immediate query receipt, bound to client A's nonce",
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

function zeroedSignatureStep(originalSig: Uint8Array): TraceStep {
  return {
    actor: 'attacker',
    kind: 'act',
    label:
      "attack (a): the attacker zeroes the receipt signature on client A's otherwise honest bundle",
    detail: `receiptSignature: ${hex(originalSig)} -> ${hex(ZERO_SIGNATURE)}`,
    objects: [
      obj('zeroed-receipt-signature', 'receipt-signature', ZERO_SIGNATURE, {}),
    ],
  }
}

function replaySwapStep(nonceA: Uint8Array, nonceB: Uint8Array): TraceStep {
  return {
    actor: 'attacker',
    kind: 'act',
    label:
      "attack (b): the attacker replays client A's complete, otherwise-honest bundle verbatim to client B, who is waiting on a different nonce",
    detail: `receipt carries client A's nonce ${hex(nonceA)}; client B's outstanding nonce is ${hex(nonceB)}`,
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
      encodeOpenAccount({ accountId: 'alice', initialBalance: 7_777n }),
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
  const clientA = new Client(
    genesisTrust(anchors),
    's07-missing-signature-nonce-replay-client-a',
  )
  const clientB = new Client(
    genesisTrust(anchors),
    's07-missing-signature-nonce-replay-client-b',
  )

  const { nonce: nonceA } = clientA.request(requestBytes)
  const { nonce: nonceB } = clientB.request(requestBytes)

  const { receiptBytes } = server.execute(requestBytes, nonceA)
  const honestBundle = server.proofFor({
    receiptBytes,
    sinceSequence: clientA.trust.highestSequence,
  })
  const honestBundleBytes = encodeBundle(honestBundle)

  if (honestBundle.latestHead === null) {
    throw new Error('s07: expected a latest-head statement')
  }
  const head = decodeLatestHead(honestBundle.latestHead)

  const zeroedBundle: ResponseBundle = {
    ...honestBundle,
    receiptSignature: ZERO_SIGNATURE,
  }
  const zeroedBundleBytes = encodeBundle(zeroedBundle)
  const resultA = clientA.acceptBundle(zeroedBundleBytes, head.latestAsOfMs)
  if (resultA.ok) {
    throw new Error('s07: expected attack (a) to REJECT, got ACCEPT')
  }

  const resultB = clientB.acceptBundle(honestBundleBytes, head.latestAsOfMs)
  if (resultB.ok) {
    throw new Error('s07: expected attack (b) to REJECT, got ACCEPT')
  }

  const steps: TraceStep[] = [
    genesisAnchorsStep(),
    ...records.map(authorEventStep),
    batchSealStep(sealProof),
    queryRequestStep('client-a', requestBytes, nonceA),
    queryRequestStep('client-b', requestBytes, nonceB),
    receiptStep(receiptBytes),
    zeroedSignatureStep(honestBundle.receiptSignature),
    ...resultA.checks.map(checkStep),
    replaySwapStep(nonceA, nonceB),
    ...resultB.checks.map(checkStep),
  ]

  return {
    steps,
    checks: [...resultA.checks, ...resultB.checks],
    verdict: {
      kind: 'REJECT',
      error: resultA.error,
      note: `attack (a) zeroes the receipt signature and the client's own signature check rejects it with "${resultA.error}"; attack (b) replays that same, otherwise-honest bundle verbatim to a second client holding a different outstanding nonce, and its nonce check rejects it with "${resultB.error}"`,
    },
  }
}

export const scenario: Scenario = {
  meta: {
    id: 7,
    slug: 'missing-signature-nonce-replay',
    title: 'Missing signature and nonce replay',
    taxonomy: 'PREVENTED_BY_MATH',
    specRefs: ['6.1', '13.1', '17', '29.3'],
    expected: 'REJECT INVALID_SIGNATURE then REJECT NONCE_MISMATCH',
  },
  run,
}
