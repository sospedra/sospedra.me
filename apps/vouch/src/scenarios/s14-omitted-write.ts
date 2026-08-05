import { Client } from '../actors/client.ts'
import { Server } from '../actors/server.ts'
import { encodeBundle } from '../protocol/bundle.ts'
import { bytesEqual, concat, hex } from '../protocol/bytes.ts'
import { PROTOCOL_VERSION, ZERO32 } from '../protocol/constants.ts'
import {
  ackSigningInput,
  decodeAuthorEvent,
  type GlobalEventRecordV1,
  type WriteAckV1,
} from '../protocol/events.ts'
import {
  ackOmission,
  type Evidence,
  type SignedAck,
} from '../protocol/evidence.ts'
import {
  buildGenesis,
  GENESIS_ROOT,
  type RecordSpec,
  seqRecords,
} from '../protocol/genesis.ts'
import { decodeLatestHead } from '../protocol/head.ts'
import { decodeOpenAccount, encodeOpenAccount, OP } from '../protocol/ops.ts'
import { GENESIS_CHAIN, PROGRAM } from '../protocol/program.ts'
import {
  decodeBalanceResult,
  encodeGetBalanceBody,
  encodeQueryRequest,
  REQ,
  requestHash,
  resultHash,
} from '../protocol/query.ts'
import { decodeQueryReceipt, receiptSigningInput } from '../protocol/receipt.ts'
import { genesisTrust } from '../protocol/trust.ts'
import {
  accountIdFromRequest,
  authorEventStep,
  balanceOpenedAuthorEventStep,
  batchSealStep,
  checkStep,
  genesisAnchorsStep,
} from './helpers.ts'
import { obj, type Scenario, type Trace, type TraceStep } from './trace.ts'

const FILLER_COUNT = 6
const BELOW_BOUNDARY_PROVEN_THROUGH = 4n

function fillerEventLabel(record: GlobalEventRecordV1): string {
  const event = decodeAuthorEvent(record.authorEvent)
  const open = decodeOpenAccount(event.payload)
  return `bob opens filler account ${open.accountId}, filling global sequence ${record.globalSequence} with history unrelated to alice's dropped event`
}

function writeAckStep(
  ack: WriteAckV1,
  ackBytes: Uint8Array,
  signature: Uint8Array,
): TraceStep {
  return {
    actor: 'server',
    kind: 'object',
    label: `the server signs a write acknowledgement for alice's event, promising inclusion by global sequence ${ack.mustLandBySequence}`,
    objects: [
      {
        ...obj('write-ack', 'write-ack', ackBytes, {
          eventHash: hex(ack.eventHash),
          acceptedAtMs: ack.acceptedAtMs.toString(),
          acceptedAgainstSequence: ack.acceptedAgainstSequence.toString(),
          mustLandBySequence: ack.mustLandBySequence.toString(),
          signature: hex(signature),
        }),
        hash: hex(ackSigningInput(ackBytes)),
      },
    ],
  }
}

function droppedEventStep(record: GlobalEventRecordV1): TraceStep {
  return {
    actor: 'server',
    kind: 'act',
    label:
      'the server drops the acknowledged event before any batch is sealed; it will never appear in sealed history',
    objects: [
      obj('dropped-event-hash', 'event-hash', record.eventHash, {
        globalSequence: record.globalSequence.toString(),
      }),
    ],
  }
}

