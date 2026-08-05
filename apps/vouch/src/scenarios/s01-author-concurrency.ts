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
import type { Keypair } from '../protocol/keys.ts'
import {
  decodeOpenAccount,
  decodeTransfer,
  encodeOpenAccount,
  encodeTransfer,
  OP,
} from '../protocol/ops.ts'
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
  batchSealStep,
  checkStep,
  genesisAnchorsStep,
} from './helpers.ts'
import { SPEC_ACCEPTANCE_CLAIM } from './s04-honest-query.ts'
import { obj, type Scenario, type Trace, type TraceStep } from './trace.ts'

type AuthorState = { sequence: bigint; tip: Uint8Array }

const GENESIS_AUTHOR_STATE: AuthorState = { sequence: 0n, tip: ZERO32 }

const EVENT_DESCRIBERS: Record<number, (payload: Uint8Array) => string> = {
  [OP.OPEN_ACCOUNT]: (payload) => {
    const open = decodeOpenAccount(payload)
    return `opens account ${open.accountId} with balance ${open.initialBalance}`
  },
  [OP.TRANSFER]: (payload) => {
    const transfer = decodeTransfer(payload)
    return `transfers ${transfer.amount} to ${transfer.to}`
  },
}

function describeEvent(record: GlobalEventRecordV1): string {
  const event = decodeAuthorEvent(record.authorEvent)
  return EVENT_DESCRIBERS[event.operation]?.(event.payload) ?? 'author event'
}

function requireRecord(server: Server): GlobalEventRecordV1 {
  const record = server.log.at(-1)
  if (!record) throw new Error('s01: expected a submitted record')
  return record
}

type AuthorHandle = { keypair: Keypair; state: AuthorState }
type EventSpec = { operation: number; payload: Uint8Array }

function submitAuthorEvent(
  server: Server,
  author: AuthorHandle,
  event: EventSpec,
): { record: GlobalEventRecordV1; next: AuthorState } {
  const signed = makeSignedEvent(
    author.keypair,
    author.state.sequence + 1n,
    author.state.tip,
    event.operation,
    event.payload,
  )
  server.submit({
    eventBytes: signed.eventBytes,
    signature: signed.signature,
    eventHash: signed.eventHash,
  })
  return {
    record: requireRecord(server),
    next: { sequence: author.state.sequence + 1n, tip: signed.eventHash },
  }
}

function authorEventStep(
  authorName: string,
  before: AuthorState,
  record: GlobalEventRecordV1,
): TraceStep {
  const event = decodeAuthorEvent(record.authorEvent)
  return {
    actor: 'author',
    kind: 'object',
    label:
      `${authorName} ${describeEvent(record)} as author-sequence ` +
      `${event.authorSequence} (own chain), landing at global sequence ${record.globalSequence}`,
    detail: `${authorName}'s tip advances ${hex(before.tip)} -> ${hex(record.eventHash)}, independent of the other author`,
    objects: [
      {
        ...obj('author-event', 'author-event', record.authorEvent, {
          authorName,
          authorKeyId: hex(event.authorKeyId),
          authorSequence: event.authorSequence.toString(),
          authorPreviousHash: hex(event.authorPreviousHash),
          globalSequence: record.globalSequence.toString(),
          operation: event.operation.toString(),
        }),
        hash: hex(record.eventHash),
      },
    ],
  }
}

function authorTipsStep(alice: AuthorState, bob: AuthorState): TraceStep {
  return {
    actor: 'server',
    kind: 'object',
    label:
      'both author chains reached author-sequence 2 on their own, despite ' +
      'four interleaved global sequence numbers assigned by the server',
    objects: [
      obj('alice-tip', 'author-tip', alice.tip, {
        authorName: 'alice',
        authorSequence: alice.sequence.toString(),
      }),
      obj('bob-tip', 'author-tip', bob.tip, {
        authorName: 'bob',
        authorSequence: bob.sequence.toString(),
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

function queryResultStep(
  resultBytes: Uint8Array,
  accountId: string,
): TraceStep {
  const balance = decodeBalanceResult(resultBytes)
  return {
    actor: 'server',
    kind: 'object',
    label: `server computes get-balance(${accountId}) = ${balance.balance}, reflecting both authors' transfers`,
    objects: [
      {
        ...obj('query-result', 'balance-result', resultBytes, {
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

function run(): Trace {
  const world = buildGenesis()
  const server = new Server(world)
  const alice = world.authors.alice
  const bob = world.authors.bob

  const a1 = submitAuthorEvent(
    server,
    { keypair: alice, state: GENESIS_AUTHOR_STATE },
    {
      operation: OP.OPEN_ACCOUNT,
      payload: encodeOpenAccount({
        accountId: 'alice',
        initialBalance: 10_000n,
      }),
    },
  )
  const b1 = submitAuthorEvent(
    server,
    { keypair: bob, state: GENESIS_AUTHOR_STATE },
    {
      operation: OP.OPEN_ACCOUNT,
      payload: encodeOpenAccount({ accountId: 'bob', initialBalance: 0n }),
    },
  )
  const a2 = submitAuthorEvent(
    server,
    { keypair: alice, state: a1.next },
    {
      operation: OP.TRANSFER,
      payload: encodeTransfer({ from: 'alice', to: 'bob', amount: 1000n }),
    },
  )
  const b2 = submitAuthorEvent(
    server,
    { keypair: bob, state: b1.next },
    {
      operation: OP.TRANSFER,
      payload: encodeTransfer({ from: 'bob', to: 'alice', amount: 100n }),
    },
  )

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
  const client = new Client(trust, 's01-author-concurrency-client')
  const { nonce } = client.request(requestBytes)

  const { resultBytes, receiptBytes } = server.execute(requestBytes, nonce)
  const bundle = server.proofFor({
    receiptBytes,
    sinceSequence: trust.highestSequence,
  })
  const bundleBytes = encodeBundle(bundle)

  if (bundle.latestHead === null) {
    throw new Error('s01: expected a latest-head statement')
  }
  const head = decodeLatestHead(bundle.latestHead)
  const result = client.acceptBundle(bundleBytes, head.latestAsOfMs)
  if (!result.ok) {
    throw new Error(`s01: expected ACCEPT, got ${result.error}`)
  }

  const steps: TraceStep[] = [
    genesisAnchorsStep(),
    authorEventStep('alice', GENESIS_AUTHOR_STATE, a1.record),
    authorEventStep('bob', GENESIS_AUTHOR_STATE, b1.record),
    authorEventStep('alice', a1.next, a2.record),
    authorEventStep('bob', b1.next, b2.record),
    authorTipsStep(a2.next, b2.next),
    batchSealStep(
      sealProof,
      'server seals the interleaved batch into a transition proof',
    ),
    queryRequestStep(requestBytes, nonce),
    queryResultStep(resultBytes, 'bob'),
    receiptStep(receiptBytes),
    ...result.checks.map((check) => checkStep(check)),
  ]

  return {
    steps,
    checks: result.checks,
    verdict: { kind: 'ACCEPT', note: SPEC_ACCEPTANCE_CLAIM },
  }
}

export const scenario: Scenario = {
  meta: {
    id: 1,
    slug: 'author-concurrency',
    title: 'Independent author concurrency',
    taxonomy: 'PREVENTED_BY_MATH',
    specRefs: ['1', '10', '11', '17'],
    expected: 'ACCEPT',
  },
  run,
}
