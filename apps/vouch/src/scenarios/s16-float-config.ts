import { Client } from '../actors/client.ts'
import { Server } from '../actors/server.ts'
import { encodeBundle } from '../protocol/bundle.ts'
import { hex } from '../protocol/bytes.ts'
import { PROTOCOL_VERSION, ZERO32 } from '../protocol/constants.ts'
import { Reader } from '../protocol/encode.ts'
import {
  decodeAuthorEvent,
  type GlobalEventRecordV1,
  makeSignedEvent,
} from '../protocol/events.ts'
import { buildGenesis, GENESIS_ROOT } from '../protocol/genesis.ts'
import { decodeLatestHead } from '../protocol/head.ts'
import { decodeSetConfig, encodeSetConfig, OP } from '../protocol/ops.ts'
import { GENESIS_CHAIN, PROGRAM } from '../protocol/program.ts'
import {
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
import {
  accountIdFromRequest,
  batchSealStep,
  checkStep,
  genesisAnchorsStep,
} from './helpers.ts'
import { obj, type Scenario, type Trace, type TraceStep } from './trace.ts'

const FLOAT_VALUE = 0.075
const HONEST_CONFIG_NAME = 'timeout_ms'
const HONEST_CONFIG_VALUE = 60_000n
const HONEST_ACTIVATION_SEQUENCE = 10n

function ieee754Bytes(value: number): Uint8Array {
  const buffer = new ArrayBuffer(8)
  new DataView(buffer).setFloat64(0, value)
  return new Uint8Array(buffer)
}

function ieee754Read(bytes: Uint8Array): number {
  return new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  ).getFloat64(0)
}

function canonicalU64Read(bytes: Uint8Array): bigint {
  return new Reader(bytes).u64()
}

function attemptMalformedSubmit(
  server: Server,
  record: GlobalEventRecordV1,
): string {
  try {
    server.submit(record)
  } catch (err) {
    if (!(err instanceof RuleError)) throw err
    return err.rule
  }
  throw new Error(
    's16: expected the honest server to refuse the malformed payload at submit',
  )
}

function honestRefusalStep(rule: string): TraceStep {
  return {
    actor: 'server',
    kind: 'check',
    label:
      "the honest server refuses governance's malformed SET_CONFIG at submit time; the payload does not decode as the required name+value+activation structure",
    detail: `caught RuleError(${rule}) at submit time, before anything reached the log`,
    check: {
      name: 'set-config payload decode (submit-time)',
      pass: false,
      error: rule,
    },
  }
}

function floatVsU64Step(
  floatPayload: Uint8Array,
  ieeeValue: number,
  u64Value: bigint,
): TraceStep {
  return {
    actor: 'server',
    kind: 'object',
    label:
      'the same 8 bytes, read two ways: as an IEEE-754 double, and as the canonical u64 the struct actually requires — the ambiguity spec 16.1 forbids in canonical state',
    objects: [
      obj('float-payload-bytes', 'ieee754-double', floatPayload, {
        ieee754Value: ieeeValue.toString(),
      }),
      obj('canonical-u64-read', 'canonical-u64', floatPayload, {
        u64Value: u64Value.toString(),
      }),
    ],
  }
}

function honestConfigStep(record: GlobalEventRecordV1): TraceStep {
  const event = decodeAuthorEvent(record.authorEvent)
  const config = decodeSetConfig(event.payload)
  return {
    actor: 'author',
    kind: 'object',
    label: `for contrast, this is what a canonical SET_CONFIG decodes to: governance sets ${config.name} to ${config.value}, activating at global sequence ${config.activationSequence} — the honest record the server seals next`,
    objects: [
      {
        ...obj('honest-author-event', 'author-event', record.authorEvent, {
          authorKeyId: hex(event.authorKeyId),
          authorSequence: event.authorSequence.toString(),
          globalSequence: record.globalSequence.toString(),
        }),
        hash: hex(record.eventHash),
      },
      obj('honest-config-payload', 'set-config-payload', event.payload, {
        name: config.name,
        value: config.value.toString(),
        activationSequence: config.activationSequence.toString(),
      }),
    ],
  }
}

