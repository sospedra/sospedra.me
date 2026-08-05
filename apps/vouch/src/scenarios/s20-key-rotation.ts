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
import { keypairFromLabel } from '../protocol/keys.ts'
import {
  decodeSetReceiptKey,
  encodeOpenAccount,
  encodeSetReceiptKey,
  OP,
} from '../protocol/ops.ts'
import { GENESIS_CHAIN, PROGRAM } from '../protocol/program.ts'
import {
  encodeGetBalanceBody,
  encodeQueryRequest,
  REQ,
  requestHash,
} from '../protocol/query.ts'
import { decodeQueryReceipt, receiptSigningInput } from '../protocol/receipt.ts'
import { decodeReceiptKeyV1 } from '../protocol/state.ts'
import { genesisTrust } from '../protocol/trust.ts'
import { type AccessV1, encodeAccess } from '../protocol/view.ts'
import {
  accountIdFromRequest,
  balanceOpenedAuthorEventStep,
  batchSealStep,
  checkStep,
  genesisAnchorsStep,
} from './helpers.ts'
import { obj, type Scenario, type Trace, type TraceStep } from './trace.ts'

export const SPEC_KEY_LIFECYCLE_CLAIM =
  'Key additions, rotations, revocations, and delayed recovery MUST be ' +
  'canonical events.'

function receiptKeyChangeStep(
  name: string,
  record: GlobalEventRecordV1,
  label: string,
): TraceStep {
  const event = decodeAuthorEvent(record.authorEvent)
  const change = decodeSetReceiptKey(event.payload)
  return {
    actor: 'author',
    kind: 'object',
    label,
    objects: [
      {
        ...obj(name, 'receipt-key-change', record.authorEvent, {
          governanceKeyId: hex(event.authorKeyId),
          globalSequence: record.globalSequence.toString(),
          keyId: hex(change.keyId),
          status: change.status.toString(),
        }),
        hash: hex(record.eventHash),
      },
    ],
  }
}

function receiptKeyWitnessStep(
  name: string,
  label: string,
  witness: AccessV1,
): TraceStep {
  const decoded =
    witness.value === null ? null : decodeReceiptKeyV1(witness.value)
  return {
    actor: 'server',
    kind: 'object',
    label,
    objects: [
      obj(name, 'receipt-key-witness', encodeAccess(witness), {
        status: decoded === null ? 'absent' : decoded.status.toString(),
        sinceSequence:
          decoded === null ? 'n/a' : decoded.sinceSequence.toString(),
      }),
    ],
  }
}

function queryRequestStep(
  requestBytes: Uint8Array,
  nonce: Uint8Array,
  attempt: string,
): TraceStep {
  const accountId = accountIdFromRequest(requestBytes)
  return {
    actor: 'client',
    kind: 'act',
    label: `${attempt}: client requests get-balance(${accountId}) with a fresh nonce`,
    detail: `nonce ${hex(nonce)}`,
    objects: [
      {
        ...obj(`query-request-${attempt}`, 'query-request', requestBytes, {
          requestType: String(REQ.GET_BALANCE),
          accountId,
        }),
        hash: hex(requestHash(requestBytes)),
      },
    ],
  }
}

function receiptStep(receiptBytes: Uint8Array, attempt: string): TraceStep {
  const receipt = decodeQueryReceipt(receiptBytes)
  return {
    actor: 'server',
    kind: 'object',
    label: `${attempt}: server signs an immediate query receipt with receiptKeyId ${hex(receipt.receiptKeyId)}`,
    objects: [
      {
        ...obj(`receipt-${attempt}`, 'query-receipt', receiptBytes, {
          receiptKeyId: hex(receipt.receiptKeyId),
          stateRoot: hex(receipt.stateRoot),
          stateSequence: receipt.stateSequence.toString(),
          resultHash: hex(receipt.resultHash),
          nonce: hex(receipt.nonce),
        }),
        hash: hex(receiptSigningInput(receiptBytes)),
      },
    ],
  }
}

