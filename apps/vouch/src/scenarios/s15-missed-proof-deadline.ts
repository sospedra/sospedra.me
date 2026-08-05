import { Client } from '../actors/client.ts'
import { Server } from '../actors/server.ts'
import { hex } from '../protocol/bytes.ts'
import { PROTOCOL_VERSION, ZERO32 } from '../protocol/constants.ts'
import { buildGenesis, GENESIS_ROOT, seqRecords } from '../protocol/genesis.ts'
import { encodeOpenAccount, OP } from '../protocol/ops.ts'
import { GENESIS_CHAIN, PROGRAM } from '../protocol/program.ts'
import {
  encodeGetBalanceBody,
  encodeQueryRequest,
  REQ,
  requestHash,
} from '../protocol/query.ts'
import { decodeQueryReceipt, receiptSigningInput } from '../protocol/receipt.ts'
import { genesisTrust } from '../protocol/trust.ts'
import {
  accountIdFromRequest,
  balanceOpenedAuthorEventStep,
  batchSealStep,
  genesisAnchorsStep,
} from './helpers.ts'
import { obj, type Scenario, type Trace, type TraceStep } from './trace.ts'

const DEADLINE_OVERAGE_MS = 1_000n

export const NON_PORTABILITY_SENTENCE =
  'The absence of a message is not positive evidence. A missed proof deadline is locally observable but is not, by itself, portable proof that the server never delivered the proof elsewhere.'

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

function receiptStep(receiptBytes: Uint8Array): TraceStep {
  const receipt = decodeQueryReceipt(receiptBytes)
  return {
    actor: 'server',
    kind: 'object',
    label:
      'the server signs an immediate query receipt, promising a full proof by proofDeadlineMs',
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

function overdueLocallyStep(
  nowMs: bigint,
  deadlineMs: bigint,
  overdue: boolean,
): TraceStep {
  const ageMs = nowMs - deadlineMs
  return {
    actor: 'client',
    kind: 'check',
    label: `the client's own clock reads ${nowMs}, ${ageMs}ms past proofDeadlineMs ${deadlineMs}, with no full proof delivered over this channel; the client marks the receipt overdue locally`,
    check: {
      name: 'receipt still within proof deadline (local judgment)',
      pass: !overdue,
    },
  }
}

function nonPortabilityStep(): TraceStep {
  return {
    actor: 'client',
    kind: 'act',
    label: `${NON_PORTABILITY_SENTENCE} Contrast with s14: there, a signed write acknowledgement plus a later, independently verified history crossing its promised boundary produces portable evidence; here, no signed object commits the server to any checkable delivery boundary, and there is no independently verifiable ledger of proof deliveries to check absence against.`,
  }
}

function run(): Trace {
  const world = buildGenesis()
  const server = new Server(world)

  const records = seqRecords(world, [
    [
      'alice',
      OP.OPEN_ACCOUNT,
      encodeOpenAccount({ accountId: 'alice', initialBalance: 5_000n }),
    ],
  ])
  for (const record of records) server.submit(record)
  const sealProof = server.sealBatch()

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
  const client = new Client(trust, 's15-missed-proof-deadline-client')
  const { nonce } = client.request(requestBytes)
  const { receiptBytes } = server.execute(requestBytes, nonce)
  const receipt = decodeQueryReceipt(receiptBytes)

  const nowMs = receipt.proofDeadlineMs + DEADLINE_OVERAGE_MS
  const overdueLocally = nowMs > receipt.proofDeadlineMs
  if (!overdueLocally) {
    throw new Error('s15: expected the receipt to be locally overdue')
  }

  const steps: TraceStep[] = [
    genesisAnchorsStep(),
    ...records.map(balanceOpenedAuthorEventStep),
    batchSealStep(
      sealProof,
      "the honest server seals alice's opening balance into a transition proof",
    ),
    queryRequestStep(requestBytes, nonce),
    receiptStep(receiptBytes),
    overdueLocallyStep(nowMs, receipt.proofDeadlineMs, overdueLocally),
    nonPortabilityStep(),
  ]

  return {
    steps,
    checks: [],
    verdict: {
      kind: 'LIMITATION',
      note: `the server issues an immediate receipt at issuedAtMs ${receipt.issuedAtMs}, promising a full proof by proofDeadlineMs ${receipt.proofDeadlineMs}. By the client's own clock reading ${nowMs}, ${nowMs - receipt.proofDeadlineMs}ms have passed with no proof delivered over this channel, so the client marks it overdue locally. ${NON_PORTABILITY_SENTENCE} Contrast with s14 (ack omission): there, a signed acknowledgement commits the server to a checkable inclusion boundary against a later, independently verified global history, so crossing that boundary while the event is absent from the verified history is portable, on-record evidence. Here, no signed object commits the server to any checkable delivery boundary, and there is no independently verifiable ledger of proof deliveries to check absence against — overdue is exactly what it looks like: a local timer expiring, nothing more.`,
    },
  }
}

export const scenario: Scenario = {
  meta: {
    id: 15,
    slug: 'missed-proof-deadline',
    title: 'Missed proof deadline as local overdue state only',
    taxonomy: 'LIMITATION',
    specRefs: ['6.2'],
    expected: 'LIMITATION',
  },
  run,
}