function queryRequestStep(
  requestBytes: Uint8Array,
  nonce: Uint8Array,
): TraceStep {
  const accountId = accountIdFromRequest(requestBytes)
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

function missingAccountResultStep(
  resultBytes: Uint8Array,
  accountId: string,
): TraceStep {
  const balance = decodeBalanceResult(resultBytes)
  return {
    actor: 'server',
    kind: 'object',
    label: `the verified history honestly answers get-balance(${accountId}): exists ${balance.exists}, because alice's OPEN_ACCOUNT never landed anywhere in it`,
    objects: [
      {
        ...obj('missing-account-result', 'balance-result', resultBytes, {
          accountId,
          exists: String(balance.exists),
          balance: balance.balance.toString(),
        }),
        hash: hex(resultHash(resultBytes)),
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
      'server signs an honest immediate query receipt for the verified history through the crossed boundary',
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

function evidenceCallStep(
  evidence: Evidence,
  provenThrough: bigint,
  included: boolean,
): TraceStep {
  return {
    actor: 'peer',
    kind: 'object',
    label: `ackOmission(ack, provenThrough=${provenThrough}, included=${included}) returns portable evidence: "${evidence.detail}"`,
    objects: [
      obj('ack-omission-evidence', 'evidence', concat(...evidence.objects), {
        kind: evidence.kind,
        taxonomy: evidence.taxonomy,
        detail: evidence.detail,
        provenThrough: provenThrough.toString(),
        included: String(included),
        objectCount: evidence.objects.length.toString(),
      }),
    ],
  }
}

function belowBoundaryCallStep(
  provenThrough: bigint,
  included: boolean,
): TraceStep {
  return {
    actor: 'peer',
    kind: 'act',
    label: `for contrast, ackOmission(ack, provenThrough=${provenThrough}, included=${included}) returns null: provenThrough has not yet reached mustLandBySequence, so absence before the boundary is not evidence`,
    detail: 'result: null',
  }
}

function run(): Trace {
  const world = buildGenesis()
  const server = new Server(world)

  const [droppedRecord] = seqRecords(world, [
    [
      'alice',
      OP.OPEN_ACCOUNT,
      encodeOpenAccount({ accountId: 'alice', initialBalance: 5_000n }),
    ],
  ])
  const submitResult = server.submit(droppedRecord)
  if (submitResult.ack.mustLandBySequence !== 5n) {
    throw new Error('s14: expected mustLandBySequence 5')
  }

  server.log = []

  const fillerSpecs: RecordSpec[] = Array.from(
    { length: FILLER_COUNT },
    (_, index) => [
      'bob',
      OP.OPEN_ACCOUNT,
      encodeOpenAccount({
        accountId: `guest-${index + 1}`,
        initialBalance: 0n,
      }),
    ],
  )
  const fillerRecords = seqRecords(world, fillerSpecs)
  for (const record of fillerRecords) server.submit(record)
  const sealProof = server.sealBatch()

  const requestBytes = encodeQueryRequest({
    requestType: REQ.GET_BALANCE,
    requestVersion: 1,
    body: encodeGetBalanceBody({ accountId: 'alice' }),
  })
  const accountId = accountIdFromRequest(requestBytes)

  const trust = genesisTrust({
    protocolVersion: PROTOCOL_VERSION,
    genesisRoot: GENESIS_ROOT,
    programChainHash: GENESIS_CHAIN,
    updateProgramId: PROGRAM.updateV1,
    queryProgramId: PROGRAM.queryV1,
    keyStateHash: ZERO32,
  })
  const client = new Client(trust, 's14-omitted-write-client')
  const { nonce } = client.request(requestBytes)
  const { resultBytes, receiptBytes } = server.execute(requestBytes, nonce)
  const bundle = server.proofFor({ receiptBytes, sinceSequence: 0n })
  const bundleBytes = encodeBundle(bundle)

  if (bundle.latestHead === null) {
    throw new Error('s14: expected a latest-head statement')
  }
  const head = decodeLatestHead(bundle.latestHead)
  const result = client.acceptBundle(bundleBytes, head.latestAsOfMs)
  if (!result.ok) {
    throw new Error('s14: expected the honest query to ACCEPT')
  }

  const provenThrough = client.trust.highestSequence
  const included = sealProof.records.some((record) =>
    bytesEqual(record.eventHash, droppedRecord.eventHash),
  )
  if (included) {
    throw new Error(
      's14: expected the dropped event to be absent from sealed history',
    )
  }

  const signedAck: SignedAck = {
    ackBytes: submitResult.ackBytes,
    signature: submitResult.signature,
  }
  const evidence = ackOmission(signedAck, provenThrough, included)
  if (evidence === null) {
    throw new Error('s14: expected ack-omission evidence past the boundary')
  }

  const noEvidenceYet = ackOmission(
    signedAck,
    BELOW_BOUNDARY_PROVEN_THROUGH,
    included,
  )
  if (noEvidenceYet !== null) {
    throw new Error('s14: expected null below the boundary')
  }

  const steps: TraceStep[] = [
    genesisAnchorsStep(),
    balanceOpenedAuthorEventStep(droppedRecord),
    writeAckStep(
      submitResult.ack,
      submitResult.ackBytes,
      submitResult.signature,
    ),
    droppedEventStep(droppedRecord),
    ...fillerRecords.map((record) =>
      authorEventStep(record, fillerEventLabel(record)),
    ),
    batchSealStep(
      sealProof,
      `the honest server seals six filler events from bob, reaching global sequence ${provenThrough} without alice's event ever appearing`,
    ),
    queryRequestStep(requestBytes, nonce),
    missingAccountResultStep(resultBytes, accountId),
    receiptStep(receiptBytes),
    ...result.checks.map((check) => checkStep(check)),
    evidenceCallStep(evidence, provenThrough, included),
    belowBoundaryCallStep(BELOW_BOUNDARY_PROVEN_THROUGH, included),
  ]

  return {
    steps,
    checks: result.checks,
    verdict: {
      kind: 'EVIDENCE',
      note: `alice's event is acknowledged with mustLandBySequence ${submitResult.ack.mustLandBySequence}, then dropped: the server seals six unrelated events instead, and the client independently verifies that sealed history through global sequence ${provenThrough}, honestly, with alice's event hash absent from every record in it. ackOmission(ack, ${provenThrough}, included=false) returns "${evidence.detail}", taxonomy ${evidence.taxonomy} — the signed acknowledgement plus the later verified history together are portable, self-authenticating proof of the omission. The taxonomy line is exact: the identical call pinned at provenThrough ${BELOW_BOUNDARY_PROVEN_THROUGH}, still below mustLandBySequence ${submitResult.ack.mustLandBySequence}, returns null. Absence before the boundary is not evidence (spec 6.2, 10.3).`,
    },
  }
}

export const scenario: Scenario = {
  meta: {
    id: 14,
    slug: 'omitted-write',
    title: 'Omitted acknowledged write after crossed boundary',
    taxonomy: 'PROVABLE_ON_RECORD',
    specRefs: ['6.2', '10.3'],
    expected: 'EVIDENCE (ack-omission)',
  },
  run,
}