function run(): Trace {
  const world = buildGenesis()
  const server = new Server(world)
  const key1 = world.receiptKey
  const key2 = keypairFromLabel('receipt-2')

  const [aliceOpenRecord, activateKey2Record, revokeKey1Record] = seqRecords(
    world,
    [
      [
        'alice',
        OP.OPEN_ACCOUNT,
        encodeOpenAccount({ accountId: 'alice', initialBalance: 5_000n }),
      ],
      [
        'governance',
        OP.SET_RECEIPT_KEY,
        encodeSetReceiptKey({ keyId: key2.publicKey, status: 1 }),
      ],
      [
        'governance',
        OP.SET_RECEIPT_KEY,
        encodeSetReceiptKey({ keyId: key1.publicKey, status: 0 }),
      ],
    ],
  )
  for (const record of [
    aliceOpenRecord,
    activateKey2Record,
    revokeKey1Record,
  ]) {
    server.submit(record)
  }
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
  const client = new Client(trust, 's20-key-rotation-client')

  const { nonce: nonce1 } = client.request(requestBytes)
  const { receiptBytes: receiptBytes1 } = server.execute(requestBytes, nonce1)
  const bundle1 = server.proofFor({
    receiptBytes: receiptBytes1,
    sinceSequence: client.trust.highestSequence,
  })
  if (bundle1.latestHead === null) {
    throw new Error('s20: expected a latest-head statement')
  }
  const head1 = decodeLatestHead(bundle1.latestHead)
  const result1 = client.acceptBundle(encodeBundle(bundle1), head1.latestAsOfMs)
  if (result1.ok) {
    throw new Error('s20: expected the key1 attempt to REJECT')
  }

  world.receiptKey = key2

  const { nonce: nonce2 } = client.request(requestBytes)
  const { receiptBytes: receiptBytes2 } = server.execute(requestBytes, nonce2)
  const bundle2 = server.proofFor({
    receiptBytes: receiptBytes2,
    sinceSequence: client.trust.highestSequence,
  })
  if (bundle2.latestHead === null) {
    throw new Error('s20: expected a latest-head statement')
  }
  const head2 = decodeLatestHead(bundle2.latestHead)
  const result2 = client.acceptBundle(encodeBundle(bundle2), head2.latestAsOfMs)
  if (!result2.ok) {
    throw new Error(
      `s20: expected the key2 attempt to ACCEPT, got ${result2.error}`,
    )
  }

  const steps: TraceStep[] = [
    genesisAnchorsStep(),
    balanceOpenedAuthorEventStep(aliceOpenRecord),
    receiptKeyChangeStep(
      'activate-key2',
      activateKey2Record,
      'governance commits a canonical event activating key2 as an authorized receipt-signing key',
    ),
    receiptKeyChangeStep(
      'revoke-key1',
      revokeKey1Record,
      "governance commits a canonical event revoking key1's receipt-signing authorization, in the SAME sealed batch",
    ),
    batchSealStep(
      sealProof,
      "the honest server seals alice's opening balance and both governance events into one transition proof",
    ),
    queryRequestStep(requestBytes, nonce1, 'attempt-1 (key1)'),
    receiptStep(receiptBytes1, 'attempt-1 (key1)'),
    receiptKeyWitnessStep(
      'witness-key1',
      "attempt-1: the bundle's receipt-key witness for key1, read from the post-rotation state",
      bundle1.receiptKeyWitness,
    ),
    ...result1.checks.map((check) => checkStep(check, 'attempt-1 (key1)')),
    queryRequestStep(requestBytes, nonce2, 'attempt-2 (key2)'),
    receiptStep(receiptBytes2, 'attempt-2 (key2)'),
    receiptKeyWitnessStep(
      'witness-key2',
      "attempt-2: the bundle's receipt-key witness for key2, read from the SAME post-rotation state",
      bundle2.receiptKeyWitness,
    ),
    ...result2.checks.map((check) => checkStep(check, 'attempt-2 (key2)')),
  ]

  return {
    steps,
    checks: [...result1.checks, ...result2.checks],
    verdict: {
      kind: 'REJECT',
      error: result1.error,
      note: `governance commits a canonical event activating key2 and revoking key1, in the same sealed batch; a receipt signed by key1 after that point carries a witness whose status is 0, so rule "${result1.rule}" rejects it with "${result1.error}" at check 4, even though the signature itself is cryptographically perfect; a receipt signed by key2 over the identical state carries a witness whose status is 1 and whose sinceSequence does not exceed the receipt's own stateSequence, so it fully ACCEPTS. ${SPEC_KEY_LIFECYCLE_CLAIM}`,
    },
  }
}

export const scenario: Scenario = {
  meta: {
    id: 20,
    slug: 'key-rotation',
    title: 'Receipt/head key rotation',
    taxonomy: 'POSSIBLE_UNDER_GOVERNANCE',
    specRefs: ['6.3', '13.1', '16.3', '17'],
    expected: 'REJECT UNAUTHORIZED_KEY then ACCEPT',
  },
  run,
}