function forcedSealStep(proof: TransparentTransitionProofV1): TraceStep {
  const journal = decodeTransitionJournal(proof.journal)
  return {
    actor: 'server',
    kind: 'object',
    label:
      'the malformed record is forced into an already-sealed transition proof anyway; journal and accesses are untouched, only the record bytes changed',
    objects: [
      {
        ...obj('forced-seal', 'transition-journal', proof.journal, {
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
      'server signs an honest immediate query receipt (the query itself was never tampered)',
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

function run(): Trace {
  const world = buildGenesis()
  const server = new Server(world)

  const floatPayload = ieee754Bytes(FLOAT_VALUE)
  const ieeeValue = ieee754Read(floatPayload)
  const u64Value = canonicalU64Read(floatPayload)

  const honestPayload = encodeSetConfig({
    name: HONEST_CONFIG_NAME,
    value: HONEST_CONFIG_VALUE,
    activationSequence: HONEST_ACTIVATION_SEQUENCE,
  })
  const honestEvent = makeSignedEvent(
    world.governance,
    1n,
    ZERO32,
    OP.SET_CONFIG,
    honestPayload,
  )
  const honestRecord: GlobalEventRecordV1 = {
    globalSequence: 1n,
    eventHash: honestEvent.eventHash,
    authorEvent: honestEvent.eventBytes,
    authorSignature: honestEvent.signature,
  }

  const malformedEvent = makeSignedEvent(
    world.governance,
    1n,
    ZERO32,
    OP.SET_CONFIG,
    floatPayload,
  )
  const malformedRecord: GlobalEventRecordV1 = {
    globalSequence: 1n,
    eventHash: malformedEvent.eventHash,
    authorEvent: malformedEvent.eventBytes,
    authorSignature: malformedEvent.signature,
  }

  const refusalRule = attemptMalformedSubmit(server, malformedRecord)

  server.submit(honestRecord)
  const sealProof = server.sealBatch()
  const forgedProof: TransparentTransitionProofV1 = {
    ...sealProof,
    records: sealProof.records.map((record, index) =>
      index === 0 ? malformedRecord : record,
    ),
  }
  const sealIndex = server.sealedTransitions.length - 1
  server.sealedTransitions[sealIndex] = forgedProof

  const requestBytes = encodeQueryRequest({
    requestType: REQ.GET_BALANCE,
    requestVersion: 1,
    body: encodeGetBalanceBody({ accountId: 'nobody' }),
  })

  const trust = genesisTrust({
    protocolVersion: PROTOCOL_VERSION,
    genesisRoot: GENESIS_ROOT,
    programChainHash: GENESIS_CHAIN,
    updateProgramId: PROGRAM.updateV1,
    queryProgramId: PROGRAM.queryV1,
    keyStateHash: ZERO32,
  })
  const client = new Client(trust, 's16-float-config-client')
  const { nonce } = client.request(requestBytes)

  const { receiptBytes } = server.execute(requestBytes, nonce)
  const bundle = server.proofFor({
    receiptBytes,
    sinceSequence: trust.highestSequence,
  })
  const bundleBytes = encodeBundle(bundle)

  if (bundle.latestHead === null) {
    throw new Error('s16: expected a latest-head statement')
  }
  const head = decodeLatestHead(bundle.latestHead)
  const result = client.acceptBundle(bundleBytes, head.latestAsOfMs)
  if (result.ok) {
    throw new Error('s16: expected REJECT, got ACCEPT')
  }

  const steps: TraceStep[] = [
    genesisAnchorsStep(),
    honestRefusalStep(refusalRule),
    floatVsU64Step(floatPayload, ieeeValue, u64Value),
    honestConfigStep(honestRecord),
    batchSealStep(
      sealProof,
      "the honest server seals governance's real SET_CONFIG (a legitimate timeout_ms change) into a transition proof",
    ),
    forcedSealStep(forgedProof),
    queryRequestStep(requestBytes, nonce),
    receiptStep(receiptBytes),
    ...result.checks.map((check) => checkStep(check)),
  ]

  return {
    steps,
    checks: result.checks,
    verdict: {
      kind: 'REJECT',
      error: result.error,
      note: `governance's SET_CONFIG payload is exactly the 8 raw bytes of the IEEE-754 double ${ieeeValue} (0x${hex(floatPayload)}); read instead as the canonical u64 the SetConfigV1 struct requires, those same bytes are ${u64Value}, an unrelated integer. Spec 16.1 forbids floating point in canonical state and proven computation: the honest server refuses this payload at submit time (RuleError "${refusalRule}"), and forcing the identical record into an already-sealed transition proof fails the client's replay the same way: ${result.error}, rule "${result.rule}"`,
    },
  }
}

export const scenario: Scenario = {
  meta: {
    id: 16,
    slug: 'float-config',
    title: 'Floating-point configuration rejection',
    taxonomy: 'PREVENTED_BY_MATH',
    specRefs: ['6.1', '16.1', '17'],
    expected: 'REJECT INVALID_PROOF (payload)',
  },
  run,
}
